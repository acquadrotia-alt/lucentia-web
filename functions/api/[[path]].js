// ============================================================================
// API di Lucentia (Cloudflare Pages Functions) — con login e licenze
// Rotte sotto /api/...
//
// - Login con email + password (password cifrate con PBKDF2, mai in chiaro).
// - Sessione con cookie sicuro (HttpOnly).
// - Ruolo "reseller" (tu): crea i saloni-cliente e gestisce le loro licenze.
// - Ruolo "azienda" (il salone): accede solo ai propri dati, isolati dal server.
// - La licenza (scadenza / attiva) è controllata dal server: se scaduta o
//   disattivata, l'azienda non può leggere/salvare i dati.
// ============================================================================

const COLLEZIONI = ["config", "bookings", "clients", "catalog", "sales"];
const MODULI = ["fidelity", "vendite", "statistiche", "marketing", "allergeni", "pacchetti", "op3", "opinf"];
const OLD_MAP = { shop: "vendite", stats: "statistiche" };
function parseModuli(raw) {
  if (raw == null) return MODULI.slice(); // clienti creati prima dei moduli: tutto attivo
  try { const a = JSON.parse(raw); if (Array.isArray(a)) return a.map((k) => OLD_MAP[k] || k).filter((k) => MODULI.includes(k)); } catch (e) {}
  return [];
}
function cleanModuli(arr) {
  const a = Array.isArray(arr) ? arr.map((k) => OLD_MAP[k] || k).filter((k) => MODULI.includes(k)) : [];
  return JSON.stringify(a);
}
function cleanPrezzo(v) { if (v == null) return null; const s = String(v).trim(); return s === "" ? null : s; }
function maxOperatoriOf(raw) { const m = parseModuli(raw); return m.includes("opinf") ? Infinity : (m.includes("op3") ? 3 : 1); }
const SESSION_DAYS = 30;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });
}
function getCookie(request, name) {
  const h = request.headers.get("Cookie") || "";
  const m = h.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
const b64 = (bytes) => btoa(String.fromCharCode.apply(null, Array.from(bytes)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
function randomToken() { const a = crypto.getRandomValues(new Uint8Array(24)); return Array.from(a).map((x) => x.toString(16).padStart(2, "0")).join(""); }

async function hashPassword(password, iterations = 100000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}
async function verifyPassword(password, stored) {
  try {
    const parts = String(stored).split("$");
    if (parts[0] !== "pbkdf2") return false;
    const iterations = parseInt(parts[1], 10);
    const salt = unb64(parts[2]);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
    return b64(new Uint8Array(bits)) === parts[3];
  } catch (e) { return false; }
}

function pad2(n) { return String(n).padStart(2, "0"); }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function addMonthsISO(months) { const d = new Date(); d.setMonth(d.getMonth() + Number(months || 0)); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function licStatus(az) {
  if (!az) return "none";
  if (!az.attiva) return "disabled";
  if (!az.licenza_scadenza) return "active"; // illimitata
  const exp = new Date(az.licenza_scadenza + "T23:59:59").getTime();
  return Date.now() > exp ? "expired" : "active";
}

async function getSession(env, request) {
  const sid = getCookie(request, "sid");
  if (!sid) return null;
  const row = await env.DB.prepare(
    "SELECT s.token, s.scadenza, u.id AS uid, u.email, u.ruolo, u.azienda_id, u.nome, u.staff_id FROM sessioni s JOIN utenti u ON u.id = s.utente_id WHERE s.token = ?"
  ).bind(sid).first();
  if (!row) return null;
  if (new Date(row.scadenza).getTime() < Date.now()) { await env.DB.prepare("DELETE FROM sessioni WHERE token = ?").bind(sid).run(); return null; }
  return row;
}
async function getAzienda(env, id) {
  if (!id) return null;
  return await env.DB.prepare("SELECT * FROM aziende WHERE id = ?").bind(id).first();
}
function sessionCookie(token) {
  const maxAge = SESSION_DAYS * 24 * 3600;
  return `sid=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
const CLEAR_COOKIE = "sid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";

export async function onRequest(context) {
  const { request, env, params } = context;
  const segs = params.path || [];
  const method = request.method;

  // ---- /api/health ----
  if (segs[0] === "health") {
    try { await env.DB.prepare("SELECT 1").first(); return json({ ok: true, time: new Date().toISOString() }); }
    catch (e) { return json({ ok: false, error: String(e) }, 500); }
  }

  // ---- /api/setup (crea il reseller, una volta sola, protetto da SETUP_TOKEN) ----
  if (segs[0] === "setup" && method === "POST") {
    if (!env.SETUP_TOKEN) return json({ error: "SETUP_TOKEN non configurato" }, 500);
    const body = await request.json().catch(() => ({}));
    if (body.token !== env.SETUP_TOKEN) return json({ error: "token non valido" }, 403);
    const existing = await env.DB.prepare("SELECT COUNT(*) AS n FROM utenti WHERE ruolo = 'reseller'").first();
    if (existing && existing.n > 0) return json({ error: "reseller già esistente" }, 409);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || password.length < 6) return json({ error: "email valida e password (min 6) richieste" }, 400);
    const id = crypto.randomUUID();
    const ph = await hashPassword(password);
    await env.DB.prepare("INSERT INTO utenti (id, email, password_hash, ruolo, azienda_id, nome) VALUES (?, ?, ?, 'reseller', NULL, ?)").bind(id, email, ph, body.nome || "Rivenditore").run();
    return json({ ok: true });
  }

  // ---- /api/login ----
  if (segs[0] === "login" && method === "POST") {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const u = await env.DB.prepare("SELECT * FROM utenti WHERE email = ?").bind(email).first();
    if (!u || !(await verifyPassword(password, u.password_hash))) return json({ error: "email o password errati" }, 401);
    const token = randomToken();
    const scad = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000).toISOString();
    await env.DB.prepare("INSERT INTO sessioni (token, utente_id, scadenza) VALUES (?, ?, ?)").bind(token, u.id, scad).run();
    return json({ ok: true, ruolo: u.ruolo }, 200, { "Set-Cookie": sessionCookie(token) });
  }

  // ---- /api/logout ----
  if (segs[0] === "logout" && method === "POST") {
    const sid = getCookie(request, "sid");
    if (sid) await env.DB.prepare("DELETE FROM sessioni WHERE token = ?").bind(sid).run();
    return json({ ok: true }, 200, { "Set-Cookie": CLEAR_COOKIE });
  }

  // ---- da qui in poi serve la sessione ----
  const sess = await getSession(env, request);
  if (!sess) return json({ error: "non autenticato" }, 401);

  // ---- /api/me ----
  if (segs[0] === "me") {
    const az = await getAzienda(env, sess.azienda_id);
    return json({
      user: { email: sess.email, ruolo: sess.ruolo, nome: sess.nome, azienda_id: sess.azienda_id, staff_id: sess.staff_id || null },
      azienda: az ? { id: az.id, denominazione: az.denominazione, licenza_scadenza: az.licenza_scadenza, attiva: !!az.attiva, stato: licStatus(az), moduli: parseModuli(az.moduli) } : null,
    });
  }

  // ---- /api/aziende  (solo reseller) ----
  if (segs[0] === "aziende") {
    if (sess.ruolo !== "reseller") return json({ error: "riservato al rivenditore" }, 403);

    if (!segs[1]) {
      if (method === "GET") {
        const res = await env.DB.prepare(
          "SELECT a.id, a.denominazione, a.licenza_scadenza, a.attiva, a.note, a.moduli, a.prezzo_imponibile, a.prezzo_finale, a.creata_il, (SELECT email FROM utenti u WHERE u.azienda_id = a.id AND u.ruolo = 'azienda' ORDER BY u.creato_il LIMIT 1) AS email FROM aziende a ORDER BY a.creata_il DESC"
        ).all();
        const items = (res.results || []).map((a) => ({ ...a, attiva: !!a.attiva, stato: licStatus(a), moduli: parseModuli(a.moduli) }));
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
        await env.DB.prepare("INSERT INTO aziende (id, denominazione, licenza_scadenza, attiva, note, moduli, prezzo_imponibile, prezzo_finale) VALUES (?, ?, ?, 1, ?, ?, ?, ?)").bind(aid, denominazione, scadenza, String(body.note || ""), cleanModuli(body.moduli), cleanPrezzo(body.prezzo_imponibile), cleanPrezzo(body.prezzo_finale)).run();
        await env.DB.prepare("INSERT INTO utenti (id, email, password_hash, ruolo, azienda_id, nome) VALUES (?, ?, ?, 'azienda', ?, ?)").bind(uidv, email, ph, aid, denominazione).run();
        return json({ ok: true, id: aid });
      }
      return json({ error: "metodo non consentito" }, 405);
    }

    // /api/aziende/:id
    const aid = segs[1];
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
      if (body.prezzo_imponibile !== undefined) await env.DB.prepare("UPDATE aziende SET prezzo_imponibile = ? WHERE id = ?").bind(cleanPrezzo(body.prezzo_imponibile), aid).run();
      if (body.prezzo_finale !== undefined) await env.DB.prepare("UPDATE aziende SET prezzo_finale = ? WHERE id = ?").bind(cleanPrezzo(body.prezzo_finale), aid).run();
      if (body.nuovaPassword) {
        if (String(body.nuovaPassword).length < 6) return json({ error: "password troppo corta" }, 400);
        const ph = await hashPassword(String(body.nuovaPassword));
        await env.DB.prepare("UPDATE utenti SET password_hash = ? WHERE azienda_id = ? AND ruolo = 'azienda'").bind(ph, aid).run();
      }
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await env.DB.prepare("DELETE FROM sessioni WHERE utente_id IN (SELECT id FROM utenti WHERE azienda_id = ?)").bind(aid).run();
      await env.DB.prepare("DELETE FROM utenti WHERE azienda_id = ?").bind(aid).run();
      await env.DB.prepare("DELETE FROM dati_app WHERE azienda_id = ?").bind(aid).run();
      await env.DB.prepare("DELETE FROM aziende WHERE id = ?").bind(aid).run();
      return json({ ok: true });
    }
    return json({ error: "metodo non consentito" }, 405);
  }

  // ---- /api/operatori  (gestiti dal titolare del salone) ----
  if (segs[0] === "operatori") {
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
  if (segs[0] === "data" && segs[1]) {
    if ((sess.ruolo !== "azienda" && sess.ruolo !== "operatore") || !sess.azienda_id) return json({ error: "nessuna azienda associata" }, 403);
    const coll = segs[1];
    if (!COLLEZIONI.includes(coll)) return json({ error: "collezione sconosciuta" }, 400);
    const az = await getAzienda(env, sess.azienda_id);
    const stato = licStatus(az);
    if (stato !== "active") return json({ error: "licenza non attiva", stato }, 403);
    const azid = sess.azienda_id;
    const id = `${azid}:${coll}`;

    if (sess.ruolo === "operatore") {
      if (method !== "GET") return json({ error: "sola lettura" }, 403);
      if (coll !== "config" && coll !== "bookings") return json({ value: null });
      const row = await env.DB.prepare("SELECT dati FROM dati_app WHERE azienda_id = ? AND collezione = ?").bind(azid, coll).first();
      let value = row ? JSON.parse(row.dati) : null;
      if (coll === "bookings" && Array.isArray(value)) value = value.filter((b) => b && b.staffId === sess.staff_id);
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

  return json({ error: "not found" }, 404);
}
