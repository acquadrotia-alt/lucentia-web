// ============================================================================
// Rotte del salone autenticato: chi sono (/me), prenotazioni online ricevute,
// accessi operatore e le sette collezioni di dati (dati_app).
// ============================================================================
import { json, todayISO, parseModuli, maxOperatoriOf, hashPassword, verifyPassword, COLLEZIONI, isAdmin } from "./util.js";
import { getAzienda } from "./sessione.js";

// ---- /api/online-bookings  (il salone vede le prenotazioni online ricevute) ----
export async function onlineBookings(ctx, segs, sess) {
  const { request, env } = ctx;
  const method = request.method;
  if ((sess.ruolo !== "azienda" && sess.ruolo !== "operatore") || !sess.azienda_id) return json({ error: "riservato al salone" }, 403);
  const azid = sess.azienda_id;
  if (!segs[1]) {
    if (method === "GET") {
      const from = todayISO();
      const res = await env.DB.prepare("SELECT * FROM prenotazioni_online WHERE azienda_id = ? AND data >= ? AND stato = 'attiva' ORDER BY data, start_min").bind(azid, from).all();
      let items = (res.results || []).map((r) => ({ id: r.id, date: r.data, startMin: r.start_min, endMin: r.end_min, serviceId: r.service_id, staffId: r.staff_id, clientCode: r.client_code, clientName: r.client_name, clientPhone: r.client_phone, clientEmail: r.client_email, note: r.note, online: true, createdAt: r.creato_il }));
      if (sess.ruolo === "operatore") items = items.filter((b) => b.staffId === sess.staff_id);
      return json({ items });
    }
    return json({ error: "metodo non consentito" }, 405);
  }
  // /api/online-bookings/:id  (annulla)
  const id = segs[1];
  if (method === "DELETE") {
    if (sess.ruolo !== "azienda") return json({ error: "sola lettura" }, 403);
    await env.DB.prepare("UPDATE prenotazioni_online SET stato = 'annullata' WHERE id = ? AND azienda_id = ?").bind(id, azid).run();
    return json({ ok: true });
  }
  return json({ error: "metodo non consentito" }, 405);
}

// ---- /api/me ----
// `statoDi(az)` e `extra` dipendono dalla modalità (portale o installazione).
export async function me(ctx, sess, statoDi, extra) {
  const { env } = ctx;
  const az = await getAzienda(env, sess.azienda_id);
  return json({
    user: { email: sess.email, ruolo: sess.ruolo, nome: sess.nome, azienda_id: sess.azienda_id, staff_id: sess.staff_id || null, admin: isAdmin(sess), master: isAdmin(sess) },
    azienda: az ? { id: az.id, denominazione: az.denominazione, licenza_scadenza: az.licenza_scadenza, attiva: !!az.attiva, stato: await statoDi(az), demo: !!az.demo, moduli: parseModuli(az.moduli, extra && extra.moduliExtra) } : null,
    ...(extra && extra.me ? extra.me : {}),
  });
}

// ---- /api/verify-password (conferma identita per operazioni sensibili) ----
export async function verifyPasswordRoute(ctx, sess) {
  const { request, env } = ctx;
  const b = await request.json().catch(() => ({}));
  const u = await env.DB.prepare("SELECT password_hash FROM utenti WHERE id = ?").bind(sess.uid).first();
  const ok = u && (await verifyPassword(String(b.password || ""), u.password_hash));
  return json({ ok: !!ok });
}

