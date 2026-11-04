// Account dei clienti per la prenotazione online: registrazione con email di
// benvenuto, accesso, area cliente (appuntamenti e punti), prenotazione che
// richiede l'account, email di conferma subito e promemoria alle 19 del
// giorno prima e un'ora prima (una volta sola). D1 in memoria e Gmail finto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";
import { giroPromemoria, oraRoma } from "../server/core/promemoria.js";

const AID = "az1";
const h = (hh, mm = 0) => hh * 60 + mm;
const oggi = new Date(); const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fra = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
// un giorno fra 10 giorni con l'operatore in servizio (lavora tutti i giorni)
const GIORNO = fra(10);

function scenario() {
  const config = {
    services: [{ id: "piega", name: "Piega", durationMin: 30, price: 25 }],
    staff: [{ id: "a1", name: "Giulia", serviceIds: ["piega"], availability: { 0: [[h(9), h(19)]], 1: [[h(9), h(19)]], 2: [[h(9), h(19)]], 3: [[h(9), h(19)]], 4: [[h(9), h(19)]], 5: [[h(9), h(19)]], 6: [[h(9), h(19)]] } }],
    branding: { name: "Estetica Prova", phone: "0321 123456", address: "Via Roma 1, Oleggio" },
    loyalty: { mode: "flat", rewards: [{ id: "r1", points: 2, label: "Piega omaggio" }] },
    onlineBooking: { mode: "griglia", leadHours: 0, horizonDays: 30 },
    closures: [],
  };
  return {
    azienda: { id: AID, denominazione: "Estetica Prova", attiva: 1, licenza_scadenza: "2099-01-01", moduli: JSON.stringify(["online", "google", "opinf"]), demo: 0 },
    dati: { config, bookings: [], clients: [{ code: "10001", name: "Anna Rossi", phone: "3331234567", email: "anna@esempio.it" }], sales: [], catalog: { products: [] }, eventi: [] },
    accounts: [], sessioni: [], online: [], integrazioni: { [AID + "|gmail:token"]: JSON.stringify({ refresh: "rt", email: "salone@gmail.com", scope: "gmail.send calendar" }), [AID + "|gmail:cfg"]: JSON.stringify({ clientId: "x", clientSecret: "y" }), [AID + "|gmail:access"]: JSON.stringify({ token: "acc", scade: Date.now() + 3600000 }) },
    email: [],
  };
}
function db(st) {
  return {
    prepare(sql) {
      let a = [];
      const self = {
        bind(...x) { a = x; return self; },
        async first() {
          if (sql.startsWith("SELECT * FROM aziende")) return st.azienda && (!a.length || a[0] === AID) ? st.azienda : null;
          if (sql.includes("FROM dati_app")) { const v = st.dati[a[1]]; return v === undefined ? null : { dati: JSON.stringify(v) }; }
          if (sql.startsWith("SELECT dati FROM integrazioni")) { const v = st.integrazioni[a[0] + "|" + a[1]]; return v === undefined ? null : { dati: v }; }
          if (sql.startsWith("SELECT id FROM clienti_online")) return st.accounts.find((c) => c.azienda_id === a[0] && c.email === a[1]) || null;
          if (sql.startsWith("SELECT * FROM clienti_online WHERE azienda_id")) return st.accounts.find((c) => c.azienda_id === a[0] && c.email === a[1]) || null;
          if (sql.startsWith("SELECT password_hash FROM clienti_online")) return st.accounts.find((c) => c.id === a[0]) || null;
          if (sql.startsWith("SELECT * FROM clienti_online WHERE id")) return st.accounts.find((c) => c.id === a[0]) || null;
          if (sql.includes("FROM sessioni_clienti s JOIN clienti_online c")) { const s = st.sessioni.find((x) => x.token === a[0]); if (!s) return null; const c = st.accounts.find((x) => x.id === s.cliente_id); return c ? { token: s.token, scadenza: s.scadenza, id: c.id, azienda_id: c.azienda_id, email: c.email, nome: c.nome, cognome: c.cognome, telefono: c.telefono, client_code: c.client_code } : null; }
          if (sql.includes("FROM sessioni s JOIN utenti u")) return null;
          if (sql.startsWith("SELECT * FROM prenotazioni_online WHERE id")) return st.online.find((o) => o.id === a[0]) || null;
          return null;
        },
        async all() {
          if (sql.startsWith("SELECT * FROM aziende")) return { results: [st.azienda] };
          if (sql.includes("FROM prenotazioni_online")) return { results: st.online.filter((o) => o.stato === "attiva") };
          return { results: [] };
        },
        async run() {
          if (sql.startsWith("INSERT INTO clienti_online")) st.accounts.push({ id: a[0], azienda_id: a[1], email: a[2], password_hash: a[3], nome: a[4], cognome: a[5], telefono: a[6], client_code: a[7] });
          else if (sql.startsWith("INSERT INTO sessioni_clienti")) st.sessioni.push({ token: a[0], cliente_id: a[1], scadenza: a[2] });
          else if (sql.startsWith("DELETE FROM sessioni_clienti")) st.sessioni = st.sessioni.filter((s) => s.token !== a[0]);
          else if (sql.startsWith("UPDATE clienti_online SET password_hash")) { const c = st.accounts.find((x) => x.id === a[1]); if (c) c.password_hash = a[0]; }
          else if (sql.startsWith("UPDATE clienti_online SET telefono")) { const c = st.accounts.find((x) => x.id === a[1]); if (c) c.telefono = a[0]; }
          else if (sql.startsWith("UPDATE clienti_online SET email")) { const c = st.accounts.find((x) => x.id === a[1]); if (c) c.email = a[0]; }
          else if (sql.startsWith("INSERT INTO dati_app")) st.dati[sql.includes("'clients'") ? "clients" : sql.includes("'bookings'") ? "bookings" : "?"] = JSON.parse(a[2]);
          else if (sql.startsWith("INSERT INTO integrazioni")) st.integrazioni[a[0] + "|" + a[1]] = a[2];
          else if (sql.startsWith("DELETE FROM integrazioni")) delete st.integrazioni[a[0] + "|" + a[1]];
          else if (sql.startsWith("INSERT INTO prenotazioni_online")) st.online.push({ id: a[0], azienda_id: a[1], data: a[2], start_min: a[3], end_min: a[4], service_id: a[5], staff_id: a[6], client_code: a[7], client_name: a[8], client_phone: a[9], client_email: a[10], note: a[11], stato: "attiva", creato_il: new Date().toISOString().slice(0, 19).replace("T", " ") });
          else if (sql.startsWith("UPDATE prenotazioni_online SET stato = 'annullata'")) { const o = st.online.find((x) => x.id === a[0]); if (o) o.stato = "annullata"; }
          return { success: true };
        },
      };
      return self;
    },
  };
}
// Gmail finto: raccoglie le email mandate
function fintoGmail(st) {
  return async (url, init) => {
    if (String(url).includes("gmail.googleapis.com")) { const raw = JSON.parse(init.body).raw; const mime = Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"); const to = /^To: (.*)$/m.exec(mime); const subj = /^Subject: (.*)$/m.exec(mime); const dec = (s) => (/^=\?UTF-8\?B\?/.test(s) ? Buffer.from(s.replace(/^=\?UTF-8\?B\?/, "").replace(/\?=$/, ""), "base64").toString("utf8") : s); const testo = /Content-Type: text\/plain[^]*?\r\n\r\n([A-Za-z0-9+\/=\r\n]+)/.exec(mime); st.email.push({ a: to ? to[1].trim() : "", oggetto: subj ? dec(subj[1].trim()) : "", testo: testo ? Buffer.from(testo[1].replace(/\r\n/g, ""), "base64").toString("utf8") : "" }); return new Response(JSON.stringify({ id: "m" + st.email.length }), { status: 200, headers: { "Content-Type": "application/json" } }); }
    throw new Error("URL non previsto: " + url);
  };
}
async function chiama(st, path, { method = "GET", body, cookie } = {}) {
  const fetchVero = globalThis.fetch; globalThis.fetch = fintoGmail(st);
  try {
    const res = await onRequest({ request: new Request("https://salone.test" + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }), env: { DB: db(st), SETUP_TOKEN: "x" }, params: { path: path.replace(/^\/api\/?/, "").split("?")[0].split("/").filter(Boolean) } });
    const sc = res.headers.get("Set-Cookie") || "";
    return { status: res.status, body: await res.json(), cookie: sc ? sc.split(";")[0] : "" };
  } finally { globalThis.fetch = fetchVero; }
}
const REG = { nome: "Anna", cognome: "Rossi", telefono: "333 1234567", email: "Anna@esempio.it", password: "segreta1", privacy: true };

