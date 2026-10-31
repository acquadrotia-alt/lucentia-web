// ============================================================================
// Portale: le INSTALLAZIONI, cioè i clienti veri. Ogni cliente ha il suo
// sito+gestionale su Cloudflare col proprio dominio e database; qui vivono
// la licenza annuale, i moduli attivi e la chiave con cui quell'installazione
// si presenta a Lucentia.
//
// - /api/installazioni (amministratore): crea, rinnova, sospende, cambia i
//   moduli, rigenera la chiave, elimina.
// - /api/licenze/verifica (pubblica, autenticata con id + chiave): la chiama
//   l'installazione cliente per sapere se è in regola e quali moduli ha.
//   Nella stessa chiamata dichiara versione, dominio e i moduli su misura che
//   il suo codice supporta, così il portale sa quali interruttori mostrare.
// ============================================================================
import { json, isAdmin, addMonthsISO, licStatus, randomToken, sha256Hex, cleanModuliInstallazione, parseModuli, MODULI, pad2 } from "../core/util.js";

function parseDichiarati(raw) {
  try { const a = JSON.parse(raw || "[]"); return Array.isArray(a) ? a.filter((m) => m && typeof m.key === "string") : []; } catch (e) { return []; }
}
function pubblica(r) {
  const dichiarati = parseDichiarati(r.moduli_disponibili);
  return {
    id: r.id, nome: r.nome, dominio: r.dominio || "", note: r.note || "",
    licenza_scadenza: r.licenza_scadenza, attiva: !!r.attiva, stato: licStatus(r),
    moduli: parseModuli(r.moduli, dichiarati.map((m) => m.key)),
    moduli_disponibili: dichiarati,
    versione: r.versione || null, dominio_rilevato: r.dominio_rilevato || null, ultimo_contatto: r.ultimo_contatto || null,
    creata_il: r.creata_il, ha_chiave: !!r.chiave_hash,
  };
}
async function nuovaChiave() {
  const chiave = randomToken(32); // 64 caratteri esadecimali
  return { chiave, hash: await sha256Hex(chiave) };
}
function pulisciDominio(v) { return String(v || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""); }

// ---- /api/installazioni (amministratore) ----
export async function installazioni(ctx, segs, sess) {
  const { request, env } = ctx;
  const method = request.method;
  if (!isAdmin(sess)) return json({ error: "riservato all'amministratore" }, 403);

  if (!segs[1]) {
    if (method === "GET") {
      const res = await env.DB.prepare("SELECT * FROM installazioni ORDER BY creata_il DESC").all();
      return json({ items: (res.results || []).map(pubblica) });
    }
    if (method === "POST") {
      const b = await request.json().catch(() => ({}));
      const nome = String(b.nome || "").trim();
      if (!nome) return json({ error: "Il nome del cliente è richiesto" }, 400);
      const mesi = Number(b.mesi || 0);
      const scadenza = mesi > 0 ? addMonthsISO(mesi) : null;
      const id = crypto.randomUUID();
      const { chiave, hash } = await nuovaChiave();
      await env.DB.prepare("INSERT INTO installazioni (id, nome, dominio, chiave_hash, licenza_scadenza, attiva, moduli, moduli_disponibili, note) VALUES (?, ?, ?, ?, ?, 1, ?, '[]', ?)")
        .bind(id, nome, pulisciDominio(b.dominio), hash, scadenza, cleanModuliInstallazione(b.moduli, []), String(b.note || "")).run();
      // La chiave si vede una volta sola: qui. Nel database resta solo l'impronta.
      return json({ ok: true, id, chiave });
    }
    return json({ error: "metodo non consentito" }, 405);
  }

  const iid = segs[1];
  const riga = await env.DB.prepare("SELECT * FROM installazioni WHERE id = ?").bind(iid).first();
  if (!riga) return json({ error: "installazione non trovata" }, 404);

  if (method === "PATCH") {
    const b = await request.json().catch(() => ({}));
    let chiave = null;
    if (b.nome != null) await env.DB.prepare("UPDATE installazioni SET nome = ? WHERE id = ?").bind(String(b.nome).trim() || riga.nome, iid).run();
    if (b.dominio != null) await env.DB.prepare("UPDATE installazioni SET dominio = ? WHERE id = ?").bind(pulisciDominio(b.dominio), iid).run();
    if (b.note != null) await env.DB.prepare("UPDATE installazioni SET note = ? WHERE id = ?").bind(String(b.note), iid).run();
    if (b.attiva != null) await env.DB.prepare("UPDATE installazioni SET attiva = ? WHERE id = ?").bind(b.attiva ? 1 : 0, iid).run();
    if (b.rinnovaMesi != null) { const m = Number(b.rinnovaMesi); await env.DB.prepare("UPDATE installazioni SET licenza_scadenza = ? WHERE id = ?").bind(m > 0 ? addMonthsISO(m) : null, iid).run(); }
    if (b.scadenza !== undefined) await env.DB.prepare("UPDATE installazioni SET licenza_scadenza = ? WHERE id = ?").bind(b.scadenza || null, iid).run();
    if (b.moduli != null) await env.DB.prepare("UPDATE installazioni SET moduli = ? WHERE id = ?").bind(cleanModuliInstallazione(b.moduli, parseDichiarati(riga.moduli_disponibili)), iid).run();
    if (b.rigeneraChiave) { const n = await nuovaChiave(); chiave = n.chiave; await env.DB.prepare("UPDATE installazioni SET chiave_hash = ? WHERE id = ?").bind(n.hash, iid).run(); }
    return json({ ok: true, ...(chiave ? { chiave } : {}) });
  }
  if (method === "DELETE") {
    await env.DB.prepare("DELETE FROM installazioni WHERE id = ?").bind(iid).run();
    return json({ ok: true });
  }
  return json({ error: "metodo non consentito" }, 405);
}

