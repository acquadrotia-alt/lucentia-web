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

const COLLEZIONI = ["config", "bookings", "clients", "catalog", "sales", "vouchers"];
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
function isMaster(sess) { return sess && sess.ruolo === "reseller" && !sess.reseller_parent; }
async function logEvento(env, aziendaId, resellerId, tipo, mesi, imp, fin) {
  await env.DB.prepare("INSERT INTO licenze_eventi (id, azienda_id, reseller_id, tipo, mesi, prezzo_imponibile, prezzo_finale) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), aziendaId, resellerId || null, tipo, Number(mesi) || 0, imp || null, fin || null).run();
}
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
function addDaysISO(days) { const d = new Date(); d.setDate(d.getDate() + Number(days || 0)); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function demoSeed() {
  const W = { 1: [[540, 780], [840, 1080]], 2: [[540, 780], [840, 1080]], 3: [[540, 780], [840, 1080]], 4: [[540, 780], [840, 1080]], 5: [[540, 780], [840, 1080]], 6: [[540, 780]] };
  const services = [
    { id: "s1", name: "Taglio donna", durationMin: 45, price: 25 },
    { id: "s2", name: "Piega", durationMin: 30, price: 18 },
    { id: "s3", name: "Colore", durationMin: 90, price: 45 },
    { id: "s4", name: "Taglio uomo", durationMin: 30, price: 18 },
    { id: "s5", name: "Manicure", durationMin: 45, price: 20 },
    { id: "s6", name: "Pulizia viso", durationMin: 50, price: 35 },
  ];
  const staff = [
    { id: "a1", name: "Giulia", role: "Parrucchiera", serviceIds: ["s1", "s2", "s3", "s4"], availability: W },
    { id: "a2", name: "Sara", role: "Estetista", serviceIds: ["s5", "s6"], availability: W },
  ];
  const branding = { name: "Salone Demo", tagline: "Versione dimostrativa", logo: null, primary: "#e11d48", phone: "", email: "", address: "" };
  const config = { services, staff, branding, cancelHours: 6, closures: [] };
  const catalog = { categories: [{ id: "c-cap", name: "Capelli" }, { id: "c-viso", name: "Viso" }, { id: "c-corpo", name: "Corpo" }], products: [
    { id: "p1", name: "Shampoo idratante", description: "Per capelli secchi", categoryId: "c-cap", formats: [{ id: "f1", label: "300 ml", price: 12.5, stock: 8 }] },
    { id: "p2", name: "Maschera nutriente", description: "Trattamento settimanale", categoryId: "c-cap", formats: [{ id: "f1", label: "250 ml", price: 18, stock: 5 }] },
    { id: "p3", name: "Crema viso anti-age", description: "Uso quotidiano", categoryId: "c-viso", formats: [{ id: "f1", label: "50 ml", price: 34, stock: 6 }] },
    { id: "p4", name: "Olio corpo", description: "Mandorle dolci", categoryId: "c-corpo", formats: [{ id: "f1", label: "100 ml", price: 15, stock: 4 }] },
  ] };

  const now = Date.now(); const DAY = 864e5;
  const d = (off) => { const x = new Date(); x.setDate(x.getDate() + off); return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`; };
  const clients = [
    { seed: true, code: "10001", name: "Maria Bianchi", firstName: "Maria", lastName: "Bianchi", phone: "340 111 2233", email: "maria.bianchi@email.it", card: "TS1001", allergies: "Allergia all'ammoniaca presente in alcune tinte", conditions: "Cuoio capelluto sensibile", notes: "Preferisce toni freddi", bonusPoints: 20, packages: [{ id: "pk1", serviceId: "s3", total: 5, used: 2, price: 200, createdAt: now - 70 * DAY }], createdAt: now - 120 * DAY },
    { seed: true, code: "10002", name: "Giulia Verdi", firstName: "Giulia", lastName: "Verdi", phone: "347 222 3344", email: "", allergies: "Lattice", conditions: "", notes: "", createdAt: now - 90 * DAY },
    { seed: true, code: "10003", name: "Anna Russo", firstName: "Anna", lastName: "Russo", phone: "333 444 5566", email: "", allergies: "", conditions: "", notes: "Preferisce il sabato mattina", packages: [{ id: "pk2", serviceId: "s5", total: 5, used: 1, price: 90, createdAt: now - 40 * DAY }], createdAt: now - 60 * DAY },
    { seed: true, code: "10004", name: "Laura Costa", firstName: "Laura", lastName: "Costa", phone: "320 555 6677", email: "laura.costa@email.it", createdAt: now - 30 * DAY },
  ];
  const bk = (off, startMin, dur, svc, staffId, clientCode, clientName, status, amount) => ({ seed: true, id: "bk-" + svc + "-" + off + "-" + startMin, date: d(off), startMin, endMin: startMin + dur, serviceIds: [svc], staffId, clientCode, clientName, status, amount: amount == null ? undefined : amount, createdAt: now });
  const bookings = [
    bk(-28, 540, 90, "s3", "a1", "10001", "Maria Bianchi", "done", 45),
    bk(-14, 600, 45, "s1", "a1", "10001", "Maria Bianchi", "done", 25),
    bk(-10, 660, 30, "s2", "a1", "10002", "Giulia Verdi", "done", 18),
    bk(-7, 900, 45, "s5", "a2", "10003", "Anna Russo", "done", 20),
    bk(-4, 990, 30, "s4", "a1", "10004", "Laura Costa", "done", 18),
    bk(-3, 930, 50, "s6", "a2", "10002", "Giulia Verdi", "done", 35),
    bk(0, 570, 30, "s2", "a1", "10001", "Maria Bianchi", undefined, null),
    bk(1, 600, 45, "s5", "a2", "10003", "Anna Russo", undefined, null),
    bk(2, 960, 45, "s1", "a1", "10004", "Laura Costa", undefined, null),
    bk(3, 900, 50, "s6", "a2", "10002", "Giulia Verdi", undefined, null),
    bk(5, 540, 90, "s3", "a1", "10001", "Maria Bianchi", undefined, null),
  ];
  const vouchers = [
    { seed: true, id: "v1", code: "BN-DEMO01", tipo: "valore", descrizione: "Buono compleanno", prezzo: 50, creato: now - 20 * DAY, stato: "assegnato", clienteCode: "10002", clienteNome: "Giulia Verdi", riscattato: now - 18 * DAY, usi: [{ at: now - 12 * DAY, importo: 20 }], importo: 50, residuo: 30 },
    { seed: true, id: "v2", code: "BN-DEMO02", tipo: "valore", descrizione: "Buono regalo", prezzo: 30, creato: now - 3 * DAY, stato: "attivo", clienteCode: null, clienteNome: null, riscattato: null, usi: [], importo: 30, residuo: 30 },
    { seed: true, id: "v3", code: "BN-DEMO03", tipo: "pacchetto", descrizione: "Pacchetto colore", prezzo: 180, creato: now - 1 * DAY, stato: "attivo", clienteCode: null, clienteNome: null, riscattato: null, usi: [], serviceId: "s3", sedute: 5 },
  ];
  const sales = [
    { id: "sl1", ts: now - 9 * DAY, type: "sale", partial: false, clientCode: "10001", clientName: "Maria Bianchi", items: [{ productId: "p1", formatId: "f1", name: "Shampoo idratante", label: "300 ml", price: 12.5, qty: 1 }], total: 12.5 },
    { id: "sl2", ts: now - 5 * DAY, type: "sale", partial: false, clientCode: null, clientName: "", items: [{ productId: "p3", formatId: "f1", name: "Crema viso anti-age", label: "50 ml", price: 34, qty: 1 }], total: 34 },
    { id: "sl3", ts: now - 2 * DAY, type: "sale", partial: false, clientCode: "10003", clientName: "Anna Russo", items: [{ productId: "p4", formatId: "f1", name: "Olio corpo", label: "100 ml", price: 15, qty: 2 }], total: 30 },
  ];
  return { config, catalog, clients, bookings, vouchers, sales };
}
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
    "SELECT s.token, s.scadenza, u.id AS uid, u.email, u.ruolo, u.azienda_id, u.nome, u.staff_id, u.reseller_parent FROM sessioni s JOIN utenti u ON u.id = s.utente_id WHERE s.token = ?"
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
  const url = new URL(request.url);

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

  // ---- /api/richiesta (pubblica: richiesta di contatto / licenza dalla copertina) ----
  if (segs[0] === "richiesta" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const email = String(b.email || "").trim().toLowerCase();
    const rs = String(b.ragione_sociale || "").trim();
    if (!rs || !email) return json({ error: "Ragione sociale ed email sono richieste" }, 400);
    await env.DB.prepare("INSERT INTO richieste (id, tipo, ragione_sociale, piva, email, telefono, messaggio, piano, azienda_id, stato) VALUES (?, 'licenza', ?, ?, ?, ?, ?, ?, NULL, 'nuova')").bind(crypto.randomUUID(), rs, String(b.piva || "").trim(), email, String(b.telefono || "").trim(), String(b.messaggio || "").trim(), String(b.piano || "").trim()).run();
    return json({ ok: true });
  }

  // ---- /api/demo (pubblica: attiva una prova demo di 10 giorni) ----
  if (segs[0] === "demo" && method === "POST") {
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

  // ---- da qui in poi serve la sessione ----
  const sess = await getSession(env, request);
  if (!sess) return json({ error: "non autenticato" }, 401);

  // ---- /api/me ----
  if (segs[0] === "me") {
    const az = await getAzienda(env, sess.azienda_id);
    let reseller = null;
    if (sess.ruolo === "reseller" && sess.reseller_parent) {
      const r = await env.DB.prepare("SELECT ragione_sociale, attiva, licenza_scadenza FROM rivenditori WHERE id = ?").bind(sess.uid).first();
      reseller = r ? { ragione_sociale: r.ragione_sociale, stato: licStatus({ attiva: r.attiva, licenza_scadenza: r.licenza_scadenza }), licenza_scadenza: r.licenza_scadenza } : { stato: "none" };
    }
    return json({
      user: { email: sess.email, ruolo: sess.ruolo, nome: sess.nome, azienda_id: sess.azienda_id, staff_id: sess.staff_id || null, master: isMaster(sess) },
      azienda: az ? { id: az.id, denominazione: az.denominazione, licenza_scadenza: az.licenza_scadenza, attiva: !!az.attiva, stato: licStatus(az), demo: !!az.demo, moduli: parseModuli(az.moduli), prezzo_imponibile: az.prezzo_imponibile || null, prezzo_finale: az.prezzo_finale || null } : null,
      reseller,
    });
  }

  // ---- /api/verify-password (conferma identita per operazioni sensibili) ----
  if (segs[0] === "verify-password" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const u = await env.DB.prepare("SELECT password_hash FROM utenti WHERE id = ?").bind(sess.uid).first();
    const ok = u && (await verifyPassword(String(b.password || ""), u.password_hash));
    return json({ ok: !!ok });
  }

  // ---- /api/aziende  (solo reseller) ----
  if (segs[0] === "aziende") {
    if (sess.ruolo !== "reseller") return json({ error: "riservato al rivenditore" }, 403);

    if (!segs[1]) {
      if (method === "GET") {
        const base = "SELECT a.id, a.denominazione, a.licenza_scadenza, a.attiva, a.note, a.moduli, a.prezzo_imponibile, a.prezzo_finale, a.reseller_id, a.creata_il, (SELECT email FROM utenti u WHERE u.azienda_id = a.id AND u.ruolo = 'azienda' ORDER BY u.creato_il LIMIT 1) AS email, COALESCE(r.ragione_sociale, '') AS reseller_nome FROM aziende a LEFT JOIN rivenditori r ON r.id = a.reseller_id";
        let res;
        if (isMaster(sess)) {
          const f = url.searchParams.get("reseller");
          if (f && f !== "all" && f !== "me") res = await env.DB.prepare(base + " WHERE a.reseller_id = ? ORDER BY a.creata_il DESC").bind(f).all();
          else if (f === "me") res = await env.DB.prepare(base + " WHERE a.reseller_id IS NULL OR a.reseller_id = ? ORDER BY a.creata_il DESC").bind(sess.uid).all();
          else res = await env.DB.prepare(base + " ORDER BY a.creata_il DESC").all();
        } else {
          res = await env.DB.prepare(base + " WHERE a.reseller_id = ? ORDER BY a.creata_il DESC").bind(sess.uid).all();
        }
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
        await env.DB.prepare("INSERT INTO aziende (id, denominazione, licenza_scadenza, attiva, note, moduli, prezzo_imponibile, prezzo_finale, reseller_id) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)").bind(aid, denominazione, scadenza, String(body.note || ""), cleanModuli(body.moduli), cleanPrezzo(body.prezzo_imponibile), cleanPrezzo(body.prezzo_finale), sess.uid).run();
        await env.DB.prepare("INSERT INTO utenti (id, email, password_hash, ruolo, azienda_id, nome) VALUES (?, ?, ?, 'azienda', ?, ?)").bind(uidv, email, ph, aid, denominazione).run();
        await logEvento(env, aid, sess.uid, "nuova", mesi, cleanPrezzo(body.prezzo_imponibile), cleanPrezzo(body.prezzo_finale));
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
      if (!isMaster(sess) && az.reseller_id !== sess.uid) return json({ error: "non autorizzato" }, 403);
      if (body.denominazione != null) await env.DB.prepare("UPDATE aziende SET denominazione = ? WHERE id = ?").bind(String(body.denominazione), aid).run();
      if (body.note != null) await env.DB.prepare("UPDATE aziende SET note = ? WHERE id = ?").bind(String(body.note), aid).run();
      if (body.attiva != null) await env.DB.prepare("UPDATE aziende SET attiva = ? WHERE id = ?").bind(body.attiva ? 1 : 0, aid).run();
      if (body.rinnovaMesi != null) { const m = Number(body.rinnovaMesi); const scad = m > 0 ? addMonthsISO(m) : null; await env.DB.prepare("UPDATE aziende SET licenza_scadenza = ? WHERE id = ?").bind(scad, aid).run(); await logEvento(env, aid, az.reseller_id, "rinnovo", m, az.prezzo_imponibile, az.prezzo_finale); }
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
      const azd = await getAzienda(env, aid);
      if (azd && !isMaster(sess) && azd.reseller_id !== sess.uid) return json({ error: "non autorizzato" }, 403);
      await env.DB.prepare("DELETE FROM sessioni WHERE utente_id IN (SELECT id FROM utenti WHERE azienda_id = ?)").bind(aid).run();
      await env.DB.prepare("DELETE FROM utenti WHERE azienda_id = ?").bind(aid).run();
      await env.DB.prepare("DELETE FROM dati_app WHERE azienda_id = ?").bind(aid).run();
      await env.DB.prepare("DELETE FROM aziende WHERE id = ?").bind(aid).run();
      return json({ ok: true });
    }
    return json({ error: "metodo non consentito" }, 405);
  }

  // ---- /api/rivenditori  (solo master) ----
  if (segs[0] === "rivenditori") {
    if (!isMaster(sess)) return json({ error: "riservato al rivenditore principale" }, 403);

    if (!segs[1]) {
      if (method === "GET") {
        const res = await env.DB.prepare("SELECT * FROM rivenditori ORDER BY creato_il DESC").all();
        const items = await Promise.all((res.results || []).map(async (r) => {
          const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM aziende WHERE reseller_id = ?").bind(r.id).first();
          const em = await env.DB.prepare("SELECT email FROM utenti WHERE id = ?").bind(r.id).first();
          return { ...r, attiva: !!r.attiva, stato: licStatus({ attiva: r.attiva, licenza_scadenza: r.licenza_scadenza }), clienti: c ? c.n : 0, email: (em && em.email) || r.email };
        }));
        return json({ items });
      }
      if (method === "POST") {
        const b = await request.json().catch(() => ({}));
        const email = String(b.email || "").trim().toLowerCase();
        const password = String(b.password || "");
        const req = { ragione_sociale: b.ragione_sociale, piva: b.piva, codice_fiscale: b.codice_fiscale, indirizzo: b.indirizzo, cap: b.cap, citta: b.citta, provincia: b.provincia };
        const mancanti = Object.keys(req).filter((k) => !String(req[k] || "").trim());
        if (!email || password.length < 6) mancanti.push("email/password");
        if (!String(b.sdi || "").trim() && !String(b.pec || "").trim()) mancanti.push("sdi_o_pec");
        if (mancanti.length) return json({ error: "Dati di fatturazione mancanti: " + mancanti.join(", ") }, 400);
        const dup = await env.DB.prepare("SELECT id FROM utenti WHERE email = ?").bind(email).first();
        if (dup) return json({ error: "email gia in uso" }, 409);
        const id = crypto.randomUUID();
        const ph = await hashPassword(password);
        const scad = addMonthsISO(12);
        const sconto = (b.sconto == null || b.sconto === "") ? 50 : Math.max(0, Math.min(100, Math.round(Number(b.sconto)) || 0));
        await env.DB.prepare("INSERT INTO utenti (id, email, password_hash, ruolo, azienda_id, nome, reseller_parent) VALUES (?, ?, ?, 'reseller', NULL, ?, ?)").bind(id, email, ph, String(b.ragione_sociale).trim(), sess.uid).run();
        await env.DB.prepare("INSERT INTO rivenditori (id, ragione_sociale, piva, codice_fiscale, indirizzo, cap, citta, provincia, sdi, pec, email, telefono, note, licenza_scadenza, attiva, sconto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)").bind(id, String(b.ragione_sociale).trim(), String(b.piva).trim(), String(b.codice_fiscale).trim(), String(b.indirizzo).trim(), String(b.cap).trim(), String(b.citta).trim(), String(b.provincia).trim(), String(b.sdi || "").trim(), String(b.pec || "").trim(), email, String(b.telefono || "").trim(), String(b.note || "").trim(), scad, sconto).run();
        return json({ ok: true, id });
      }
      return json({ error: "metodo non consentito" }, 405);
    }

    const rid = segs[1];
    const riv = await env.DB.prepare("SELECT id FROM rivenditori WHERE id = ?").bind(rid).first();
    if (!riv) return json({ error: "rivenditore non trovato" }, 404);
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const campi = ["ragione_sociale", "piva", "codice_fiscale", "indirizzo", "cap", "citta", "provincia", "sdi", "pec", "telefono", "note"];
      for (const k of campi) { if (b[k] !== undefined) await env.DB.prepare(`UPDATE rivenditori SET ${k} = ? WHERE id = ?`).bind(String(b[k] || ""), rid).run(); }
      if (b.attiva != null) await env.DB.prepare("UPDATE rivenditori SET attiva = ? WHERE id = ?").bind(b.attiva ? 1 : 0, rid).run();
      if (b.sconto != null) await env.DB.prepare("UPDATE rivenditori SET sconto = ? WHERE id = ?").bind(Math.max(0, Math.min(100, Math.round(Number(b.sconto)) || 0)), rid).run();
      if (b.rinnova) { await env.DB.prepare("UPDATE rivenditori SET licenza_scadenza = ? WHERE id = ?").bind(addMonthsISO(12), rid).run(); }
      if (b.nuovaPassword) {
        if (String(b.nuovaPassword).length < 6) return json({ error: "password troppo corta" }, 400);
        const ph = await hashPassword(String(b.nuovaPassword));
        await env.DB.prepare("UPDATE utenti SET password_hash = ? WHERE id = ?").bind(ph, rid).run();
      }
      return json({ ok: true });
    }
    if (method === "DELETE") {
      // i clienti del rivenditore passano al master (reseller_id = NULL)
      await env.DB.prepare("UPDATE aziende SET reseller_id = NULL WHERE reseller_id = ?").bind(rid).run();
      await env.DB.prepare("DELETE FROM sessioni WHERE utente_id = ?").bind(rid).run();
      await env.DB.prepare("DELETE FROM utenti WHERE id = ?").bind(rid).run();
      await env.DB.prepare("DELETE FROM rivenditori WHERE id = ?").bind(rid).run();
      return json({ ok: true });
    }
    return json({ error: "metodo non consentito" }, 405);
  }

  // ---- /api/fatturazione  (solo master) ----
  if (segs[0] === "fatturazione") {
    if (!isMaster(sess)) return json({ error: "riservato al rivenditore principale" }, 403);
    if (!segs[1]) {
      if (method === "GET") {
        const mese = url.searchParams.get("mese") || "";
        const f = url.searchParams.get("reseller") || "all";
        const base = "SELECT e.*, COALESCE(a.denominazione, '(eliminato)') AS denominazione FROM licenze_eventi e LEFT JOIN aziende a ON a.id = e.azienda_id";
        const conds = []; const binds = [];
        if (mese) { conds.push("e.creato_il LIKE ?"); binds.push(mese + "%"); }
        if (f === "me") { conds.push("(e.reseller_id IS NULL OR e.reseller_id = ?)"); binds.push(sess.uid); }
        else if (f !== "all") { conds.push("e.reseller_id = ?"); binds.push(f); }
        const sql = base + (conds.length ? " WHERE " + conds.join(" AND ") : "") + " ORDER BY e.creato_il DESC";
        const res = await env.DB.prepare(sql).bind(...binds).all();
        const items = (res.results || []).map((e) => ({ ...e, fatturato: !!e.fatturato }));
        return json({ items });
      }
      return json({ error: "metodo non consentito" }, 405);
    }
    const eid = segs[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const fatt = b.fatturato ? 1 : 0;
      await env.DB.prepare("UPDATE licenze_eventi SET fatturato = ?, fatturato_il = ? WHERE id = ?").bind(fatt, fatt ? new Date().toISOString() : null, eid).run();
      return json({ ok: true });
    }
    return json({ error: "metodo non consentito" }, 405);
  }

  // ---- /api/richieste  (solo master: richieste licenza + demo attivate) ----
  if (segs[0] === "richieste") {
    if (!isMaster(sess)) return json({ error: "riservato al rivenditore principale" }, 403);
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
