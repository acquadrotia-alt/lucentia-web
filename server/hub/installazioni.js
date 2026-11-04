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
import { json, isAdmin, addMonthsISO, licStatus, randomToken, sha256Hex, cleanModuliInstallazione, parseModuli, MODULI, pad2, APP_VERSION } from "../core/util.js";
import { leggiInt } from "../core/integrazioni.js";

const SISTEMA = "_sistema";
// Il repository GitHub dove sta il ceppo (per far partire l'aggiornamento dei clienti).
const REPO_CEPPO = (env) => String((env && env.AGGIORNA_REPO) || "acquadrotia-alt/lucentia-web");

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
    repo: r.repo || "",
    creata_il: r.creata_il, ha_chiave: !!r.chiave_hash,
  };
}
// La salute di un'installazione, per gli avvisi del pannello: silenzio, licenza,
// giro delle email fallito, versione indietro rispetto al portale.
export function avvisiDi(a, giro, oraMs) {
  const out = [];
  const adesso = oraMs || Date.now();
  if (a.attiva) {
    if (!a.ultimo_contatto) out.push({ tipo: "contatto", testo: "non si è mai collegata al portale" });
    else { const ore = (adesso - new Date(String(a.ultimo_contatto).replace(" ", "T")).getTime()) / 3600000; if (ore > 36) out.push({ tipo: "contatto", testo: `nessun contatto da ${Math.round(ore / 24)} giorn${Math.round(ore / 24) === 1 ? "o" : "i"}` }); }
  }
  if (a.stato === "expired") out.push({ tipo: "licenza", testo: "licenza scaduta: il sito è in manutenzione" });
  else if (a.stato === "active" && a.licenza_scadenza) { const gg = Math.ceil((new Date(a.licenza_scadenza + "T23:59:59").getTime() - adesso) / 86400000); if (gg <= 30) out.push({ tipo: "licenza", testo: `la licenza scade tra ${gg} giorn${gg === 1 ? "o" : "i"}` }); }
  if (giro && giro.il && !giro.ok && a.attiva) out.push({ tipo: "giro", testo: `l'ultimo giro delle email non è riuscito${giro.errore ? ` (${String(giro.errore).slice(0, 80)})` : giro.http ? ` (HTTP ${giro.http})` : ""}` });
  if (giro && giro.ok && Array.isArray(giro.saloni) && giro.saloni.some((sx) => sx.errori > 0)) out.push({ tipo: "giro", testo: `email automatiche con errori nell'ultimo giro` });
  if (a.versione && APP_VERSION && a.versione !== APP_VERSION && a.versione !== "dev" && APP_VERSION !== "dev") out.push({ tipo: "versione", testo: `versione ${a.versione}, il portale è alla ${APP_VERSION}: da aggiornare` });
  return out;
}
// Fa partire su GitHub il workflow che aggiorna i repository dei clienti (merge del ceppo, test, push).
async function avviaAggiornamento(env, repo) {
  const token = env && env.AGGIORNA_TOKEN;
  if (!token) return { ok: false, errore: "Manca la variabile AGGIORNA_TOKEN sul portale (un token GitHub con permesso sui repository): vedi LEGGIMI.md." };
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO_CEPPO(env)}/actions/workflows/aggiorna-clienti.yml/dispatches`, { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "lucentia-hub", "Content-Type": "application/json" }, body: JSON.stringify({ ref: "main", inputs: { repo: repo || "" } }) });
    if (r.status === 204) return { ok: true, pagina: `https://github.com/${REPO_CEPPO(env)}/actions/workflows/aggiorna-clienti.yml` };
    const t = await r.text().catch(() => "");
    return { ok: false, errore: `GitHub ha risposto ${r.status}${t ? ": " + t.slice(0, 200) : ""}` };
  } catch (e) { return { ok: false, errore: "GitHub non raggiungibile: " + String((e && e.message) || e) }; }
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
      const items = [];
      for (const r of res.results || []) { const a = pubblica(r); const giro = await leggiInt(env, SISTEMA, "giro:" + r.id); items.push({ ...a, giro, avvisi: avvisiDi(a, giro) }); }
      const ultimoGiro = await leggiInt(env, SISTEMA, "giro:ultimo");
      return json({ items, ultimoGiro, versionePortale: APP_VERSION, aggiornamento: { configurato: !!env.AGGIORNA_TOKEN, repo: REPO_CEPPO(env) } });
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

  // POST /api/installazioni/aggiorna {repo?}: aggiorna tutte le installazioni (o una) dal ceppo, via GitHub
  if (segs[1] === "aggiorna" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const r = await avviaAggiornamento(env, String(b.repo || "").trim());
    return json(r, r.ok ? 200 : 503);
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
    if (b.repo != null) { try { await env.DB.prepare("UPDATE installazioni SET repo = ? WHERE id = ?").bind(String(b.repo).trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, ""), iid).run(); } catch (e) { return json({ error: "Colonna `repo` assente: esegui migrazione-installazioni-repo.sql sul database del portale." }, 500); } }
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
