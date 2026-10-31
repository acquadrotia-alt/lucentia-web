// Installazione cliente (MODALITA=cliente): la licenza arriva dal portale,
// viene copiata nella riga del salone e tiene in piedi il gestionale anche
// se il portale non risponde, entro la tolleranza. Portale e database simulati.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";
import { azzeraMemo, INTERVALLO_MS, TOLLERANZA_MS } from "../server/cliente/licenza.js";

const AID = "inst-1";
const h = (hh, mm = 0) => hh * 60 + mm;

function scenario() {
  const config = {
    services: [{ id: "piega", name: "Piega", durationMin: 30, price: 18 }],
    staff: [{ id: "a1", name: "Giulia", serviceIds: ["piega"], availability: { 3: [[h(9), h(12)]] } }],
    branding: { name: "Bellezza & Stile", primary: "#0d9488", phone: "333 1234567" },
    sito: { descrizione: "Dal 1998" },
    closures: [],
  };
  return {
    azienda: { id: AID, denominazione: "Bellezza & Stile", attiva: 1, licenza_scadenza: "2020-01-01", moduli: JSON.stringify([]), demo: 0 },
    dati: { config, bookings: [], clients: [], eventi: [] },
    licenzaLocale: null,
    sessione: null,
    portale: { stato: 200, body: { ok: true, stato: "active", attiva: true, licenza_scadenza: "2030-12-31", moduli: ["fidelity", "online", "opinf"], nome: "Bellezza & Stile" } },
    chiamatePortale: [],
  };
}

function db(st) {
  return {
    prepare(sql) {
      let a = [];
      const self = {
        bind(...x) { a = x; return self; },
        async first() {
          if (sql.includes("FROM sessioni s JOIN utenti u")) return st.sessione && a[0] === "tok" ? st.sessione : null;
          if (sql.startsWith("SELECT * FROM aziende")) return st.azienda && (!a.length || a[0] === AID) ? st.azienda : null;
          if (sql.startsWith("SELECT * FROM licenza_locale")) return st.licenzaLocale;
          if (sql.includes("FROM dati_app")) { const v = st.dati[a[1]]; return v === undefined ? null : { dati: JSON.stringify(v) }; }
          return null;
        },
        async all() { return { results: [] }; },
        async run() {
          if (sql.startsWith("INSERT INTO licenza_locale")) {
            const prev = st.licenzaLocale || {};
            st.licenzaLocale = { id: "hub", dati: a[0], verificata_il: a[1] != null ? a[1] : prev.verificata_il, tentata_il: a[2] };
          } else if (sql.startsWith("UPDATE licenza_locale SET verificata_il = NULL")) {
            if (st.licenzaLocale) st.licenzaLocale.verificata_il = null;
          } else if (sql.startsWith("UPDATE aziende SET licenza_scadenza = ?, attiva = ?, moduli = ?")) {
            st.azienda = { ...st.azienda, licenza_scadenza: a[0], attiva: a[1], moduli: a[2] };
          }
          return { success: true };
        },
      };
      return self;
    },
  };
}

const ENV = (st) => ({ DB: db(st), SETUP_TOKEN: "x", MODALITA: "cliente", HUB_URL: "https://portale.test", INSTALLAZIONE_ID: AID, INSTALLAZIONE_CHIAVE: "k".repeat(64) });

function finsioneFetch(st) {
  return async (url, init) => {
    st.chiamatePortale.push({ url: String(url), body: JSON.parse(init.body) });
    if (st.portale.errore) throw new Error(st.portale.errore);
    return new Response(JSON.stringify(st.portale.body), { status: st.portale.stato, headers: { "Content-Type": "application/json" } });
  };
}

