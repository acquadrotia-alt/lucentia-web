// Test del modello a risorse: servizi a segmenti, multi-operatore e cabine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { impegniServizio, durataServizio, impegniServizi, postiDi, senzaOperatore,
         impegniBooking, occupazioneDelGiorno, assegnaRisorse, orariPossibili, finestreSalone } from "../src/orari.js";

const h = (hh, mm = 0) => hh * 60 + mm;
const GIORNO = "2030-06-12"; // mercoledì
const WD = 3;
const G = (dal, al) => ({ [WD]: [[dal, al]] });

// Servizi che ricalcano gli esempi del salone
const TAGLIO = { id: "taglio", name: "Taglio", durationMin: 45 };
const COLORE = { id: "colore", name: "Colore", durationMin: 90, impegni: [
  { tipo: "operatore", posto: 1, da: 0, durata: 10 },   // applicazione
  { tipo: "operatore", posto: 1, da: 50, durata: 40 },  // dopo la posa
] };
const LAMPADA = { id: "lampada", name: "Lampada", durationMin: 60, impegni: [
  { tipo: "cabina", cabinaId: "cab-lampada", da: 0, durata: 60 },
] };
const SPA = { id: "spa", name: "Spa e massaggio", durationMin: 180, impegni: [
  { tipo: "operatore", posto: 1, da: 0, durata: 60 },
  { tipo: "operatore", posto: 2, da: 170, durata: 10 },
  { tipo: "cabina", cabinaId: "cab-spa", da: 0, durata: 180 },
] };
const SERVIZI = [TAGLIO, COLORE, LAMPADA, SPA];
const TUTTI = SERVIZI.map((s) => s.id);

const op = (id, extra = {}) => ({ id, name: id, serviceIds: TUTTI, availability: G(h(9), h(19)), ...extra });
const cab = (id, extra = {}) => ({ id, name: id, ...extra });
const salone = (staff, cabine = [cab("cab-lampada"), cab("cab-spa")]) => ({ services: SERVIZI, staff, cabine, closures: [] });
const app = (staffId, da, a) => ({ id: `${staffId}-${da}`, staffId, date: GIORNO, startMin: da, endMin: a });
const orari = (cfg, ids, bk, opts) => orariPossibili(cfg, ids, GIORNO, bk, opts).map((s) => `${String(Math.floor(s.start / 60)).padStart(2, "0")}:${String(s.start % 60).padStart(2, "0")}`);

// ---- Compatibilità: chi non usa le novità non deve accorgersi di nulla -----
test("un servizio senza sequenza resta un blocco unico su un operatore", () => {
  assert.deepEqual(impegniServizio(TAGLIO), [{ tipo: "operatore", posto: 1, da: 0, durata: 45 }]);
  assert.equal(durataServizio(TAGLIO), 45);
  assert.deepEqual(postiDi(impegniServizio(TAGLIO)), [1]);
});

test("un appuntamento salvato senza impegni vale come prima", () => {
  assert.deepEqual(impegniBooking(app("a1", h(9), h(10))), [{ tipo: "operatore", risorsaId: "a1", from: h(9), to: h(10) }]);
});

// ---- Servizio con posa: l'operatore torna libero nel mezzo -----------------
test("durante la posa del colore l'operatore risulta libero", () => {
  const cfg = salone([op("a1")]);
  const posti = orariPossibili(cfg, ["colore"], GIORNO, [], {});
  const alle9 = posti.find((s) => s.start === h(9));
  assert.deepEqual(alle9.impegni, [
    { tipo: "operatore", risorsaId: "a1", from: h(9), to: h(9, 10) },
    { tipo: "operatore", risorsaId: "a1", from: h(9, 50), to: h(10, 30) },
  ]);
  // un taglio da 45' entra dentro la posa (9:10-9:50 è libero... 45' non ci stanno)
  const colore = { ...alle9, id: "c1", date: GIORNO, startMin: h(9), endMin: h(10, 30), staffId: "a1" };
  const conPosa = orari(cfg, ["taglio"], [colore]);
  assert.ok(!conPosa.includes("09:00"), "l'inizio del colore occupa davvero");
  assert.ok(!conPosa.includes("10:00"), "la seconda parte del colore occupa davvero");
  // un servizio da 30' invece ci sta: verifichiamolo con una piega fittizia
  const cfg30 = { ...cfg, services: [...SERVIZI, { id: "piega", name: "Piega", durationMin: 30 }] };
  const st30 = { ...op("a1"), serviceIds: [...TUTTI, "piega"] };
  const piega = orari({ ...cfg30, staff: [st30] }, ["piega"], [colore]);
  assert.ok(piega.includes("09:15"), "nella posa (9:10-9:50) ci sta una piega da 30'");
});