test("registrazione: dati obbligatori, scheda cliente collegata, email di benvenuto con riepilogo e password", async () => {
  const st = scenario();
  assert.equal((await chiama(st, `/api/clienti/${AID}/registra`, { method: "POST", body: { ...REG, cognome: "" } })).status, 400);
  assert.equal((await chiama(st, `/api/clienti/${AID}/registra`, { method: "POST", body: { ...REG, password: "123" } })).status, 400);
  assert.equal((await chiama(st, `/api/clienti/${AID}/registra`, { method: "POST", body: { ...REG, privacy: false } })).status, 400);
  const r = await chiama(st, `/api/clienti/${AID}/registra`, { method: "POST", body: REG });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.emailInviata, true);
  assert.equal(r.body.cliente.code, "10001", "collegata alla scheda che aveva già quella email");
  assert.ok(r.cookie.startsWith("csid="), "entra subito");
  assert.equal(st.accounts.length, 1); assert.equal(st.accounts[0].email, "anna@esempio.it");
  assert.notEqual(st.accounts[0].password_hash, "segreta1", "la password è cifrata");
  assert.equal(st.dati.clients[0].accountEmail, "anna@esempio.it");
  const m = st.email[0];
  assert.equal(m.a, "anna@esempio.it"); assert.match(m.oggetto, /Benvenuto da Estetica Prova/);
  assert.match(m.testo, /Nome: Anna Rossi/); assert.match(m.testo, /Telefono: 333 1234567/); assert.match(m.testo, /Password: segreta1/); assert.match(m.testo, /https:\/\/salone\.test\/\?prenota=az1/);
  // stessa email due volte: no
  assert.equal((await chiama(st, `/api/clienti/${AID}/registra`, { method: "POST", body: REG })).status, 409);
  // cliente nuovo (email e telefono sconosciuti): nasce la scheda
  const r2 = await chiama(st, `/api/clienti/${AID}/registra`, { method: "POST", body: { ...REG, email: "luca@esempio.it", telefono: "3479998877", nome: "Luca", cognome: "Bianchi" } });
  assert.equal(r2.body.cliente.code, "10002"); assert.equal(st.dati.clients.length, 2); assert.equal(st.dati.clients[1].name, "Luca Bianchi");
});

