// Gmail e Google Calendar (modulo "google"): OAuth, invio delle email, il
// calendario a due vie e il feed iCalendar, con un Google finto e un D1 in
// memoria. Il portale (modalità hub) ospita il salone "az1".
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";
import { gidDaLocale, localeDaGid } from "../server/core/gcal.js";

const AID = "az1";

function db(st) {
  return {
    prepare(sql) {
      let a = [];
      const self = {
        bind(...x) { a = x; return self; },
        async first() {
          if (sql.includes("FROM sessioni s JOIN utenti u")) return st.sessione && a[0] === "tok" ? st.sessione : null;
          if (sql.startsWith("SELECT * FROM aziende WHERE id = ?")) return st.azienda && a[0] === AID ? st.azienda : null;
          if (sql.startsWith("SELECT dati FROM integrazioni")) { const v = st.integrazioni[a[0] + "|" + a[1]]; return v === undefined ? null : { dati: v }; }
          if (sql.includes("FROM dati_app")) { const v = st.dati[a[1]]; return v === undefined ? null : { dati: JSON.stringify(v) }; }
          return null;
        },
        async all() {
          if (sql.startsWith("SELECT id, denominazione FROM aziende WHERE attiva = 1")) return { results: [{ id: AID, denominazione: "Bellezza & Stile" }] };
          return { results: [] };
        },
        async run() {
          if (sql.startsWith("INSERT INTO integrazioni")) st.integrazioni[a[0] + "|" + a[1]] = a[2];
          else if (sql.startsWith("DELETE FROM integrazioni")) delete st.integrazioni[a[0] + "|" + a[1]];
          return { success: true };
        },
      };
      return self;
    },
  };
}

const titolare = { token: "tok", scadenza: "2099-01-01T00:00:00.000Z", uid: "u1", email: "titolare@x.it", ruolo: "azienda", azienda_id: AID, nome: "Titolare", staff_id: null, reseller_parent: null };
function scenario() {
  return {
    azienda: { id: AID, denominazione: "Bellezza & Stile", attiva: 1, licenza_scadenza: "2099-12-31", moduli: JSON.stringify(["google", "opinf"]), demo: 0 },
    sessione: titolare,
    integrazioni: {},
    dati: {
      config: { services: [{ id: "piega", name: "Piega", durationMin: 30 }], staff: [{ id: "a1", name: "Giulia" }], branding: { name: "Bellezza & Stile" } },
      bookings: [{ id: "b1", date: "2026-11-10", startMin: 600, endMin: 630, serviceIds: ["piega"], staffId: "a1", clientName: "Anna Rossi", clientEmail: "anna@esempio.it" }, { id: "b2", date: "2026-11-10", startMin: 700, endMin: 730, serviceIds: ["piega"], staffId: "a1", clientName: "Annullata", status: "cancelled" }],
    },
    google: { chiamate: [], token: { ok: true }, eventi: {}, prossimoRefresh: "acc-2" },
  };
}
const int = (st, chiave) => { const v = st.integrazioni[AID + "|" + chiave]; return v ? JSON.parse(v) : null; };
const collegato = (st) => {
  st.integrazioni[AID + "|gmail:cfg"] = JSON.stringify({ clientId: "abc.apps.googleusercontent.com", clientSecret: "GOCSPX-segreto" });
  st.integrazioni[AID + "|gmail:token"] = JSON.stringify({ refresh: "rt-1", email: "salone@gmail.com", scope: "openid email https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar", il: "2026-11-01T00:00:00Z" });
};

