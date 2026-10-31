// ============================================================================
// Portale: i saloni ospitati sul portale stesso (/api/aziende). Oggi servono
// per le prove interne: i clienti veri hanno la loro installazione dedicata
// (vedi installazioni.js). Solo l'amministratore.
// ============================================================================
import { json, isAdmin, addMonthsISO, hashPassword, cleanModuli, parseModuli, licStatus, COLLEZIONI } from "../core/util.js";
import { getAzienda } from "../core/sessione.js";
import { saloneVuoto } from "../core/demo.js";

export async function aziende(ctx, segs, sess) {
  const { request, env } = ctx;
  const method = request.method;
  if (!isAdmin(sess)) return json({ error: "riservato all'amministratore" }, 403);

  if (!segs[1]) {
    if (method === "GET") {
      const res = await env.DB.prepare("SELECT a.id, a.denominazione, a.licenza_scadenza, a.attiva, a.note, a.moduli, a.demo, a.creata_il, (SELECT email FROM utenti u WHERE u.azienda_id = a.id AND u.ruolo = 'azienda' ORDER BY u.creato_il LIMIT 1) AS email FROM aziende a ORDER BY a.creata_il DESC").all();
      const items = (res.results || []).map((a) => ({ ...a, attiva: !!a.attiva, demo: !!a.demo, stato: licStatus(a), moduli: parseModuli(a.moduli) }));
      return json({ items });
    }
    if (method === "POST") {
      const body = await request.json().catch(() => ({}));
      const denominazione = String(body.denominazione || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!denominazione || !email || password.length < 6) return json({ error: "denominazione, email e password (min 6) richieste" }, 400);
      const dup = await env.DB.prepare("SELECT id FROM utenti WHERE email = ?").bind(email).first();
      if (dup) return json({ error: "email già in uso" }, 409);
      const mesi = Number(body.mesi || 0);
      const scadenza = mesi > 0 ? addMonthsISO(mesi) : null;
      const aid = crypto.randomUUID();
      const uidv = crypto.randomUUID();
      const ph = await hashPassword(password);
      await env.DB.prepare("INSERT INTO aziende (id, denominazione, licenza_scadenza, attiva, note, moduli) VALUES (?, ?, ?, 1, ?, ?)").bind(aid, denominazione, scadenza, String(body.note || ""), cleanModuli(body.moduli)).run();
      await env.DB.prepare("INSERT INTO utenti (id, email, password_hash, ruolo, azienda_id, nome) VALUES (?, ?, ?, 'azienda', ?, ?)").bind(uidv, email, ph, aid, denominazione).run();
      return json({ ok: true, id: aid });
    }
    return json({ error: "metodo non consentito" }, 405);
  }

  // /api/aziende/:id
  const aid = segs[1];

  // /api/aziende/:id/svuota — riporta il salone a una licenza vuota: niente
  // servizi, operatori, clienti, appuntamenti, catalogo, vendite, buoni ed
  // eventi. Licenza e account del salone restano.
  if (segs[2] === "svuota") {
    if (method !== "POST") return json({ error: "metodo non consentito" }, 405);
    const azs = await getAzienda(env, aid);
    if (!azs) return json({ error: "azienda non trovata" }, 404);
    await svuotaSalone(env, aid, azs.denominazione);
    return json({ ok: true });
  }

  if (method === "PATCH") {
    const body = await request.json().catch(() => ({}));
    const az = await getAzienda(env, aid);
    if (!az) return json({ error: "azienda non trovata" }, 404);
    if (body.denominazione != null) await env.DB.prepare("UPDATE aziende SET denominazione = ? WHERE id = ?").bind(String(body.denominazione), aid).run();
    if (body.note != null) await env.DB.prepare("UPDATE aziende SET note = ? WHERE id = ?").bind(String(body.note), aid).run();
    if (body.attiva != null) await env.DB.prepare("UPDATE aziende SET attiva = ? WHERE id = ?").bind(body.attiva ? 1 : 0, aid).run();
    if (body.rinnovaMesi != null) { const m = Number(body.rinnovaMesi); const scad = m > 0 ? addMonthsISO(m) : null; await env.DB.prepare("UPDATE aziende SET licenza_scadenza = ? WHERE id = ?").bind(scad, aid).run(); }
    if (body.scadenza !== undefined) await env.DB.prepare("UPDATE aziende SET licenza_scadenza = ? WHERE id = ?").bind(body.scadenza || null, aid).run();
    if (body.moduli != null) await env.DB.prepare("UPDATE aziende SET moduli = ? WHERE id = ?").bind(cleanModuli(body.moduli), aid).run();
    if (body.nuovaPassword) {
      if (String(body.nuovaPassword).length < 6) return json({ error: "password troppo corta" }, 400);
      const ph = await hashPassword(String(body.nuovaPassword));
      await env.DB.prepare("UPDATE utenti SET password_hash = ? WHERE azienda_id = ? AND ruolo = 'azienda'").bind(ph, aid).run();
    }
    return json({ ok: true });
  }
  if (method === "DELETE") {
    await eliminaSalone(env, aid);
    return json({ ok: true });
  }
  return json({ error: "metodo non consentito" }, 405);
}

// Sovrascrive le sette collezioni con i blob vuoti (non li cancella: con le
// righe assenti il gestionale ricaricherebbe i dati di esempio), elimina
// prenotazioni online e accessi operatore, chiude le sessioni aperte.
export async function svuotaSalone(env, aid, denominazione) {
  const vuoto = saloneVuoto(denominazione);
  for (const coll of COLLEZIONI) {
    await env.DB.prepare(
      "INSERT INTO dati_app (id, azienda_id, collezione, dati, aggiornato_il) VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET dati = excluded.dati, aggiornato_il = datetime('now')"
    ).bind(`${aid}:${coll}`, aid, coll, JSON.stringify(vuoto[coll])).run();
  }
  await env.DB.prepare("DELETE FROM prenotazioni_online WHERE azienda_id = ?").bind(aid).run();
  await env.DB.prepare("DELETE FROM utenti WHERE azienda_id = ? AND ruolo = 'operatore'").bind(aid).run();
  // Chiude le sessioni aperte del salone: una scheda rimasta aperta
  // risalverebbe i dati che aveva in memoria, annullando l'azzeramento.
  await env.DB.prepare("DELETE FROM sessioni WHERE utente_id IN (SELECT id FROM utenti WHERE azienda_id = ?)").bind(aid).run();
}

export async function eliminaSalone(env, aid) {
  await env.DB.prepare("DELETE FROM sessioni WHERE utente_id IN (SELECT id FROM utenti WHERE azienda_id = ?)").bind(aid).run();
  await env.DB.prepare("DELETE FROM utenti WHERE azienda_id = ?").bind(aid).run();
  await env.DB.prepare("DELETE FROM dati_app WHERE azienda_id = ?").bind(aid).run();
  await env.DB.prepare("DELETE FROM prenotazioni_online WHERE azienda_id = ?").bind(aid).run();
  await env.DB.prepare("DELETE FROM aziende WHERE id = ?").bind(aid).run();
}