test("accesso, area cliente con appuntamenti e punti, e la prenotazione richiede l'account", async () => {
  const st = scenario();
  st.dati.bookings = [{ id: "b-fatto", date: fra(-20), startMin: h(10), endMin: h(10, 30), serviceIds: ["piega"], staffId: "a1", clientCode: "10001", clientName: "Anna Rossi", status: "done", amount: 25 }, { id: "b-prossimo", date: fra(3), startMin: h(11), endMin: h(11, 30), serviceIds: ["piega"], staffId: "a1", clientCode: "10001", clientName: "Anna Rossi" }];
  await chiama(st, `/api/clienti/${AID}/registra`, { method: "POST", body: REG });
  // senza account la prenotazione è negata, e la pagina lo sa
  assert.equal((await chiama(st, `/api/prenota/${AID}`)).body.accountRichiesto, true);
  const no = await chiama(st, `/api/prenota/${AID}`, { method: "POST", body: { date: GIORNO, service: "piega", start: h(10), name: "X", phone: "3331112222", privacy: true } });
  assert.equal(no.status, 401);
  assert.equal((await chiama(st, `/api/clienti/${AID}/login`, { method: "POST", body: { email: "anna@esempio.it", password: "sbagliata" } })).status, 401);
  const l = await chiama(st, `/api/clienti/${AID}/login`, { method: "POST", body: { email: "ANNA@esempio.it", password: "segreta1" } });
  assert.equal(l.status, 200); const cookie = l.cookie; assert.ok(cookie.startsWith("csid="));
  let me = await chiama(st, `/api/clienti/${AID}/me`, { cookie });
  assert.equal(me.status, 200); assert.equal(me.body.cliente.nome, "Anna");
  assert.equal(me.body.appuntamenti.length, 1); assert.equal(me.body.appuntamenti[0].id, "b-prossimo"); assert.equal(me.body.appuntamenti[0].serviceName, "Piega");
  assert.equal(me.body.storico.length, 1);
  assert.equal(me.body.punti.saldo, 1); assert.equal(me.body.punti.premi[0].raggiunto, false);
  // prenota con l'account: i dati vengono dall'account, la scheda è la sua, la conferma parte subito
  st.email.length = 0;
  const ok = await chiama(st, `/api/prenota/${AID}`, { method: "POST", body: { date: GIORNO, service: "piega", start: h(10), privacy: true }, cookie });
  assert.equal(ok.status, 200, JSON.stringify(ok.body)); assert.equal(ok.body.emailInviata, true);
  assert.equal(st.online.length, 1); assert.equal(st.online[0].client_code, "10001"); assert.equal(st.online[0].client_name, "Anna Rossi"); assert.equal(st.online[0].client_email, "anna@esempio.it");
  assert.equal(st.email.length, 1); assert.match(st.email[0].oggetto, /Conferma appuntamento/, JSON.stringify(st.email)); assert.match(st.email[0].testo, /Piega con Giulia/);
  assert.ok(st.integrazioni[AID + "|mail:" + st.online[0].id + ":conferma"], "segnata come mandata");
  me = await chiama(st, `/api/clienti/${AID}/me`, { cookie });
  assert.equal(me.body.appuntamenti.length, 2); assert.equal(me.body.appuntamenti.find((x) => x.origine === "online").date, GIORNO);
  // annulla la propria prenotazione online col cookie, senza telefono
  const ann = await chiama(st, `/api/prenota/${AID}/annulla`, { method: "POST", body: { id: st.online[0].id }, cookie });
  assert.equal(ann.status, 200); assert.equal(st.online[0].stato, "annullata");
  // dati: cambio telefono e password
  const d = await chiama(st, `/api/clienti/${AID}/dati`, { method: "POST", body: { telefono: "3330000000", passwordAttuale: "segreta1", nuovaPassword: "nuova12" }, cookie });
  assert.equal(d.status, 200); assert.equal(st.dati.clients[0].phone, "3330000000");
  assert.equal((await chiama(st, `/api/clienti/${AID}/login`, { method: "POST", body: { email: "anna@esempio.it", password: "nuova12" } })).status, 200);
  await chiama(st, `/api/clienti/${AID}/logout`, { method: "POST", cookie });
  assert.equal((await chiama(st, `/api/clienti/${AID}/me`, { cookie })).status, 401);
  // il salone può lasciare la prenotazione libera
  st.dati.config.onlineBooking.senzaAccount = true;
  assert.equal((await chiama(st, `/api/prenota/${AID}`, { method: "POST", body: { date: GIORNO, service: "piega", start: h(14), name: "Ospite", phone: "3331112222", privacy: true } })).status, 200);
});