// Il Google finto: OAuth, Gmail e Calendar.
function fintoGoogle(st) {
  const g = st.google;
  const risposta = (status, body, tipo = "application/json") => new Response(body == null ? null : (typeof body === "string" ? body : JSON.stringify(body)), { status, headers: { "Content-Type": tipo } });
  return async (url, init = {}) => {
    const u = new URL(String(url));
    const metodo = init.method || "GET";
    const body = init.body ? (typeof init.body === "string" ? init.body : String(init.body)) : "";
    g.chiamate.push({ url: u.href, metodo, body, auth: (init.headers || {}).Authorization || "" });
    if (u.host === "oauth2.googleapis.com" && u.pathname === "/token") {
      const p = new URLSearchParams(body);
      if (p.get("grant_type") === "authorization_code") {
        if (!g.token.ok) return risposta(400, { error: "invalid_grant" });
        // id_token con l'email dentro
        const idt = "x." + Buffer.from(JSON.stringify({ email: "salone@gmail.com" })).toString("base64url") + ".y";
        return risposta(200, { access_token: "acc-1", expires_in: 3599, refresh_token: g.token.senzaRefresh ? undefined : "rt-1", scope: g.token.scope || "openid email https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar", id_token: idt });
      }
      if (p.get("grant_type") === "refresh_token") {
        if (g.refreshFallisce) return risposta(400, { error: "invalid_grant" });
        return risposta(200, { access_token: g.prossimoRefresh, expires_in: 3599 });
      }
    }
    if (u.host === "oauth2.googleapis.com" && u.pathname === "/revoke") return risposta(200, {});
    if (u.host === "gmail.googleapis.com") { g.ultimoRaw = JSON.parse(body).raw; return risposta(200, { id: "msg-1" }); }
    if (u.host === "www.googleapis.com") {
      const path = u.pathname.replace("/calendar/v3", "");
      if (path === "/users/me/calendarList") return risposta(200, { items: [{ id: "cal-giulia", summary: "Giulia", accessRole: "owner", backgroundColor: "#f00", primary: true }, { id: "cal-altro", summary: "Cabine", accessRole: "writer" }, { id: "festivi", summary: "Festività", accessRole: "reader" }] });
      const m = /^\/calendars\/([^/]+)\/events(?:\/([^/]+))?(\/move)?$/.exec(path);
      if (m) {
        const cal = decodeURIComponent(m[1]), id = m[2] ? decodeURIComponent(m[2]) : "";
        g.eventi[cal] = g.eventi[cal] || {};
        if (metodo === "GET" && !id) return risposta(200, { items: Object.values(g.eventi[cal]) });
        if (metodo === "GET" && id) return g.eventi[cal][id] ? risposta(200, g.eventi[cal][id]) : risposta(404, { error: { message: "Not Found" } });
        if (metodo === "POST" && m[3]) { const dest = u.searchParams.get("destination"); g.eventi[dest] = g.eventi[dest] || {}; g.eventi[dest][id] = g.eventi[cal][id]; delete g.eventi[cal][id]; return risposta(200, g.eventi[dest][id]); }
        if (metodo === "POST") { const b = JSON.parse(body); if (g.eventi[cal][b.id]) return risposta(409, { error: { message: "The requested identifier already exists." } }); g.eventi[cal][b.id] = { ...b, updated: "2026-11-02T10:00:00.000Z", htmlLink: "https://calendar.google.com/e/" + b.id }; return risposta(200, g.eventi[cal][b.id]); }
        if (metodo === "PATCH") { if (!g.eventi[cal][id]) return risposta(404, {}); g.eventi[cal][id] = { ...g.eventi[cal][id], ...JSON.parse(body), updated: "2026-11-02T11:00:00.000Z" }; return risposta(200, g.eventi[cal][id]); }
        if (metodo === "DELETE") { const c = !!g.eventi[cal][id]; delete g.eventi[cal][id]; return risposta(c ? 204 : 404, null); }
      }
    }
    throw new Error("URL non previsto dal Google finto: " + metodo + " " + u.href);
  };
}