// ---- /api/licenze/verifica (pubblica: la chiama l'installazione cliente) ----
export async function verificaLicenza(ctx) {
  const { request, env } = ctx;
  if (request.method !== "POST") return json({ error: "metodo non consentito" }, 405);
  const b = await request.json().catch(() => ({}));
  const id = String(b.id || "").trim();
  const chiave = String(b.chiave || "").trim();
  if (!id || !chiave) return json({ error: "id e chiave richiesti" }, 400);
  const riga = await env.DB.prepare("SELECT * FROM installazioni WHERE id = ?").bind(id).first();
  if (!riga) return json({ error: "installazione sconosciuta" }, 404);
  if (!riga.chiave_hash || (await sha256Hex(chiave)) !== riga.chiave_hash) return json({ error: "chiave non valida" }, 401);

  // Cosa ci racconta l'installazione di sé: versione in esecuzione, dominio
  // da cui chiama e i moduli su misura che il suo codice sa gestire.
  const dichiarati = Array.isArray(b.moduli_disponibili)
    ? b.moduli_disponibili.filter((m) => m && typeof m.key === "string" && /^[a-z0-9_-]{2,40}$/i.test(m.key) && !MODULI.includes(m.key))
        .slice(0, 50).map((m) => ({ key: m.key, label: String(m.label || m.key).slice(0, 80), desc: String(m.desc || "").slice(0, 300) }))
    : parseDichiarati(riga.moduli_disponibili);
  const d = new Date();
  const adesso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  await env.DB.prepare("UPDATE installazioni SET versione = ?, dominio_rilevato = ?, moduli_disponibili = ?, ultimo_contatto = ? WHERE id = ?")
    .bind(String(b.versione || "").slice(0, 40) || null, pulisciDominio(b.dominio) || null, JSON.stringify(dichiarati), adesso, id).run();

  const stato = licStatus(riga);
  return json({
    ok: true, stato, attiva: !!riga.attiva, licenza_scadenza: riga.licenza_scadenza || null,
    moduli: parseModuli(riga.moduli, dichiarati.map((m) => m.key)),
    nome: riga.nome, verificata_il: new Date().toISOString(),
  });
}