test("promemoria: conferma al primo giro, alle 19 del giorno prima e un'ora prima, ognuno una volta sola", async () => {
  const st = scenario();
  const env = { DB: db(st) };
  const data = fra(2); const prima = fra(1);
  st.dati.bookings = [
    { id: "b1", date: data, startMin: h(15), endMin: h(15, 30), serviceIds: ["piega"], staffId: "a1", clientCode: "10001", clientName: "Anna Rossi", createdAt: Date.now() },
    { id: "b-senza", date: data, startMin: h(16), endMin: h(16, 30), serviceIds: ["piega"], staffId: "a1", clientCode: "99999", clientName: "Senza Email", createdAt: Date.now() },
    { id: "b-vecchio", date: data, startMin: h(17), endMin: h(17, 30), serviceIds: ["piega"], staffId: "a1", clientCode: "10001", clientName: "Anna Rossi", createdAt: Date.now() - 5 * 86400000 },
  ];
  const giro = async (adesso) => { const fetchVero = globalThis.fetch; globalThis.fetch = fintoGmail(st); try { return await giroPromemoria(env, AID, st.azienda, adesso); } finally { globalThis.fetch = fetchVero; } };
  const romaAlle = (dataISO, hh, mm) => { // l'istante in cui a Roma sono le hh:mm di quel giorno
    for (let off = -3; off <= 3; off++) { const d = new Date(`${dataISO}T${pad(hh)}:${pad(mm)}:00Z`); d.setHours(d.getHours() - off); const r = oraRoma(d); if (r.data === dataISO && r.minuti === hh * 60 + mm) return d; }
    throw new Error("ora non trovata");
  };
  // adesso (oggi): solo la conferma dell'appuntamento preso da poco
  let e = await giro(romaAlle(iso(oggi), 12, 0));
  assert.equal(e.conferme, 1); assert.equal(e.giornoPrima, 0); assert.equal(e.oraPrima, 0);
  assert.equal(st.email.length, 1); assert.match(st.email[0].oggetto, /Conferma appuntamento/, JSON.stringify(st.email));
  // un secondo giro non rimanda niente
  e = await giro(romaAlle(iso(oggi), 12, 10)); assert.equal(e.conferme, 0); assert.equal(st.email.length, 1);
  // il giorno prima alle 18:50: ancora niente; alle 19:05: il promemoria (anche per quello vecchio, che non aveva avuto la conferma)
  e = await giro(romaAlle(prima, 18, 50)); assert.equal(e.giornoPrima, 0);
  e = await giro(romaAlle(prima, 19, 5)); assert.equal(e.giornoPrima, 2);
  assert.equal(st.email.length, 3); assert.match(st.email[1].oggetto, /domani alle 15:00/);
  e = await giro(romaAlle(prima, 19, 15)); assert.equal(e.giornoPrima, 0, "una volta sola");
  // il giorno stesso alle 14:10: un'ora prima per il primo (15:00), non ancora per il 17:00
  e = await giro(romaAlle(data, 14, 10)); assert.equal(e.oraPrima, 1); assert.match(st.email[3].oggetto, /Tra un'ora/);
  e = await giro(romaAlle(data, 16, 10)); assert.equal(e.oraPrima, 1);
  e = await giro(romaAlle(data, 16, 20)); assert.equal(e.oraPrima, 0);
  // a Gmail scollegato il giro non fa niente
  delete st.integrazioni[AID + "|gmail:token"];
  e = await giro(romaAlle(data, 16, 30)); assert.match(e.motivo, /Gmail non collegato/);
});

test("la rotta del giro è pubblica ma non più di una volta al minuto", async () => {
  const st = scenario();
  const r1 = await chiama(st, "/api/promemoria", { method: "POST" });
  assert.equal(r1.status, 200); assert.equal(Array.isArray(r1.body.saloni), true);
  const r2 = await chiama(st, "/api/promemoria", { method: "POST" });
  assert.equal(r2.body.saltato, true);
  assert.equal((await chiama(st, "/api/promemoria")).status, 405);
});

test("richiesta di recensione: dopo il primo appuntamento svolto, una volta sola per cliente, solo col link", async () => {
  const st = scenario();
  const env = { DB: db(st) };
  st.dati.clients.push({ code: "10002", name: "Luca Bianchi", email: "luca@esempio.it" });
  st.dati.bookings = [
    { id: "s1", date: fra(-1), startMin: h(10), endMin: h(10, 30), serviceIds: ["piega"], staffId: "a1", clientCode: "10001", clientName: "Anna Rossi", status: "done", createdAt: Date.now() - 5 * 86400000 },
    { id: "s2", date: fra(-1), startMin: h(11), endMin: h(11, 30), serviceIds: ["piega"], staffId: "a1", clientCode: "10002", clientName: "Luca Bianchi", status: "partial", createdAt: Date.now() - 5 * 86400000 },
    { id: "s3", date: fra(-1), startMin: h(12), endMin: h(12, 30), serviceIds: ["piega"], staffId: "a1", clientCode: "99999", clientName: "Senza Email", status: "done", createdAt: Date.now() - 5 * 86400000 },
    { id: "s4", date: fra(-10), startMin: h(12), endMin: h(12, 30), serviceIds: ["piega"], staffId: "a1", clientCode: "10001", clientName: "Anna Rossi", status: "done", createdAt: Date.now() - 15 * 86400000 },
  ];
  const giro = async () => { const fetchVero = globalThis.fetch; globalThis.fetch = fintoGmail(st); try { return await giroPromemoria(env, AID, st.azienda, new Date()); } finally { globalThis.fetch = fetchVero; } };
  // spenta: niente
  let e = await giro(); assert.equal(e.recensioni, 0); assert.equal(st.email.length, 0);
  // accesa ma senza link: niente
  st.dati.config.google = { recensioni: { attivo: true, link: "" }, confermaAutomatica: false };
  e = await giro(); assert.equal(e.recensioni, 0);
  st.dati.config.google.recensioni.link = "https://g.page/r/prova/review";
  e = await giro();
  assert.equal(e.recensioni, 2, JSON.stringify(e));
  assert.equal(st.email.length, 2);
  assert.match(st.email[0].oggetto, /Com'è andata da Estetica Prova/); assert.match(st.email[0].testo, /https:\/\/g\.page\/r\/prova\/review/); assert.match(st.email[0].testo, /Piega/);
  assert.ok(st.integrazioni[AID + "|mail:recensione:anna@esempio.it"]);
  // un altro giro, e un altro appuntamento svolto della stessa cliente: non si richiede più
  st.dati.bookings.push({ id: "s5", date: fra(0), startMin: h(0), endMin: h(0, 10), serviceIds: ["piega"], staffId: "a1", clientCode: "10001", clientName: "Anna Rossi", status: "done" });
  e = await giro(); assert.equal(e.recensioni, 0); assert.equal(st.email.length, 2);
});

test("recupero password via email, cambio email, annullo e spostamento degli appuntamenti presi in salone entro il preavviso", async () => {
  const st = scenario();
  st.dati.config.cancelHours = 6;
  await chiama(st, `/api/clienti/${AID}/registra`, { method: "POST", body: REG });
  st.email.length = 0;
  // recupero: la risposta è neutra, l'email parte solo se l'account esiste
  const r0 = await chiama(st, `/api/clienti/${AID}/recupera`, { method: "POST", body: { email: "nessuno@esempio.it" } });
  assert.equal(r0.status, 200); assert.equal(st.email.length, 0);
  const r1 = await chiama(st, `/api/clienti/${AID}/recupera`, { method: "POST", body: { email: "anna@esempio.it" } });
  assert.equal(r1.status, 200); assert.equal(st.email.length, 1); assert.match(st.email[0].oggetto, /Reimposta la tua password/);
  const link = /https:\/\/salone\.test\/\?registrazione=az1&reset=([a-f0-9]+)/.exec(st.email[0].testo);
  assert.ok(link, st.email[0].testo);
  assert.equal((await chiama(st, `/api/clienti/${AID}/reimposta`, { method: "POST", body: { token: "finto", password: "nuova123" } })).status, 410);
  const r2 = await chiama(st, `/api/clienti/${AID}/reimposta`, { method: "POST", body: { token: link[1], password: "nuova123" } });
  assert.equal(r2.status, 200, JSON.stringify(r2.body)); assert.ok(r2.cookie.startsWith("csid="), "entra subito");
  assert.equal((await chiama(st, `/api/clienti/${AID}/reimposta`, { method: "POST", body: { token: link[1], password: "altra123" } })).status, 410, "il link vale una volta");
  assert.equal((await chiama(st, `/api/clienti/${AID}/login`, { method: "POST", body: { email: "anna@esempio.it", password: "nuova123" } })).status, 200);
  const cookie = r2.cookie;
  // cambio email: serve la password attuale, l'indirizzo deve essere libero, la scheda segue
  assert.equal((await chiama(st, `/api/clienti/${AID}/dati`, { method: "POST", body: { nuovaEmail: "anna.nuova@esempio.it" }, cookie })).status, 400);
  const d = await chiama(st, `/api/clienti/${AID}/dati`, { method: "POST", body: { nuovaEmail: "Anna.Nuova@esempio.it", passwordAttuale: "nuova123" }, cookie });
  assert.equal(d.status, 200, JSON.stringify(d.body)); assert.equal(st.accounts[0].email, "anna.nuova@esempio.it"); assert.equal(st.dati.clients[0].accountEmail, "anna.nuova@esempio.it");
  // appuntamenti presi in salone: fra 3 giorni (modificabile), fra 2 ore (no), già svolto (no)
  const fraDueOre = new Date(Date.now() + 2 * 3600000);
  st.dati.bookings = [
    { id: "lontano", date: fra(3), startMin: h(11), endMin: h(11, 30), serviceIds: ["piega"], staffId: "a1", clientCode: "10001", clientName: "Anna Rossi" },
    { id: "vicino", date: iso(fraDueOre), startMin: fraDueOre.getHours() * 60 + fraDueOre.getMinutes(), endMin: fraDueOre.getHours() * 60 + fraDueOre.getMinutes() + 30, serviceIds: ["piega"], staffId: "a1", clientCode: "10001", clientName: "Anna Rossi" },
    { id: "altrui", date: fra(3), startMin: h(15), endMin: h(15, 30), serviceIds: ["piega"], staffId: "a1", clientCode: "10002", clientName: "Altra" },
  ];
  const me = await chiama(st, `/api/clienti/${AID}/me`, { cookie });
  assert.equal(me.body.preavvisoOre, 6);
  const lontano = me.body.appuntamenti.find((x) => x.id === "lontano"); assert.equal(lontano.modificabile, true); assert.equal(lontano.spostabile, true);
  const vicino = me.body.appuntamenti.find((x) => x.id === "vicino"); assert.equal(!!vicino.modificabile, false);
  assert.equal((await chiama(st, `/api/clienti/${AID}/annulla-agenda`, { method: "POST", body: { id: "vicino" }, cookie })).status, 409);
  assert.equal((await chiama(st, `/api/clienti/${AID}/annulla-agenda`, { method: "POST", body: { id: "altrui" }, cookie })).status, 404);
  // spostamento: gli slot escludono l'appuntamento stesso, il nuovo orario viene scritto in agenda
  const sl = await chiama(st, `/api/prenota/${AID}/slots?date=${fra(3)}&service=piega&staff=a1&exclude=lontano`);
  assert.ok(sl.body.slots.some((x) => x.start === h(11)), "il suo stesso orario resta libero per lui");
  const sp = await chiama(st, `/api/clienti/${AID}/sposta-agenda`, { method: "POST", body: { id: "lontano", date: fra(3), start: h(16) }, cookie });
  assert.equal(sp.status, 200, JSON.stringify(sp.body));
  const spostato = st.dati.bookings.find((x) => x.id === "lontano"); assert.equal(spostato.startMin, h(16)); assert.equal(spostato.endMin, h(16, 30)); assert.equal(spostato.spostatoDa, "cliente");
  assert.equal((await chiama(st, `/api/clienti/${AID}/sposta-agenda`, { method: "POST", body: { id: "lontano", date: fra(3), start: h(15) }, cookie })).status, 409, "orario occupato da altri");
  const an = await chiama(st, `/api/clienti/${AID}/annulla-agenda`, { method: "POST", body: { id: "lontano" }, cookie });
  assert.equal(an.status, 200); assert.equal(st.dati.bookings.find((x) => x.id === "lontano").status, "cancelled");
  // «ripeti l'ultimo»: l'ultimo appuntamento passato con un servizio prenotabile
  st.dati.bookings.push({ id: "passato", date: fra(-5), startMin: h(10), endMin: h(10, 30), serviceIds: ["piega"], staffId: "a1", clientCode: "10001", clientName: "Anna Rossi", status: "done" });
  const me2 = await chiama(st, `/api/clienti/${AID}/me`, { cookie });
  assert.equal(me2.body.ultimo.serviceId, "piega"); assert.equal(me2.body.ultimo.staffId, "a1");
});
