// Prenotazione online dei servizi a risorse: cabina senza operatore, servizio
// con posa e servizio a due operatori, passando dalla rotta pubblica.
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
  { id: "lampada", name: "Lampada", durationMin: 60, impegni: [{ tipo: "cabina", cabinaId: "cab-lampada", da: 0, durata: 60 }] },
  { id: "spa", name: "Spa", durationMin: 180, impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 60 },
    { tipo: "operatore", posto: 2, da: 170, durata: 10 },
    { tipo: "cabina", cabinaId: "cab-spa", da: 0, durata: 180 },
  ] },
];
const IDS = SERVIZI.map((s) => s.id);

function scenario(mode = "griglia", staff = ["sara", "federica"]) {
  const config = {
    services: SERVIZI,
    staff: staff.map((id) => ({ id, name: id, serviceIds: IDS, availability: { [WD]: [[h(9), h(19)]] } })),
    cabine: [{ id: "cab-lampada", name: "Lampada" }, { id: "cab-spa", name: "Spa" }],
    closures: [],
    onlineBooking: { mode, leadHours: 0, horizonDays: 30 },
  };
  return { config, aziende: { [AID]: { id: AID, denominazione: "Centro Test", attiva: 1, licenza_scadenza: "2099-01-01", moduli: JSON.stringify(["online", "opinf"]) } },
    dati: { config, bookings: [], clients: [], eventi: [] }, online: [], inserite: [] };
}

function db(st) {
  return { prepare(sql) {
    let a = [];
    const self = {
      bind(...x) { a = x; return self; },
      async first() {
        if (sql.startsWith("SELECT * FROM aziende")) return st.aziende[a[0]] || null;
        if (sql.includes("FROM dati_app")) { const v = st.dati[a[1]]; return v === undefined ? null : { dati: JSON.stringify(v) }; }
        return null;
      },
      async all() {
        if (sql.includes("FROM prenotazioni_online")) return { results: st.online.map((o) => ({ id: o.id, staff_id: o.staffId, start_min: o.startMin, end_min: o.endMin, impegni: JSON.stringify(o.impegni || []) })) };
        return { results: [] };
      },
      async run() {
        if (sql.startsWith("INSERT INTO prenotazioni_online")) {
          const r = { id: a[0], startMin: a[3], endMin: a[4], serviceId: a[5], staffId: a[6], impegni: JSON.parse(a[12] || "[]") };
          st.inserite.push(r); st.online.push(r);
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
const slots = async (st, servizio) => (await chiama(st, `/api/prenota/${AID}/slots?date=${GIORNO}&service=${servizio}`)).body.slots.map((s) => s.label);
const prenota = (st, servizio, start, nome = "Anna Rossi") =>
  chiama(st, `/api/prenota/${AID}`, { method: "POST", body: { date: GIORNO, service: servizio, start, name: nome, phone: "3401112233" } });

test("i servizi a risorse compaiono tra quelli prenotabili online", async () => {
  const st = scenario();
  const info = (await chiama(st, `/api/prenota/${AID}`)).body;
  assert.deepEqual(info.services.map((s) => s.id).sort(), ["colore", "lampada", "piega", "spa"]);
  assert.equal(info.services.find((s) => s.id === "spa").durationMin, 180);
});

test("la lampada è prenotabile online senza impegnare operatori", async () => {
  const st = scenario();
  assert.ok((await slots(st, "lampada")).includes("09:00"));
  const r = await prenota(st, "lampada", h(9));
  assert.equal(r.status, 200);
  assert.deepEqual(st.inserite[0].impegni, [{ tipo: "cabina", risorsaId: "cab-lampada", from: h(9), to: h(10) }]);
  assert.equal(st.inserite[0].staffId, null, "nessun operatore impegnato");
  // la cabina è una sola: il secondo cliente non trova posto alle 9
  assert.ok(!(await slots(st, "lampada")).includes("09:00"));
  assert.ok((await slots(st, "lampada")).includes("10:00"));
  // gli operatori restano liberi per altro
  assert.ok((await slots(st, "piega")).includes("09:00"));
});

test("durante la posa del colore l'operatore torna disponibile online", async () => {
  const st = scenario("griglia", ["sara"]);
  const r = await prenota(st, "colore", h(9));
  assert.equal(r.status, 200);
  assert.deepEqual(st.inserite[0].impegni, [
    { tipo: "operatore", risorsaId: "sara", from: h(9), to: h(9, 10) },
    { tipo: "operatore", risorsaId: "sara", from: h(9, 50), to: h(10, 30) },
  ]);
  const dopo = await slots(st, "piega");
  assert.ok(dopo.includes("09:15"), "nella posa (9:10-9:50) entra una piega da 30'");
  assert.ok(!dopo.includes("09:00"), "l'applicazione del colore occupa davvero");
  assert.ok(!dopo.includes("10:00"), "la seconda parte del colore occupa davvero");
});

test("la spa impegna due operatori e tiene la cabina per tutte e tre le ore", async () => {
  const st = scenario();
  const r = await prenota(st, "spa", h(9));
  assert.equal(r.status, 200);
  const imp = st.inserite[0].impegni;
  assert.deepEqual(imp.filter((i) => i.tipo === "operatore").map((i) => i.risorsaId).sort(), ["federica", "sara"]);
  assert.deepEqual(imp.find((i) => i.tipo === "cabina"), { tipo: "cabina", risorsaId: "cab-spa", from: h(9), to: h(12) });
  // dalle 10 alle 11:50 nessun operatore è impegnato, ma la cabina sì
  assert.ok(!(await slots(st, "spa")).includes("10:30"));
  // sara è di nuovo libera dalle 10: una piega si prenota
  assert.ok((await slots(st, "piega")).includes("10:30"));
});

test("con un solo operatore la spa non viene proposta online", async () => {
  const st = scenario("griglia", ["sara"]);
  assert.deepEqual(await slots(st, "spa"), []);
  const r = await prenota(st, "spa", h(9));
  assert.equal(r.status, 409, "e non è nemmeno confermabile");
});

test("la modalità ottimizzata giudica anche la cabina", async () => {
  const st = scenario("ottimizzata");
  // lampada da 60' con la cabina libera 9-19: propone i bordi, non il mezzo
  const out = await slots(st, "lampada");
  assert.ok(out.includes("09:00") && out.includes("18:00"));
  assert.ok(!out.includes("12:00"), "gli orari centrali spezzerebbero in due la cabina");
});

test("un servizio a risorse resta prenotabile anche in anti-vuoto", async () => {
  const st = scenario("antivuoto");
  assert.deepEqual(await slots(st, "lampada"), ["09:00"]);
  await prenota(st, "lampada", h(9));
  assert.deepEqual(await slots(st, "lampada"), ["10:00"], "ci si accoda a ciò che finisce");
});

test("un servizio a sola cabina è segnalato come senza operatore", async () => {
  const st = scenario();
  const info = (await chiama(st, `/api/prenota/${AID}`)).body;
  const dai = (id) => info.services.find((s) => s.id === id);
  assert.equal(dai("lampada").senzaOperatore, true, "il mini-sito non deve chiedere l'operatore");
  assert.equal(dai("spa").senzaOperatore, undefined);
  assert.equal(dai("piega").senzaOperatore, undefined);
});
