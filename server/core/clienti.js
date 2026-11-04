// ============================================================================
// ACCOUNT DEI CLIENTI per la prenotazione online.
//
// Il cliente si registra da /registrazione (link non pubblicato sul sito):
// nome, cognome, telefono, email e una password scelta da lui. Il sistema lo
// collega alla sua scheda nel gestionale (per email o telefono, altrimenti ne
// crea una), gli manda l'email di benvenuto con il riepilogo dei dati (dalla
// casella Gmail del salone, modulo google) e lo fa entrare. Con email e
// password entra in /prenota, dove vede appuntamenti, punti e dati, e prenota.
//
// Tabelle: clienti_online (account, password con PBKDF2 come gli utenti) e
// sessioni_clienti (cookie HttpOnly `csid`, 90 giorni).
//
// Rotte pubbliche /api/clienti/:aid/…
//   POST registra {nome, cognome, telefono, email, password, privacy}
//   POST login {email, password} · POST logout
//   GET  me   → { cliente, appuntamenti, storico, punti }
//   POST dati {telefono, nuovaPassword, passwordAttuale}
// ============================================================================
import { json, getCookie, randomToken, hashPassword, verifyPassword, parseModuli } from "./util.js";
import { getAzienda } from "./sessione.js";
import { getCollezione } from "./disponibilita.js";
import { gmailInvia } from "./gmail.js";
import { leggiInt } from "./integrazioni.js";
import { emailPronta, valoriAppuntamento, minutiTesto } from "../../src/core/email/modelli.js";
import { puntiCliente } from "../../src/core/fidelity.js";

export const SESSIONE_CLIENTE_GIORNI = 90;
const emailOk = (s) => /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/.test(s);
const normTel = (p) => String(p || "").replace(/\D/g, "");
const cookieCliente = (token, scad) => `csid=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${scad}`;

export async function getSessioneCliente(env, request) {
  const sid = getCookie(request, "csid");
  if (!sid) return null;
  try {
    const row = await env.DB.prepare("SELECT s.token, s.scadenza, c.id, c.azienda_id, c.email, c.nome, c.cognome, c.telefono, c.client_code FROM sessioni_clienti s JOIN clienti_online c ON c.id = s.cliente_id WHERE s.token = ?").bind(sid).first();
    if (!row) return null;
    if (new Date(row.scadenza).getTime() < Date.now()) { await env.DB.prepare("DELETE FROM sessioni_clienti WHERE token = ?").bind(sid).run(); return null; }
    return row;
  } catch (e) { return null; } // tabella non ancora creata: nessun account
}
async function apriSessione(env, clienteId) {
  const token = randomToken();
  const scad = new Date(Date.now() + SESSIONE_CLIENTE_GIORNI * 86400000).toISOString();
  await env.DB.prepare("INSERT INTO sessioni_clienti (token, cliente_id, scadenza) VALUES (?, ?, ?)").bind(token, clienteId, scad).run();
  return cookieCliente(token, SESSIONE_CLIENTE_GIORNI * 86400);
}
async function scriviClienti(env, aid, lista) {
  await env.DB.prepare("INSERT INTO dati_app (id, azienda_id, collezione, dati, aggiornato_il) VALUES (?, ?, 'clients', ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET dati = excluded.dati, aggiornato_il = datetime('now')").bind(aid + ":clients", aid, JSON.stringify(lista)).run();
}
const gmailCollegato = async (env, aid, az) => parseModuli(az.moduli).includes("google") && !!(((await leggiInt(env, aid, "gmail:token")) || {}).refresh);