async function chiama(st, path, { method = "GET", body, auth = true } = {}) {
  const fetchVero = globalThis.fetch;
  globalThis.fetch = fintoGoogle(st);
  try {
    const res = await onRequest({
      request: new Request("https://portale.test" + path, { method, headers: { "Content-Type": "application/json", ...(auth ? { Cookie: "sid=tok" } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" }),
      env: { DB: db(st), SETUP_TOKEN: "x" },
      params: { path: path.replace(/^\/api\/?/, "").split("?")[0].split("/").filter(Boolean) },
    });
    const tipo = res.headers.get("Content-Type") || "";
    return { status: res.status, headers: res.headers, body: tipo.includes("json") ? await res.json() : await res.text() };
  } finally { globalThis.fetch = fetchVero; }
}

// ---------------------------------------------------------------- accesso
test("Gmail e Calendar sono riservati al titolare col modulo google acceso", async () => {
  const st = scenario();
  assert.equal((await chiama(st, "/api/gmail?action=stato", { auth: false })).status, 401);
  st.azienda.moduli = JSON.stringify(["fidelity"]);
  const r = await chiama(st, "/api/gmail?action=stato");
  assert.equal(r.status, 403);
  assert.match(r.body.error, /modulo Google/);
  st.azienda.moduli = JSON.stringify(["google"]);
  st.sessione = { ...titolare, ruolo: "operatore", staff_id: "a1" };
  assert.equal((await chiama(st, "/api/gcal?action=stato")).status, 403);
  st.sessione = titolare; st.azienda.demo = 1;
  assert.equal((await chiama(st, "/api/agenda-ics?action=stato")).status, 403);
});

// ------------------------------------------------------------- OAuth
test("i codici del client si salvano e il segreto non torna mai al browser", async () => {
  const st = scenario();
  let r = await chiama(st, "/api/gmail?action=config", { method: "POST", body: { clientId: "sbagliato", clientSecret: "s" } });
  assert.equal(r.status, 400);
  r = await chiama(st, "/api/gmail?action=config", { method: "POST", body: { clientId: "abc.apps.googleusercontent.com", clientSecret: "GOCSPX-segreto" } });
  assert.equal(r.status, 200);
  const stato = (await chiama(st, "/api/gmail?action=stato")).body;
  assert.equal(stato.configurato, true);
  assert.equal(stato.clientId, "abc.apps.googleusercontent.com");
  assert.equal(stato.collegato, false);
  assert.equal(stato.redirect, "https://portale.test/api/gmail?action=ritorno");
  assert.ok(!JSON.stringify(stato).includes("GOCSPX"), "il client secret non esce");
  // si può aggiornare l'ID lasciando il segreto vuoto: resta quello di prima
  r = await chiama(st, "/api/gmail?action=config", { method: "POST", body: { clientId: "abc.apps.googleusercontent.com", clientSecret: "" } });
  assert.equal(r.status, 200);
  assert.equal(int(st, "gmail:cfg").clientSecret, "GOCSPX-segreto");
});

test("collegamento: l'indirizzo di Google porta lo state, e al ritorno lo state deve combaciare", async () => {
  const st = scenario();
  await chiama(st, "/api/gmail?action=config", { method: "POST", body: { clientId: "abc.apps.googleusercontent.com", clientSecret: "GOCSPX-segreto" } });
  const r = await chiama(st, "/api/gmail?action=autorizza");
  const u = new URL(r.body.url);
  assert.equal(u.origin + u.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.equal(u.searchParams.get("client_id"), "abc.apps.googleusercontent.com");
  assert.equal(u.searchParams.get("access_type"), "offline");
  assert.equal(u.searchParams.get("prompt"), "consent");
  assert.match(u.searchParams.get("scope"), /gmail\.send/);
  assert.match(u.searchParams.get("scope"), /auth\/calendar/);
  assert.equal(u.searchParams.get("redirect_uri"), "https://portale.test/api/gmail?action=ritorno");
  const state = u.searchParams.get("state");
  assert.ok(state.startsWith(AID + "."));
  // uno state inventato non vale, e Google non manda il cookie
  let t = await chiama(st, "/api/gmail?action=ritorno&code=c1&state=" + AID + ".finto", { auth: false });
  assert.equal(t.status, 302);
  assert.equal(t.headers.get("Location"), "https://portale.test/?gmail=scaduto");
  // quello vero sì
  t = await chiama(st, "/api/gmail?action=ritorno&code=c1&state=" + encodeURIComponent(state), { auth: false });
  assert.equal(t.headers.get("Location"), "https://portale.test/?gmail=collegato");
  const tok = int(st, "gmail:token");
  assert.equal(tok.refresh, "rt-1");
  assert.equal(tok.email, "salone@gmail.com", "l'email si legge dall'id_token");
  assert.match(tok.scope, /calendar/);
  // lo scambio è avvenuto col client secret
  const scambio = st.google.chiamate.find((c) => c.url.includes("/token"));
  assert.match(scambio.body, /client_secret=GOCSPX-segreto/);
  assert.match(scambio.body, /grant_type=authorization_code/);
  // lo stesso state non vale due volte
  t = await chiama(st, "/api/gmail?action=ritorno&code=c2&state=" + encodeURIComponent(state), { auth: false });
  assert.equal(t.headers.get("Location"), "https://portale.test/?gmail=scaduto");
  const stato = (await chiama(st, "/api/gmail?action=stato")).body;
  assert.equal(stato.collegato, true);
  assert.equal(stato.email, "salone@gmail.com");
});

test("senza refresh token o senza il permesso gmail.send si torna con l'errore spiegato", async () => {
  const st = scenario();
  await chiama(st, "/api/gmail?action=config", { method: "POST", body: { clientId: "abc.apps.googleusercontent.com", clientSecret: "s" } });
  let state = new URL((await chiama(st, "/api/gmail?action=autorizza")).body.url).searchParams.get("state");
  st.google.token.senzaRefresh = true;
  let t = await chiama(st, "/api/gmail?action=ritorno&code=c&state=" + encodeURIComponent(state), { auth: false });
  assert.equal(t.headers.get("Location"), "https://portale.test/?gmail=senza-refresh");
  st.google.token.senzaRefresh = false; st.google.token.scope = "openid email";
  state = new URL((await chiama(st, "/api/gmail?action=autorizza")).body.url).searchParams.get("state");
  t = await chiama(st, "/api/gmail?action=ritorno&code=c&state=" + encodeURIComponent(state), { auth: false });
  assert.equal(t.headers.get("Location"), "https://portale.test/?gmail=permesso-mancante");
  assert.equal(int(st, "gmail:token"), null);
  // permesso negato su Google
  state = new URL((await chiama(st, "/api/gmail?action=autorizza")).body.url).searchParams.get("state");
  t = await chiama(st, "/api/gmail?action=ritorno&error=access_denied&state=" + encodeURIComponent(state), { auth: false });
  assert.equal(t.headers.get("Location"), "https://portale.test/?gmail=negato");
});

// ------------------------------------------------------------- email
function decodificaMime(raw) {
  const mime = Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  const [intestazioni, corpo] = mime.split("\r\n\r\n", 2);
  const h = {};
  intestazioni.split("\r\n").forEach((l) => { const i = l.indexOf(":"); h[l.slice(0, i).toLowerCase()] = l.slice(i + 1).trim(); });
  // ogni parte base64 decodificata
  const parti = [];
  const re = /Content-Type: ([^;\r\n]+)[^\r\n]*\r\n(?:Content-Disposition: ([^\r\n]+)\r\n)?Content-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)/g;
  let m; while ((m = re.exec(mime))) parti.push({ tipo: m[1], disposizione: m[2] || "", testo: Buffer.from(m[3].replace(/\r\n/g, ""), "base64").toString("utf8") });
  return { h, mime, parti, corpo };
}

test("l'email parte in MIME corretto: oggetto con accenti, testo, HTML con link e allegato", async () => {
  const st = scenario(); collegato(st);
  const r = await chiama(st, "/api/gmail?action=invia", { method: "POST", body: { a: "anna@esempio.it", copiaAMe: true, oggetto: "Conferma appuntamento martedì — Bellezza & Stile", testo: "Gentile Anna,\nla aspettiamo.\nInfo: https://salone.test/prenota", allegati: [{ nome: "ricevuta n°1.pdf", tipo: "application/pdf", base64: Buffer.from("%PDF-1.4 finto").toString("base64") }] } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.da, "salone@gmail.com");
  const d = decodificaMime(st.google.ultimoRaw);
  assert.equal(d.h.from, "salone@gmail.com");
  assert.equal(d.h.to, "anna@esempio.it");
  assert.equal(d.h.bcc, "salone@gmail.com", "copia a me in Ccn");
  assert.match(d.h.subject, /^=\?UTF-8\?B\?/);
  assert.equal(Buffer.from(d.h.subject.replace(/^=\?UTF-8\?B\?/, "").replace(/\?=$/, ""), "base64").toString("utf8"), "Conferma appuntamento martedì — Bellezza & Stile");
  assert.match(d.h["content-type"], /^multipart\/mixed/);
  assert.match(d.mime, /multipart\/alternative/);
  const testo = d.parti.find((p) => p.tipo === "text/plain");
  const html = d.parti.find((p) => p.tipo === "text/html");
  const pdf = d.parti.find((p) => p.tipo === "application/pdf");
  assert.equal(testo.testo, "Gentile Anna,\nla aspettiamo.\nInfo: https://salone.test/prenota");
  assert.match(html.testo, /<a href="https:\/\/salone\.test\/prenota">/);
  assert.match(html.testo, /<br>/);
  assert.equal(pdf.testo, "%PDF-1.4 finto");
  assert.match(pdf.disposizione, /attachment; filename="=\?UTF-8\?B\?/, "nome file con caratteri non ASCII in RFC 2047");
  // il primo invio ha chiesto un token di accesso col refresh token
  const refresh = st.google.chiamate.find((c) => c.body.includes("grant_type=refresh_token"));
  assert.ok(refresh);
  assert.match(refresh.body, /refresh_token=rt-1/);
  const invio = st.google.chiamate.find((c) => c.url.includes("gmail.googleapis.com"));
  assert.equal(invio.auth, "Bearer acc-2");
  assert.ok(int(st, "gmail:token").ultimoInvio);
});

test("controlli sull'email: destinatario, oggetto, indirizzi validi, troppi destinatari", async () => {
  const st = scenario(); collegato(st);
  assert.equal((await chiama(st, "/api/gmail?action=invia", { method: "POST", body: { oggetto: "x", testo: "y" } })).status, 400);
  assert.equal((await chiama(st, "/api/gmail?action=invia", { method: "POST", body: { a: "anna@esempio.it", testo: "y" } })).status, 400);
  assert.match((await chiama(st, "/api/gmail?action=invia", { method: "POST", body: { a: "non-valido", oggetto: "x", testo: "y" } })).body.error, /non valido/);
  const tanti = Array.from({ length: 21 }, (_, i) => `c${i}@esempio.it`).join(", ");
  assert.match((await chiama(st, "/api/gmail?action=invia", { method: "POST", body: { a: tanti, oggetto: "x", testo: "y" } })).body.error, /Troppi/);
  assert.equal(st.google.ultimoRaw, undefined, "niente è partito");
});

test("il token di accesso resta in cache; con invalid_grant il permesso si cancella e si chiede di ricollegare", async () => {
  const st = scenario(); collegato(st);
  await chiama(st, "/api/gmail?action=prova", { method: "POST", body: {} });
  await chiama(st, "/api/gmail?action=prova", { method: "POST", body: {} });
  assert.equal(st.google.chiamate.filter((c) => c.body.includes("grant_type=refresh_token")).length, 1, "un solo rinnovo per due invii");
  // il token scade → si rinnova; Google dice invalid_grant
  st.integrazioni[AID + "|gmail:access"] = JSON.stringify({ token: "vecchio", scade: Date.now() - 1000 });
  st.google.refreshFallisce = true;
  const r = await chiama(st, "/api/gmail?action=prova", { method: "POST", body: {} });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /ricollega/);
  assert.equal(int(st, "gmail:token").refresh, "", "il refresh token non vale più");
  assert.equal((await chiama(st, "/api/gmail?action=stato")).body.collegato, false);
});

test("scollegare revoca il token su Google e cancella il permesso, non i codici", async () => {
  const st = scenario(); collegato(st);
  await chiama(st, "/api/gmail?action=scollega", { method: "POST", body: {} });
  assert.ok(st.google.chiamate.find((c) => c.url.includes("/revoke") && c.body.includes("rt-1")));
  assert.equal(int(st, "gmail:token"), null);
  assert.ok(int(st, "gmail:cfg"));
  await chiama(st, "/api/gmail?action=dimentica", { method: "POST", body: {} });
  assert.equal(int(st, "gmail:cfg"), null);
});

// ------------------------------------------------------------- calendario
test("l'id Google di un appuntamento è fisso e reversibile", () => {
  assert.equal(gidDaLocale("b1"), "lc6231");
  assert.equal(localeDaGid("lc6231"), "b1");
  assert.match(gidDaLocale("xk3_Ù"), /^lc[0-9a-f]+$/);
  assert.equal(localeDaGid(gidDaLocale("xk3_Ù")), "xk3_Ù");
  assert.equal(localeDaGid("evento-di-google"), "");
});

test("senza il permesso calendar il calendario chiede di ricollegare", async () => {
  const st = scenario(); collegato(st);
  const tok = int(st, "gmail:token"); tok.scope = "openid email https://www.googleapis.com/auth/gmail.send";
  st.integrazioni[AID + "|gmail:token"] = JSON.stringify(tok);
  const s = (await chiama(st, "/api/gcal?action=stato")).body;
  assert.equal(s.collegato, true); assert.equal(s.permesso, false); assert.equal(s.attivo, false);
  const r = await chiama(st, "/api/gcal?action=calendari");
  assert.equal(r.status, 400);
  assert.match(r.body.error, /spunta sul calendario/);
});

test("abbinamenti: solo i calendari scrivibili, poi gli appuntamenti vanno su Google senza doppioni", async () => {
  const st = scenario(); collegato(st);
  const cals = (await chiama(st, "/api/gcal?action=calendari")).body.calendari;
  assert.deepEqual(cals.map((c) => [c.id, c.scrivibile]), [["cal-giulia", true], ["cal-altro", true], ["festivi", false]]);
  let r = await chiama(st, "/api/gcal?action=config", { method: "POST", body: { attivo: true, mappa: { op: { a1: "cal-giulia" }, altro: "cal-altro" } } });
  assert.equal(r.body.attivo, true);
  assert.equal(r.body.nomi["cal-giulia"].nome, "Giulia");
  const s = (await chiama(st, "/api/gcal?action=stato")).body;
  assert.equal(s.attivo, true); assert.deepEqual(s.mappa, { op: { a1: "cal-giulia" }, altro: "cal-altro" });
  // primo invio: POST con l'id fisso
  const ev = { locale: "b1", cal: "cal-giulia", title: "Anna Rossi · Piega", date: "2026-11-10", start: "10:00", end: "10:30", allDay: false, descrizione: "Servizi: Piega" };
  r = await chiama(st, "/api/gcal?action=spingi", { method: "POST", body: { eventi: [ev] } });
  assert.equal(r.body.esiti.b1.ok, true);
  assert.equal(r.body.esiti.b1.gid, "lc6231");
  const su = st.google.eventi["cal-giulia"]["lc6231"];
  assert.equal(su.start.dateTime, "2026-11-10T10:00:00");
  assert.equal(su.start.timeZone, "Europe/Rome");
  assert.equal(su.extendedProperties.private.gestionale, "b1");
  // rimandato uguale (es. dopo un riavvio senza memoria del gcal): 409 → PATCH, nessun doppione
  r = await chiama(st, "/api/gcal?action=spingi", { method: "POST", body: { eventi: [{ ...ev, title: "Anna Rossi · Piega e colore" }] } });
  assert.equal(r.body.esiti.b1.ok, true);
  assert.equal(Object.keys(st.google.eventi["cal-giulia"]).length, 1);
  assert.equal(st.google.eventi["cal-giulia"]["lc6231"].summary, "Anna Rossi · Piega e colore");
  // aggiornamento normale: PATCH; cambio operatore → move nel calendario nuovo
  r = await chiama(st, "/api/gcal?action=spingi", { method: "POST", body: { eventi: [{ ...ev, gid: "lc6231", primaCal: "cal-giulia", cal: "cal-altro", start: "11:00", end: "11:30" }] } });
  assert.equal(r.body.esiti.b1.ok, true);
  assert.equal(st.google.eventi["cal-giulia"]["lc6231"], undefined);
  assert.equal(st.google.eventi["cal-altro"]["lc6231"].start.dateTime, "2026-11-10T11:00:00");
  // un PATCH su un evento sparito da Google lo ricrea
  delete st.google.eventi["cal-altro"]["lc6231"];
  r = await chiama(st, "/api/gcal?action=spingi", { method: "POST", body: { eventi: [{ ...ev, gid: "lc6231", primaCal: "cal-altro", cal: "cal-altro" }] } });
  assert.equal(r.body.esiti.b1.ok, true);
  assert.ok(st.google.eventi["cal-altro"]["lc6231"]);
  // calendario non abbinato: rifiutato
  r = await chiama(st, "/api/gcal?action=spingi", { method: "POST", body: { eventi: [{ ...ev, cal: "festivi" }] } });
  assert.equal(r.body.esiti.b1.ok, false);
});

test("da Google al gestionale: eventi nel periodo, quelli spostati e quelli cancellati", async () => {
  const st = scenario(); collegato(st);
  await chiama(st, "/api/gcal?action=config", { method: "POST", body: { attivo: true, mappa: { op: { a1: "cal-giulia" } } } });
  st.google.eventi["cal-giulia"] = {
    lc6231: { id: "lc6231", summary: "Anna Rossi · Piega", start: { dateTime: "2026-11-11T15:00:00+01:00" }, end: { dateTime: "2026-11-11T15:30:00+01:00" }, updated: "2026-11-05T09:00:00.000Z", extendedProperties: { private: { gestionale: "b1" } } },
    compleanno: { id: "compleanno", summary: "Compleanno mamma", start: { date: "2026-11-12" }, end: { date: "2026-11-13" }, updated: "2026-10-01T00:00:00Z" },
    fornitore: { id: "fornitore", summary: "Rappresentante", start: { dateTime: "2026-11-12T09:00:00+01:00" }, end: { dateTime: "2026-11-12T09:45:00+01:00" }, location: "In salone", updated: "2026-10-02T00:00:00Z", htmlLink: "https://calendar.google.com/x" },
    fuori: { id: "fuori", summary: "Fuori periodo", start: { dateTime: "2026-12-24T09:00:00+01:00" }, end: { dateTime: "2026-12-24T09:45:00+01:00" } },
  };
  const r = await chiama(st, "/api/gcal?action=eventi", { method: "POST", body: { da: "2026-11-09", a: "2026-11-15", noti: [{ gid: "lc6231", cal: "cal-giulia" }, { gid: "lc6232", cal: "cal-giulia" }] } });
  assert.equal(r.status, 200);
  assert.equal(r.body.calendari["cal-giulia"], true);
  const perId = Object.fromEntries(r.body.eventi.map((e) => [e.gid, e]));
  // il nostro, spostato su Google
  assert.equal(perId.lc6231.locale, "b1");
  assert.deepEqual([perId.lc6231.date, perId.lc6231.start, perId.lc6231.end], ["2026-11-11", "15:00", "15:30"]);
  // tutto il giorno
  assert.equal(perId.compleanno.allDay, true); assert.equal(perId.compleanno.date, "2026-11-12"); assert.equal(perId.compleanno.locale, "");
  // creato su Google, con orario
  assert.deepEqual([perId.fornitore.start, perId.fornitore.end, perId.fornitore.place, perId.fornitore.link], ["09:00", "09:45", "In salone", "https://calendar.google.com/x"]);
  assert.equal(perId.fuori, undefined, "fuori dal periodo chiesto");
  // il noto che non c'è più: cancellato
  assert.deepEqual(r.body.noti.lc6232, { cancellato: true });
  assert.equal(r.body.noti.lc6231, undefined, "quello visto nel periodo non si richiede");
  // cancellazione da qui
  const e = await chiama(st, "/api/gcal?action=elimina", { method: "POST", body: { eventi: [{ gid: "fornitore", cal: "cal-giulia" }, { gid: "giàsparito", cal: "cal-giulia" }] } });
  assert.equal(e.body.esiti.fornitore.ok, true);
  assert.equal(e.body.esiti["giàsparito"].ok, true, "già sparito: va bene lo stesso");
  assert.equal(st.google.eventi["cal-giulia"].fornitore, undefined);
});

// ------------------------------------------------------------- feed ICS
test("il feed iCalendar vale solo con il codice segreto e salta gli annullati", async () => {
  const st = scenario();
  const s = (await chiama(st, "/api/agenda-ics?action=stato")).body;
  assert.match(s.url, /^https:\/\/portale\.test\/api\/agenda-ics\?k=[A-Za-z0-9_-]{20,}$/);
  const k = new URL(s.url).searchParams.get("k");
  assert.equal((await chiama(st, "/api/agenda-ics", { auth: false })).status, 403);
  assert.equal((await chiama(st, "/api/agenda-ics?k=" + "x".repeat(40), { auth: false })).status, 403);
  const f = await chiama(st, "/api/agenda-ics?k=" + k, { auth: false });
  assert.equal(f.status, 200);
  assert.match(f.headers.get("Content-Type"), /text\/calendar/);
  assert.match(f.body, /BEGIN:VCALENDAR/);
  assert.match(f.body, /SUMMARY:Anna Rossi · Piega/);
  assert.match(f.body, /DTSTART;TZID=Europe\/Rome:20261110T100000/);
  assert.match(f.body, /Operatore: Giulia/);
  assert.doesNotMatch(f.body, /Annullata/);
  // rigenerato: il vecchio non vale più
  const n = (await chiama(st, "/api/agenda-ics?action=rigenera", { method: "POST", body: {} })).body;
  assert.notEqual(n.url, s.url);
  assert.equal((await chiama(st, "/api/agenda-ics?k=" + k, { auth: false })).status, 403);
  assert.equal((await chiama(st, "/api/agenda-ics?k=" + new URL(n.url).searchParams.get("k"), { auth: false })).status, 200);
});