async function chiama(st, path, { method = "GET", body, auth = false, env } = {}) {
  const fetchVero = globalThis.fetch;
  globalThis.fetch = finsioneFetch(st);
  try {
    const res = await onRequest({
      request: new Request("https://salone.test" + path, { method, headers: { "Content-Type": "application/json", ...(auth ? { Cookie: "sid=tok" } : {}) }, body: body ? JSON.stringify(body) : undefined }),
      env: env || ENV(st),
      params: { path: path.replace(/^\/api\/?/, "").split("?")[0].split("/").filter(Boolean) },
    });
    return { status: res.status, body: await res.json() };
  } finally { globalThis.fetch = fetchVero; }
}
const titolare = { token: "tok", scadenza: "2099-01-01T00:00:00.000Z", uid: "u1", email: "titolare@x.it", ruolo: "azienda", azienda_id: AID, nome: "Titolare", staff_id: null, reseller_parent: null };

beforeEach(() => azzeraMemo());

test("alla prima richiesta la licenza arriva dal portale e finisce nella riga del salone", async () => {
  const st = scenario();
  assert.equal(st.azienda.licenza_scadenza, "2020-01-01", "nel database locale la licenza risulta scaduta…");
  const r = await chiama(st, "/api/installazione");
  assert.equal(r.body.modalita, "cliente");
  assert.equal(r.body.stato, "active", "…ma vale quello che dice il portale");
  assert.equal(r.body.online, true);
  assert.equal(r.body.salone.brandName, "Bellezza & Stile");
  assert.equal(r.body.salone.primary, "#0d9488");
  assert.equal(r.body.licenza.stato, "ok");
  assert.equal(st.azienda.licenza_scadenza, "2030-12-31");
  assert.deepEqual(JSON.parse(st.azienda.moduli), ["fidelity", "online", "opinf"]);
  // l'installazione si è presentata con id, chiave, versione e dominio
  const c = st.chiamatePortale[0];
  assert.equal(c.url, "https://portale.test/api/licenze/verifica");
  assert.equal(c.body.id, AID);
  assert.equal(c.body.dominio, "salone.test");
  assert.ok(c.body.versione);
  assert.ok(Array.isArray(c.body.moduli_disponibili));
});

test("il portale non viene interrogato a ogni richiesta: vale la copia locale per qualche ora", async () => {
  const st = scenario();
  await chiama(st, "/api/installazione");
  azzeraMemo(); // come se fosse un altro isolate: resta la cache nel database
  await chiama(st, "/api/installazione");
  await chiama(st, "/api/sito");
  assert.equal(st.chiamatePortale.length, 1);
  // passato l'intervallo, si richiama
  st.licenzaLocale.verificata_il = new Date(Date.now() - INTERVALLO_MS - 1000).toISOString();
  azzeraMemo();
  await chiama(st, "/api/installazione");
  assert.equal(st.chiamatePortale.length, 2);
});

test("portale irraggiungibile: si lavora con l'ultima licenza buona, poi si chiude", async () => {
  const st = scenario();
  await chiama(st, "/api/installazione"); // esito buono in cache
  st.portale.errore = "rete giù";
  st.licenzaLocale.verificata_il = new Date(Date.now() - INTERVALLO_MS - 1000).toISOString();
  azzeraMemo();
  let r = await chiama(st, "/api/installazione");
  assert.equal(r.body.stato, "active", "entro la tolleranza il salone lavora");
  assert.match(r.body.licenza.dettaglio, /tolleranza/);
  // oltre la tolleranza → manutenzione
  st.licenzaLocale.verificata_il = new Date(Date.now() - TOLLERANZA_MS - 1000).toISOString();
  azzeraMemo();
  r = await chiama(st, "/api/installazione");
  assert.equal(r.body.stato, "non_verificata");
  assert.equal(r.body.salone.brandName, "Bellezza & Stile", "il brand resta: serve alla pagina di manutenzione");
  assert.equal((await chiama(st, "/api/sito")).status, 503);
});