export async function clientiOnline(ctx, segs, statoDi, cliente) {
  const { request, env } = ctx;
  const method = request.method;
  const url = new URL(request.url);
  const aid = segs[1], azione = segs[2] || "";
  const az = await getAzienda(env, aid);
  if (!az || (await statoDi(az)) !== "active" || !parseModuli(az.moduli).includes("online")) return json({ error: "Prenotazioni online non disponibili." }, 404);
  const corpo = async () => { try { return (await request.json()) || {}; } catch (e) { return {}; } };
  const linkPrenota = url.origin + (cliente ? "/prenota" : `/?prenota=${encodeURIComponent(aid)}`);

  if (azione === "registra" && method === "POST") {
    const b = await corpo();
    const nome = String(b.nome || "").trim().slice(0, 80), cognome = String(b.cognome || "").trim().slice(0, 80);
    const telefono = String(b.telefono || "").trim().slice(0, 40), email = String(b.email || "").trim().toLowerCase().slice(0, 200), password = String(b.password || "");
    if (!nome || !cognome) return json({ error: "Nome e cognome sono obbligatori." }, 400);
    if (normTel(telefono).length < 6) return json({ error: "Inserisci un numero di telefono valido." }, 400);
    if (!emailOk(email)) return json({ error: "Inserisci un indirizzo email valido." }, 400);
    if (password.length < 6) return json({ error: "La password deve avere almeno 6 caratteri." }, 400);
    if (!b.privacy) return json({ error: "Per registrarti devi accettare l'informativa sulla privacy." }, 400);
    let esiste = null;
    try { esiste = await env.DB.prepare("SELECT id FROM clienti_online WHERE azienda_id = ? AND email = ?").bind(aid, email).first(); }
    catch (e) { return json({ error: "La registrazione non è ancora attiva su questo salone (tabella mancante)." }, 503); }
    if (esiste) return json({ error: "Esiste già un account con questa email: accedi da «Prenota», oppure contatta il salone." }, 409);
    // la scheda cliente nel gestionale: per email, poi per telefono, altrimenti nuova
    const config = (await getCollezione(env, aid, "config")) || {};
    const clients = (await getCollezione(env, aid, "clients")) || [];
    const lista = Array.isArray(clients) ? clients : [];
    let scheda = lista.find((c) => c.email && String(c.email).toLowerCase() === email) || lista.find((c) => normTel(c.phone) && normTel(c.phone) === normTel(telefono));
    let nuovaLista;
    if (scheda) nuovaLista = lista.map((c) => (c.code === scheda.code ? { ...c, name: c.name || `${nome} ${cognome}`, firstName: c.firstName || nome, lastName: c.lastName || cognome, phone: c.phone || telefono, email: c.email || email, accountEmail: email, accountDal: new Date().toISOString() } : c));
    else {
      const codes = lista.map((c) => parseInt(c.code, 10)).filter((n) => !isNaN(n));
      scheda = { code: String((codes.length ? Math.max(...codes) : 10000) + 1), name: `${nome} ${cognome}`, firstName: nome, lastName: cognome, phone: telefono, email, fromOnline: true, accountEmail: email, accountDal: new Date().toISOString(), createdAt: Date.now() };
      nuovaLista = [...lista, scheda];
    }
    await scriviClienti(env, aid, nuovaLista);
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO clienti_online (id, azienda_id, email, password_hash, nome, cognome, telefono, client_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, aid, email, await hashPassword(password), nome, cognome, telefono, scheda.code).run();
    // l'email di benvenuto, col riepilogo dei dati e la password scelta
    let emailInviata = false;
    if (await gmailCollegato(env, aid, az)) {
      const v = valoriAppuntamento({ clientName: `${nome} ${cognome}` }, config, { nome, cognome, telefono, email, password, linkPrenota });
      const m = emailPronta(config, "benvenuto", v);
      const r = await gmailInvia(env, aid, { a: [email], oggetto: m.oggetto, testo: m.testo, allegati: [] });
      emailInviata = !!r.ok;
    }
    return json({ ok: true, emailInviata, cliente: { nome, cognome, telefono, email, code: scheda.code } }, 200, { "Set-Cookie": await apriSessione(env, id) });
  }

  if (azione === "login" && method === "POST") {
    const b = await corpo();
    const email = String(b.email || "").trim().toLowerCase();
    let row = null;
    try { row = await env.DB.prepare("SELECT * FROM clienti_online WHERE azienda_id = ? AND email = ?").bind(aid, email).first(); } catch (e) {}
    if (!row || !(await verifyPassword(String(b.password || ""), row.password_hash))) return json({ error: "Email o password non corretti." }, 401);
    return json({ ok: true, cliente: { nome: row.nome, cognome: row.cognome, telefono: row.telefono, email: row.email, code: row.client_code } }, 200, { "Set-Cookie": await apriSessione(env, row.id) });
  }
  if (azione === "logout" && method === "POST") {
    const sid = getCookie(request, "csid");
    if (sid) { try { await env.DB.prepare("DELETE FROM sessioni_clienti WHERE token = ?").bind(sid).run(); } catch (e) {} }
    return json({ ok: true }, 200, { "Set-Cookie": cookieCliente("", 0) });
  }

  const cs = await getSessioneCliente(env, request);
  if (!cs || cs.azienda_id !== aid) return json({ error: "Accedi con la tua email e password." }, 401);

  if (azione === "me" && method === "GET") {
    const config = (await getCollezione(env, aid, "config")) || {};
    const clients = (await getCollezione(env, aid, "clients")) || [];
    const bookings = (await getCollezione(env, aid, "bookings")) || [];
    const sales = (await getCollezione(env, aid, "sales")) || [];
    const catalog = (await getCollezione(env, aid, "catalog")) || {};
    const scheda = (Array.isArray(clients) ? clients : []).find((c) => c.code === cs.client_code) || {};
    const oggi = new Date(); const oggiISO = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, "0")}-${String(oggi.getDate()).padStart(2, "0")}`;
    const svcName = (ids) => (ids || []).map((id) => { const s = (config.services || []).find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
    const stName = (sid) => { const s = (config.staff || []).find((x) => x.id === sid); return s ? s.name : ""; };
    const miei = (Array.isArray(bookings) ? bookings : []).filter((b) => b && b.clientCode === cs.client_code && b.status !== "cancelled");
    const inAgenda = miei.map((b) => ({ id: b.id, origine: "agenda", date: b.date, startMin: b.startMin, endMin: b.endMin, label: minutiTesto(b.startMin), serviceIds: b.serviceIds || [], serviceName: svcName(b.serviceIds), staffId: b.staffId, staffName: stName(b.staffId), status: b.status || "", amount: b.amount != null ? b.amount : null }));
    let online = [];
    try {
      const res = await env.DB.prepare("SELECT * FROM prenotazioni_online WHERE azienda_id = ? AND stato = 'attiva' AND data >= ? ORDER BY data, start_min").bind(aid, oggiISO).all();
      online = (res.results || []).filter((r) => r.client_code === cs.client_code || (r.client_email && String(r.client_email).toLowerCase() === cs.email)).map((r) => ({ id: r.id, origine: "online", date: r.data, startMin: r.start_min, endMin: r.end_min, label: minutiTesto(r.start_min), serviceId: r.service_id, serviceIds: [r.service_id], serviceName: svcName([r.service_id]), staffId: r.staff_id, staffName: stName(r.staff_id), status: "" }));
    } catch (e) {}
    const tutti = [...inAgenda, ...online].sort((a, b) => (a.date + minutiTesto(a.startMin)).localeCompare(b.date + minutiTesto(b.startMin)));
    const prossimi = tutti.filter((x) => x.date >= oggiISO);
    const storico = tutti.filter((x) => x.date < oggiISO).reverse().slice(0, 30);
    const punti = puntiCliente(scheda, bookings, sales, config, catalog);
    const L = (config.loyalty || {});
    return json({ ok: true, cliente: { nome: cs.nome, cognome: cs.cognome, telefono: cs.telefono, email: cs.email, code: cs.client_code, dal: scheda.accountDal || "" }, appuntamenti: prossimi, storico, punti: { saldo: punti, premi: (Array.isArray(L.rewards) ? L.rewards : []).map((r) => ({ label: r.label, points: r.points, raggiunto: punti >= r.points })), riscatti: (scheda.redemptions || []).slice(0, 10) } }, 200, { "Cache-Control": "no-store" });
  }
  if (azione === "dati" && method === "POST") {
    const b = await corpo();
    const telefono = String(b.telefono || "").trim().slice(0, 40);
    if (telefono && normTel(telefono).length < 6) return json({ error: "Numero di telefono non valido." }, 400);
    const nuova = String(b.nuovaPassword || "");
    if (nuova) {
      if (nuova.length < 6) return json({ error: "La nuova password deve avere almeno 6 caratteri." }, 400);
      const row = await env.DB.prepare("SELECT password_hash FROM clienti_online WHERE id = ?").bind(cs.id).first();
      if (!row || !(await verifyPassword(String(b.passwordAttuale || ""), row.password_hash))) return json({ error: "La password attuale non è corretta." }, 400);
      await env.DB.prepare("UPDATE clienti_online SET password_hash = ? WHERE id = ?").bind(await hashPassword(nuova), cs.id).run();
    }
    if (telefono && telefono !== cs.telefono) {
      await env.DB.prepare("UPDATE clienti_online SET telefono = ? WHERE id = ?").bind(telefono, cs.id).run();
      const clients = (await getCollezione(env, aid, "clients")) || [];
      if (Array.isArray(clients)) await scriviClienti(env, aid, clients.map((c) => (c.code === cs.client_code ? { ...c, phone: telefono } : c)));
    }
    return json({ ok: true });
  }
  return json({ error: "not found" }, 404);
}