// ---- Servizio a sola cabina, senza operatori -------------------------------
test("la lampada occupa solo la cabina, nessun operatore", () => {
  const imp = impegniServizio(LAMPADA);
  assert.ok(senzaOperatore(imp));
  const cfg = salone([op("a1")]);
  const s = orariPossibili(cfg, ["lampada"], GIORNO, [], {}).find((x) => x.start === h(9));
  assert.deepEqual(s.impegni, [{ tipo: "cabina", risorsaId: "cab-lampada", from: h(9), to: h(10) }]);
  assert.equal(s.staffId, "", "nessun operatore impegnato");
  assert.deepEqual(s.operatori, []);
});

test("la lampada è prenotabile anche senza nessun operatore in servizio", () => {
  const cfg = salone([], [cab("cab-lampada", { availability: G(h(9), h(12)) }), cab("cab-spa")]);
  assert.deepEqual(orari(cfg, ["lampada"], []), ["09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00"]);
});

test("due lampade insieme non stanno: la cabina è una sola", () => {
  const cfg = salone([op("a1")]);
  const primo = orariPossibili(cfg, ["lampada"], GIORNO, [], {}).find((x) => x.start === h(9));
  const bk = [{ id: "l1", date: GIORNO, startMin: h(9), endMin: h(10), staffId: "", impegni: primo.impegni }];
  const dopo = orari(cfg, ["lampada"], bk);
  assert.ok(!dopo.includes("09:00") && !dopo.includes("09:45"), "la cabina è occupata fino alle 10");
  assert.ok(dopo.includes("10:00"));
});

// ---- Servizio multi-operatore ---------------------------------------------
test("la spa impegna due operatori diversi e la cabina per tutta la durata", () => {
  const cfg = salone([op("sara"), op("federica")]);
  const s = orariPossibili(cfg, ["spa"], GIORNO, [], {}).find((x) => x.start === h(9));
  assert.deepEqual(s.impegni, [
    { tipo: "operatore", risorsaId: "sara", from: h(9), to: h(10) },
    { tipo: "cabina", risorsaId: "cab-spa", from: h(9), to: h(12) },
    { tipo: "operatore", risorsaId: "federica", from: h(11, 50), to: h(12) },
  ]);
  assert.deepEqual(s.operatori, ["sara", "federica"]);
  assert.equal(s.staffId, "sara", "il posto 1 resta l'operatore principale");
});

test("con un solo operatore la spa non è prenotabile", () => {
  const cfg = salone([op("sara")]);
  assert.deepEqual(orari(cfg, ["spa"], []), [], "il posto 2 richiede una persona diversa");
});

test("se un operatore non copre la coda, i ruoli vengono scambiati", () => {
  const cfg = salone([op("sara"), op("federica")]);
  // federica è occupata negli ultimi 10 minuti della spa delle 9:00
  const bk = [app("federica", h(11, 45), h(12, 30))];
  const s = orariPossibili(cfg, ["spa"], GIORNO, bk, {}).find((x) => x.start === h(9));
  assert.ok(s, "l'appuntamento sta comunque in piedi");
  assert.deepEqual(s.operatori, ["federica", "sara"], "federica prende la parte iniziale, sara la coda");
});

test("se nessuno copre la coda, l'orario non è proponibile", () => {
  const cfg = salone([op("sara"), op("federica")]);
  const bk = [app("federica", h(11, 45), h(12, 30)), app("sara", h(11, 45), h(12, 30))];
  const out = orari(cfg, ["spa"], bk);
  assert.ok(!out.includes("09:00"), "gli ultimi 10 minuti non li può fare nessuno");
  assert.ok(out.includes("10:00"), "più tardi sono di nuovo libere");
});

// ---- Cabine ----------------------------------------------------------------
test("la cabina della spa è occupata per l'intera durata, non solo quando c'è un operatore", () => {
  const cfg = salone([op("sara"), op("federica"), op("anna")]);
  const s = orariPossibili(cfg, ["spa"], GIORNO, [], {}).find((x) => x.start === h(9));
  const bk = [{ id: "spa1", date: GIORNO, startMin: h(9), endMin: h(12), staffId: "sara", impegni: s.impegni }];
  // dalle 10 alle 11:50 nessun operatore è impegnato dalla spa, ma la cabina sì
  assert.ok(!orari(cfg, ["spa"], bk).includes("10:30"), "la cabina spa è ancora occupata");
  // il taglio invece si fa lo stesso: non usa cabine
  assert.ok(orari(cfg, ["taglio"], bk).includes("10:30"));
});

test("la cabina può avere orari propri più stretti del salone", () => {
  const cfg = salone([op("a1")], [cab("cab-lampada", { availability: G(h(14), h(16)) }), cab("cab-spa")]);
  assert.deepEqual(orari(cfg, ["lampada"], []), ["14:00", "14:15", "14:30", "14:45", "15:00"]);
});

