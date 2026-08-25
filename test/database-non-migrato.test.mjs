// Un database su cui non è ancora stata eseguita migrazione-risorse.sql non ha
// la colonna `impegni` in prenotazioni_online. Nominarla faceva fallire la
// query, e la pagina pubblica leggeva l'errore come "nessun orario disponibile"
// su ogni servizio e ogni data, mentre il gestionale continuava a funzionare.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";

const h = (hh, mm = 0) => hh * 60 + mm;
const GIORNO = "2030-06-12"; // mercoledì
const WD = 3;
const AID = "az1";

const SERVIZI = [
  { id: "piega", name: "Piega", durationMin: 30 },
  { id: "colore", name: "Colore", durationMin: 90, impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 10 },
    { tipo: "operatore", posto: 1, da: 50, durata: 40 },
  ] },
];

function scenario({ migrato }) {
  const config = {
    services: SERVIZI,
    staff: [{ id: "sara", name: "Sara", serviceIds: ["piega", "colore"], availability: { [WD]: [[h(9), h(19)]] } }],
    cabine: [], closures: [],
    onlineBooking: { mode: "antivuoto", leadHours: 0, horizonDays: 30 },
  };
  return { migrato, config, righe: [],
    aziende: { [AID]: { id: AID, denominazione: "Centro Test", attiva: 1, licenza_scadenza: "2099-01-01", moduli: JSON.stringify(["online", "opinf"]) } },
    dati: { config, bookings: [], clients: [], eventi: [] } };
}

// Finto D1 che si comporta come quello non migrato: qualunque istruzione
// nomini `impegni` fallisce, esattamente come fa SQLite.
function db(st) {
  return { prepare(sql) {
    if (!st.migrato && /impegni/.test(sql)) {
      return { bind() { return this; },
        async first() { throw new Error("D1_ERROR: no such column: impegni"); },
        async all() { throw new Error("D1_ERROR: no such column: impegni"); },
        async run() { throw new Error("D1_ERROR: table prenotazioni_online has no column named impegni"); } };
    }
    let a = [];
    const self = {
      bind(...x) { a = x; return self; },
      async first() {
        if (sql.startsWith("SELECT * FROM aziende")) return st.aziende[a[0]] || null;
        if (sql.includes("FROM dati_app")) { const v = st.dati[a[1]]; return v === undefined ? null : { dati: JSON.stringify(v) }; }
        if (sql.includes("FROM prenotazioni_online WHERE id")) return st.righe.find((r) => r.id === a[0]) || null;
        return null;
      },
      async all() {
        if (sql.includes("FROM prenotazioni_online")) return { results: st.righe.filter((r) => r.data === a[1] && r.stato === "attiva") };
        return { results: [] };
      },
      async run() {
        if (sql.startsWith("INSERT INTO prenotazioni_online")) {
          const r = { id: a[0], azienda_id: a[1], data: a[2], start_min: a[3], end_min: a[4], service_id: a[5], staff_id: a[6], stato: "attiva" };
          if (/impegni/.test(sql)) r.impegni = a[12];
          st.righe.push(r);
        }
        return { success: true };
      },
    };
    return self;
  } };
}

async function chiama(st, path, { method = "GET", body } = {}) {
  const res = await onRequest({
    request: new Request("https://x" + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }),
    env: { DB: db(st), SETUP_TOKEN: "x" },
    params: { path: path.replace(/^\/api\/?/, "").split("?")[0].split("/").filter(Boolean) },
  });
  return { status: res.status, body: await res.json() };
}
const slots = async (st, servizio) => (await chiama(st, `/api/prenota/${AID}/slots?date=${GIORNO}&service=${servizio}`)).body.slots;
const prenota = (st, servizio, start) =>
  chiama(st, `/api/prenota/${AID}`, { method: "POST", body: { date: GIORNO, service: servizio, start, name: "Anna Rossi", phone: "3401112233" } });

for (const migrato of [true, false]) {
  const come = migrato ? "migrato" : "non migrato";
  test(`database ${come}: gli orari online ci sono su ogni servizio`, async () => {
    const st = scenario({ migrato });
    for (const s of ["piega", "colore"]) {
      const liberi = await slots(st, s);
      assert.ok(liberi.length > 0, `nessun orario per ${s}`);
      assert.equal(liberi[0].label, "09:00");
    }
  });

  test(`database ${come}: la prenotazione si conferma e occupa il posto`, async () => {
    const st = scenario({ migrato });
    assert.equal((await prenota(st, "colore", h(9))).status, 200);
    assert.equal(st.righe.length, 1);
    const dopo = (await slots(st, "colore")).map((x) => x.label);
    assert.ok(!dopo.includes("09:00"), "l'orario appena preso non viene più offerto");
    assert.ok(dopo.length > 0, "il resto della giornata resta prenotabile");
  });
}

test("con la migrazione gli impegni vengono salvati fase per fase", async () => {
  const st = scenario({ migrato: true });
  await prenota(st, "colore", h(9));
  assert.deepEqual(JSON.parse(st.righe[0].impegni), [
    { tipo: "operatore", risorsaId: "sara", from: h(9), to: h(9, 10) },
    { tipo: "operatore", risorsaId: "sara", from: h(9, 50), to: h(10, 30) },
  ]);
});

test("senza migrazione la prenotazione resta salvata, senza le fasi", async () => {
  const st = scenario({ migrato: false });
  await prenota(st, "colore", h(9));
  assert.equal(st.righe[0].impegni, undefined);
  assert.equal(st.righe[0].start_min, h(9));
  assert.equal(st.righe[0].end_min, h(10, 30));
  // senza fasi l'operatore risulta occupato per tutta la durata: la posa non
  // viene rivenduta, che è il comportamento prudente.
  const liberi = (await slots(st, "piega")).map((x) => x.label);
  assert.ok(!liberi.includes("09:15"), "la posa non viene offerta finché manca la colonna");
  assert.ok(liberi.includes("10:30"), "dopo il colore si prenota normalmente");
});

test("un errore inatteso torna come JSON, non come crash", async () => {
  const rotto = { prepare() { throw new Error("boom"); } };
  const res = await onRequest({
    request: new Request("https://x/api/prenota/" + AID),
    env: { DB: rotto, SETUP_TOKEN: "x" },
    params: { path: ["prenota", AID] },
  });
  assert.equal(res.status, 500);
  const b = await res.json();
  assert.match(b.error, /Errore interno/);
});