test("chiave rifiutata dal portale: tutto in manutenzione, anche col titolare loggato", async () => {
  const st = scenario();
  st.portale = { stato: 401, body: { error: "chiave non valida" } };
  st.sessione = titolare;
  const r = await chiama(st, "/api/installazione");
  assert.equal(r.body.stato, "rifiutata");
  const me = await chiama(st, "/api/me", { auth: true });
  assert.equal(me.body.azienda.stato, "rifiutata");
  const d = await chiama(st, "/api/data/config", { auth: true });
  assert.equal(d.status, 403);
  assert.equal(d.body.stato, "rifiutata");
});

test("sospesa o scaduta sul portale → sito in manutenzione e dati bloccati", async () => {
  const st = scenario();
  st.portale.body = { ...st.portale.body, stato: "disabled", attiva: false };
  st.sessione = titolare;
  assert.equal((await chiama(st, "/api/installazione")).body.stato, "disabled");
  assert.equal((await chiama(st, "/api/sito")).status, 503);
  assert.equal((await chiama(st, "/api/data/bookings", { auth: true })).status, 403);
  assert.equal((await chiama(st, "/api/prenota/" + AID)).status, 404);
});

test("i moduli accesi dal portale arrivano al gestionale e al sito", async () => {
  const st = scenario();
  st.sessione = titolare;
  const me = await chiama(st, "/api/me", { auth: true });
  assert.deepEqual(me.body.azienda.moduli, ["fidelity", "online", "opinf"]);
  assert.equal(me.body.installazione.portale, true);
  const sito = await chiama(st, "/api/sito");
  assert.equal(sito.status, 200);
  assert.equal(sito.body.prenotazioniOnline, true);
  assert.equal(sito.body.listino[0].name, "Piega");
  assert.equal(sito.body.salone.id, AID);
  // con "online" acceso il link di prenotazione risponde
  const pre = await chiama(st, "/api/prenota/" + AID);
  assert.equal(pre.status, 200);
  assert.equal(pre.body.services[0].id, "piega");
});

test("il titolare può forzare una nuova verifica", async () => {
  const st = scenario();
  st.sessione = titolare;
  await chiama(st, "/api/installazione");
  assert.equal(st.chiamatePortale.length, 1);
  const r = await chiama(st, "/api/licenza/verifica-ora", { method: "POST", auth: true });
  assert.equal(r.status, 200);
  assert.equal(r.body.licenza.stato, "ok");
  assert.equal(st.chiamatePortale.length, 2);
});

test("senza HUB_URL la licenza è quella locale (sviluppo o emergenza)", async () => {
  const st = scenario();
  st.azienda.licenza_scadenza = "2099-01-01";
  const r = await chiama(st, "/api/installazione", { env: { DB: db(st), SETUP_TOKEN: "x", MODALITA: "cliente" } });
  assert.equal(r.body.stato, "active");
  assert.equal(r.body.licenza.stato, "locale");
  assert.equal(st.chiamatePortale.length, 0);
});

test("prima del setup l'installazione lo dice, e il setup crea il salone con l'id dell'installazione", async () => {
  const st = scenario();
  st.azienda = null;
  assert.equal((await chiama(st, "/api/installazione")).body.stato, "setup");
  let creato = null;
  const env = ENV(st);
  const dbVero = env.DB;
  env.DB = { prepare(sql) { const s = dbVero.prepare(sql); const run = s.run; s.run = async () => { if (sql.startsWith("INSERT INTO aziende")) creato = sql; return run(); }; return s; } };
  const r = await chiama(st, "/api/setup", { method: "POST", body: { token: "x", denominazione: "Nuovo Salone", email: "t@x.it", password: "segreta" }, env });
  assert.equal(r.status, 200);
  assert.equal(r.body.id, AID);
  assert.ok(creato);
  assert.equal((await chiama(st, "/api/setup", { method: "POST", body: { token: "sbagliato", denominazione: "X", email: "t@x.it", password: "segreta" }, env })).status, 403);
});
