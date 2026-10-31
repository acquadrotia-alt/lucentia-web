// ============================================================================
// Portale: richieste dal sito (preventivo / informazioni), attivazione della
// demo pubblica e la loro consultazione da parte dell'amministratore.
// ============================================================================
import { json, isAdmin, addDaysISO, hashPassword, licStatus, MODULI } from "../core/util.js";
import { demoSeed } from "../core/demo.js";

// ---- /api/richiesta (pubblica: richiesta di contatto / preventivo dal sito) ----
export async function richiesta(ctx) {
  const { request, env } = ctx;
  const b = await request.json().catch(() => ({}));
  const email = String(b.email || "").trim().toLowerCase();
  const rs = String(b.ragione_sociale || "").trim();
  if (!rs || !email) return json({ error: "Ragione sociale ed email sono richieste" }, 400);
  await env.DB.prepare("INSERT INTO richieste (id, tipo, ragione_sociale, piva, email, telefono, messaggio, piano, azienda_id, stato) VALUES (?, 'licenza', ?, ?, ?, ?, ?, ?, NULL, 'nuova')").bind(crypto.randomUUID(), rs, String(b.piva || "").trim(), email, String(b.telefono || "").trim(), String(b.messaggio || "").trim(), String(b.piano || "").trim()).run();
  return json({ ok: true });
}

// ---- /api/demo (pubblica: attiva una prova demo di 10 giorni) ----
export async function demo(ctx) {
  const { request, env } = ctx;
  const b = await request.json().catch(() => ({}));
  const email = String(b.email || "").trim().toLowerCase();
  const rs = String(b.ragione_sociale || "").trim();
  const tel = String(b.telefono || "").trim();
  const piva = String(b.piva || "").trim();
  if (!rs || !email || !tel) return json({ error: "Ragione sociale, email e telefono sono richiesti" }, 400);
  const dup = await env.DB.prepare("SELECT id FROM utenti WHERE email = ?").bind(email).first();
  if (dup) return json({ error: "Questa email è già registrata: usala per accedere oppure contattaci." }, 409);
  const aid = crypto.randomUUID(); const uidv = crypto.randomUUID();
  const ph = await hashPassword("demo");
  const scad = addDaysISO(10);
  const moduli = JSON.stringify(MODULI.slice());
  await env.DB.prepare("INSERT INTO aziende (id, denominazione, licenza_scadenza, attiva, note, moduli, demo) VALUES (?, ?, ?, 1, 'DEMO', ?, 1)").bind(aid, rs, scad, moduli).run();
  await env.DB.prepare("INSERT INTO utenti (id, email, password_hash, ruolo, azienda_id, nome) VALUES (?, ?, ?, 'azienda', ?, ?)").bind(uidv, email, ph, aid, rs).run();
  const seed = demoSeed();
  const seedRows = [["config", seed.config], ["catalog", seed.catalog], ["clients", seed.clients], ["bookings", seed.bookings], ["vouchers", seed.vouchers], ["sales", seed.sales]];
  for (const [coll, data] of seedRows) {
    await env.DB.prepare("INSERT INTO dati_app (id, azienda_id, collezione, dati) VALUES (?, ?, ?, ?)").bind(aid + ":" + coll, aid, coll, JSON.stringify(data)).run();
  }
  await env.DB.prepare("INSERT INTO richieste (id, tipo, ragione_sociale, piva, email, telefono, messaggio, azienda_id, stato) VALUES (?, 'demo', ?, ?, ?, ?, '', ?, 'attiva')").bind(crypto.randomUUID(), rs, piva, email, tel, aid).run();
  return json({ ok: true, email });
}

// ---- /api/richieste  (amministratore: richieste dal sito + demo attivate) ----
export async function richieste(ctx, segs, sess) {
  const { request, env } = ctx;
  const method = request.method;
  if (!isAdmin(sess)) return json({ error: "riservato all'amministratore" }, 403);
  if (!segs[1]) {
    if (method === "GET") {
      const res = await env.DB.prepare("SELECT r.*, a.licenza_scadenza AS scadenza, a.attiva AS az_attiva, a.demo AS az_demo FROM richieste r LEFT JOIN aziende a ON a.id = r.azienda_id ORDER BY r.creato_il DESC").all();
      const items = (res.results || []).map((r) => ({ ...r, stato_licenza: r.azienda_id ? licStatus({ attiva: r.az_attiva, licenza_scadenza: r.scadenza }) : null }));
      return json({ items });
    }
    return json({ error: "metodo non consentito" }, 405);
  }
  const id = segs[1];
  if (method === "PATCH") { const b = await request.json().catch(() => ({})); await env.DB.prepare("UPDATE richieste SET stato = ? WHERE id = ?").bind(String(b.stato || "gestita"), id).run(); return json({ ok: true }); }
  if (method === "DELETE") { await env.DB.prepare("DELETE FROM richieste WHERE id = ?").bind(id).run(); return json({ ok: true }); }
  return json({ error: "metodo non consentito" }, 405);
}