test("una cabina in manutenzione blocca il servizio", () => {
  const cfg = salone([op("a1")], [cab("cab-lampada", { off: [{ from: GIORNO, to: GIORNO }] }), cab("cab-spa")]);
  assert.deepEqual(orari(cfg, ["lampada"], []), []);
});

test("la cabina di default dell'operatore vale quando il servizio non ne indica una", () => {
  const massaggio = { id: "mass", name: "Massaggio", durationMin: 60, impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 60 },
    { tipo: "cabina", da: 0, durata: 60 }, // cabina non indicata: la eredita dall'operatore
  ] };
  const cfg = { services: [massaggio], cabine: [cab("cab-1"), cab("cab-2")], closures: [],
    staff: [{ id: "a1", serviceIds: ["mass"], availability: G(h(9), h(12)), cabinaId: "cab-2" }] };
  const s = orariPossibili(cfg, ["mass"], GIORNO, [], {}).find((x) => x.start === h(9));
  assert.deepEqual(s.cabine, ["cab-2"]);
});

// ---- Regole già esistenti: devono continuare a valere ----------------------
test("chiusure, ferie e orari di lavoro valgono anche col nuovo modello", () => {
  assert.deepEqual(orari({ ...salone([op("a1")]), closures: [{ from: GIORNO, to: GIORNO }] }, ["taglio"], []), []);
  assert.deepEqual(orari(salone([op("a1", { off: [{ from: GIORNO, to: GIORNO }] })]), ["taglio"], []), []);
  const fuoriOrario = salone([op("a1", { availability: { 0: [[h(9), h(12)]] } })]);
  assert.deepEqual(orari(fuoriOrario, ["taglio"], []), [], "mercoledì non lavora");
});

test("un operatore che non sa fare il servizio non viene proposto", () => {
  const cfg = salone([op("a1", { serviceIds: ["taglio"] })]);
  assert.ok(orari(cfg, ["taglio"], []).length > 0);
  assert.deepEqual(orari(cfg, ["spa"], []), []);
});

test("l'operatore richiesto vincola solo il posto 1", () => {
  const cfg = salone([op("sara"), op("federica")]);
  const s = orariPossibili(cfg, ["spa"], GIORNO, [], { staffFilter: "federica" }).find((x) => x.start === h(9));
  assert.equal(s.staffId, "federica");
  assert.equal(s.operatori[1], "sara", "il posto 2 resta automatico");
});

test("più servizi nello stesso appuntamento si incolonnano", () => {
  const { impegni, durata } = impegniServizi(["taglio", "colore"], SERVIZI);
  assert.equal(durata, 135);
  assert.deepEqual(impegni.map((i) => [i.da, i.durata]), [[0, 45], [45, 10], [95, 40]]);
  const cfg = salone([op("a1")]);
  const s = orariPossibili(cfg, ["taglio", "colore"], GIORNO, [], {}).find((x) => x.start === h(9));
  assert.deepEqual(s.operatori, ["a1"], "un solo operatore per tutta la sequenza");
});

test("sovrapponi ignora le occupazioni (solo per il negozio)", () => {
  const cfg = salone([op("a1")]);
  const bk = [app("a1", h(9), h(12))];
  assert.ok(!orari(cfg, ["taglio"], bk).includes("09:00"));
  assert.ok(orari(cfg, ["taglio"], bk, { sovrapponi: true }).includes("09:00"));
});

test("finestreSalone unisce gli orari degli operatori", () => {
  const cfg = salone([op("a1", { availability: { [WD]: [[h(9), h(13)]] } }), op("a2", { availability: { [WD]: [[h(12), h(19)]] } })]);
  assert.deepEqual(finestreSalone(cfg, WD), [[h(9), h(19)]]);
});

test("occupazioneDelGiorno somma appuntamenti vecchi e nuovi per risorsa", () => {
  const nuovo = { id: "n1", date: GIORNO, startMin: h(9), endMin: h(12), impegni: [
    { tipo: "operatore", risorsaId: "sara", from: h(9), to: h(10) },
    { tipo: "cabina", risorsaId: "cab-spa", from: h(9), to: h(12) },
  ] };
  const occ = occupazioneDelGiorno([app("a1", h(14), h(15)), nuovo, { ...app("a1", h(16), h(17)), status: "cancelled" }], GIORNO);
  assert.deepEqual(occ.get("a1"), [{ from: h(14), to: h(15) }]);
  assert.deepEqual(occ.get("sara"), [{ from: h(9), to: h(10) }]);
  assert.deepEqual(occ.get("cab-spa"), [{ from: h(9), to: h(12) }]);
});