// ---- /api/operatori  (gestiti dal titolare del salone) ----
export async function operatori(ctx, segs, sess) {
  const { request, env } = ctx;
  const method = request.method;
  if (sess.ruolo !== "azienda" || !sess.azienda_id) return json({ error: "riservato al salone" }, 403);
  const azid = sess.azienda_id;
  const az = await getAzienda(env, azid);
  if (maxOperatoriOf(az && az.moduli) <= 1) return json({ error: "Accessi operatori non disponibili nel piano attuale" }, 403);

  if (!segs[1]) {
    if (method === "GET") {
      const res = await env.DB.prepare("SELECT id, email, staff_id FROM utenti WHERE azienda_id = ? AND ruolo = 'operatore' ORDER BY creato_il").bind(azid).all();
      return json({ items: res.results || [] });
    }
    if (method === "POST") {
      const body = await request.json().catch(() => ({}));
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const staffId = String(body.staff_id || "").trim();
      if (!email || password.length < 6 || !staffId) return json({ error: "email, password (min 6) e operatore richiesti" }, 400);
      const dup = await env.DB.prepare("SELECT id FROM utenti WHERE email = ?").bind(email).first();
      if (dup) return json({ error: "email gia in uso" }, 409);
      const id = crypto.randomUUID();
      const ph = await hashPassword(password);
      await env.DB.prepare("INSERT INTO utenti (id, email, password_hash, ruolo, azienda_id, nome, staff_id) VALUES (?, ?, ?, 'operatore', ?, ?, ?)").bind(id, email, ph, azid, email, staffId).run();
      return json({ ok: true, id });
    }
    return json({ error: "metodo non consentito" }, 405);
  }

  const oid = segs[1];
  const op = await env.DB.prepare("SELECT id, azienda_id, ruolo FROM utenti WHERE id = ?").bind(oid).first();
  if (!op || op.azienda_id !== azid || op.ruolo !== "operatore") return json({ error: "operatore non trovato" }, 404);
  if (method === "PATCH") {
    const body = await request.json().catch(() => ({}));
    if (body.staff_id != null) await env.DB.prepare("UPDATE utenti SET staff_id = ? WHERE id = ?").bind(String(body.staff_id), oid).run();
    if (body.nuovaPassword) {
      if (String(body.nuovaPassword).length < 6) return json({ error: "password troppo corta" }, 400);
      const ph = await hashPassword(String(body.nuovaPassword));
      await env.DB.prepare("UPDATE utenti SET password_hash = ? WHERE id = ?").bind(ph, oid).run();
    }
    return json({ ok: true });
  }
  if (method === "DELETE") {
    await env.DB.prepare("DELETE FROM sessioni WHERE utente_id = ?").bind(oid).run();
    await env.DB.prepare("DELETE FROM utenti WHERE id = ?").bind(oid).run();
    return json({ ok: true });
  }
  return json({ error: "metodo non consentito" }, 405);
}

// ---- /api/data/:collezione  (azienda completa, operatore in sola lettura) ----
export async function dati(ctx, segs, sess, statoDi) {
  const { request, env } = ctx;
  const method = request.method;
  if ((sess.ruolo !== "azienda" && sess.ruolo !== "operatore") || !sess.azienda_id) return json({ error: "nessuna azienda associata" }, 403);
  const coll = segs[1];
  if (!COLLEZIONI.includes(coll)) return json({ error: "collezione sconosciuta" }, 400);
  const az = await getAzienda(env, sess.azienda_id);
  const stato = await statoDi(az);
  if (stato !== "active") return json({ error: "licenza non attiva", stato }, 403);
  const azid = sess.azienda_id;
  const id = `${azid}:${coll}`;

  if (sess.ruolo === "operatore") {
    if (method !== "GET") return json({ error: "sola lettura" }, 403);
    if (coll !== "config" && coll !== "bookings" && coll !== "eventi") return json({ value: null });
    const row = await env.DB.prepare("SELECT dati FROM dati_app WHERE azienda_id = ? AND collezione = ?").bind(azid, coll).first();
    let value = row ? JSON.parse(row.dati) : null;
    if (coll === "bookings" && Array.isArray(value)) value = value.filter((b) => b && b.staffId === sess.staff_id);
    if (coll === "eventi" && Array.isArray(value)) value = value.filter((ev) => ev && (ev.staffIds || []).includes(sess.staff_id));
    return json({ value });
  }

  if (method === "GET") {
    const row = await env.DB.prepare("SELECT dati FROM dati_app WHERE azienda_id = ? AND collezione = ?").bind(azid, coll).first();
    return json({ value: row ? JSON.parse(row.dati) : null });
  }
  if (method === "PUT") {
    const body = await request.json().catch(() => ({}));
    const value = body && "value" in body ? body.value : null;
    await env.DB.prepare(
      "INSERT INTO dati_app (id, azienda_id, collezione, dati, aggiornato_il) VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET dati = excluded.dati, aggiornato_il = datetime('now')"
    ).bind(id, azid, coll, JSON.stringify(value)).run();
    return json({ ok: true });
  }
  return json({ error: "metodo non consentito" }, 405);
}
