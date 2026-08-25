// Quantità delle cabine: se di una tipologia ce ne sono due, la seconda resta
// utilizzabile mentre la prima è occupata. La terza prenotazione no.
import { test } from "node:test";
import assert from "node:assert/strict";
import { orariPossibili, assegnaRisorse, impegniServizi, capacitaRisorsa, spaziLiberiRisorsa, occupazioneDelGiorno } from "../src/orari.js";
import { onRequest } from "../functions/api/[[path]].js";

const h = (hh, mm = 0) => hh * 60 + mm;
const GIORNO = "2030-06-12"; // mercoledì
const WD = 3;
const AID = "az1";

const LAMPADA = { id: "lampada", name: "Lampada", durationMin: 60, impegni: [{ tipo: "cabina", cabinaId: "cab-lampada", da: 0, durata: 60 }] };
const PIEGA = { id: "piega", name: "Piega", durationMin: 30 };
const SERVIZI = [LAMPADA, PIEGA];
const IDS = SERVIZI.map((s) => s.id);

const salone = (quantita) => ({
  services: SERVIZI,
  staff: [{ id: "sara", name: "Sara", serviceIds: IDS, availability: { [WD]: [[h(9), h(19)]] } }],
  cabine: [{ id: "cab-lampada", name: "Lampada", quantita }],
  closures: [],
});
// Una lampada già in agenda, sulla cabina, senza operatore.
const lampada = (id, da) => ({ id, date: GIORNO, staffId: null, startMin: da, endMin: da + 60,
  impegni: [{ tipo: "cabina", risorsaId: "cab-lampada", from: da, to: da + 60 }] });
const ore = (cfg, ids, bk, opts) => orariPossibili(cfg, ids, GIORNO, bk, opts)
  .map((s) => `${String(Math.floor(s.start / 60)).padStart(2, "0")}:${String(s.start % 60).padStart(2, "0")}`);

// ---- capacità dichiarata ---------------------------------------------------
test("la capacità è quella dichiarata sulla cabina, e vale 1 per tutto il resto", () => {
  assert.equal(capacitaRisorsa(salone(2), "cab-lampada"), 2);
  assert.equal(capacitaRisorsa(salone(undefined), "cab-lampada"), 1, "senza quantità è una sola");
  assert.equal(capacitaRisorsa(salone(0), "cab-lampada"), 1, "zero non ha senso: almeno una");
  assert.equal(capacitaRisorsa(salone(2), "sara"), 1, "di un operatore ce n'è sempre uno");
});

// ---- la seconda unità si usa ----------------------------------------------
test("con due cabine la seconda è libera mentre la prima è occupata", () => {
  const cfg = salone(2);
  const dopoUna = ore(cfg, ["lampada"], [lampada("l1", h(9))]);
  assert.ok(dopoUna.includes("09:00"), "resta una cabina libera alle 9");
  const dopoDue = ore(cfg, ["lampada"], [lampada("l1", h(9)), lampada("l2", h(9))]);
  assert.ok(!dopoDue.includes("09:00"), "con entrambe occupate alle 9 non si entra");
  assert.ok(dopoDue.includes("10:00"), "ma alle 10 si liberano tutte e due");
});

test("con una sola cabina il comportamento è quello di sempre", () => {
  const dopoUna = ore(salone(1), ["lampada"], [lampada("l1", h(9))]);
  assert.ok(!dopoUna.includes("09:00"));
  assert.ok(dopoUna.includes("10:00"));
});

test("conta la punta di sovrapposizione, non quante prenotazioni ci sono", () => {
  const cfg = salone(2);
  // 9:00-10:00 e 9:30-10:30: entrambe impegnate solo fra 9:30 e 10:00.
  const liberi = ore(cfg, ["lampada"], [lampada("l1", h(9)), lampada("l2", h(9, 30))]);
  assert.ok(!liberi.includes("09:00"), "un'ora dalle 9 attraverserebbe il tratto saturo");
  assert.ok(!liberi.includes("09:45"), "anche 9:45-10:45 lo attraversa");
  assert.ok(liberi.includes("10:30"), "dalle 10:30 sono di nuovo entrambe libere");
  // due prenotazioni che non si toccano non saturano nulla
  const sparse = ore(cfg, ["lampada"], [lampada("l1", h(9)), lampada("l2", h(11))]);
  assert.ok(sparse.includes("09:00") && sparse.includes("11:00"), "resta sempre una unità libera");
});

test("il tratto saturo è quello in cui tutte le unità sono prese", () => {
  const cfg = salone(2);
  const occ = occupazioneDelGiorno([lampada("l1", h(9)), lampada("l2", h(9, 30))], GIORNO);
  const spazi = spaziLiberiRisorsa(cfg, GIORNO, "cab-lampada", occ, null);
  // saturo solo 9:30-10:00
  assert.ok(spazi.some((s) => s.from <= h(9) && s.to >= h(9, 30)), "prima delle 9:30 c'è spazio");
  assert.ok(!spazi.some((s) => s.from < h(10) && s.to > h(9, 30)), "9:30-10:00 non è spazio libero");
  assert.ok(spazi.some((s) => s.from <= h(10) && s.to >= h(19)), "dalle 10 in poi è tutto libero");
});

test("assegnaRisorse conferma la seconda cabina anche con la prima occupata", () => {
  const cfg = salone(2);
  const occ = occupazioneDelGiorno([lampada("l1", h(9))], GIORNO);
  const esito = assegnaRisorse(cfg, impegniServizi(["lampada"], cfg.services).impegni, ["lampada"], GIORNO, h(9), occ, {});
  assert.ok(esito, "assegnazione riuscita");
  assert.deepEqual(esito.impegni, [{ tipo: "cabina", risorsaId: "cab-lampada", from: h(9), to: h(10) }]);
});

// ---- online: le tre modalità -----------------------------------------------
function scenario(mode, quantita) {
  const config = { ...salone(quantita), onlineBooking: { mode, leadHours: 0, horizonDays: 30 } };
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
const prenota = (st, servizio, start) =>
  chiama(st, `/api/prenota/${AID}`, { method: "POST", body: { date: GIORNO, service: servizio, start, name: "Anna Rossi", phone: "3401112233" } });

for (const mode of ["antivuoto", "griglia", "ottimizzata"]) {
  test(`online (${mode}): due clienti alle 9 con due cabine, il terzo no`, async () => {
    const st = scenario(mode, 2);
    assert.equal((await prenota(st, "lampada", h(9))).status, 200);
    assert.ok((await slots(st, "lampada")).includes("09:00"), "la seconda unità è ancora offerta");
    assert.equal((await prenota(st, "lampada", h(9))).status, 200, "e si può confermare");
    assert.ok(!(await slots(st, "lampada")).includes("09:00"), "ora sono sature");
    assert.equal((await prenota(st, "lampada", h(9))).status, 409, "il terzo viene respinto");
  });
}

test("online: con una cabina sola il secondo cliente alle 9 viene respinto", async () => {
  const st = scenario("griglia", 1);
  assert.equal((await prenota(st, "lampada", h(9))).status, 200);
  assert.equal((await prenota(st, "lampada", h(9))).status, 409);
});
