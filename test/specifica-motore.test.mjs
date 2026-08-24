// Gli esempi della specifica del motore appuntamenti, tradotti uno a uno.
// Ogni test porta il numero del paragrafo da cui è preso.
import { test } from "node:test";
import assert from "node:assert/strict";
import { orariPossibili, impegniBooking, occupazioneDelGiorno, spaziLiberiRisorsa, durataServizio } from "../src/orari.js";

const h = (hh, mm = 0) => hh * 60 + mm;
const GIORNO = "2030-06-12"; // mercoledì
const WD = 3;
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fasce = (a) => a.map((x) => `${hhmm(x.from)}→${hhmm(x.to)}`);

// §2 — operatori con fascia oraria propria e servizi abilitati
const LUCA = { id: "luca", name: "Luca", availability: { [WD]: [[h(9), h(18)]] } };
const GIOVANNI = { id: "giovanni", name: "Giovanni", availability: { [WD]: [[h(10), h(19)]] } };

// §4 — TIPO 2, servizio misto: 40' Luca, 30' nessuno (posa), 30' Giovanni
const TAGLIO_COLORE = { id: "tc", name: "Taglio + colore", durationMin: 100, impegni: [
  { tipo: "operatore", posto: 1, da: 0, durata: 40 },
  { tipo: "operatore", posto: 2, da: 70, durata: 30 },
] };
const TAGLIO = { id: "taglio", name: "Taglio", durationMin: 45 };
const RAPIDO = { id: "rapido", name: "Servizio A", durationMin: 20 };

function salone({ services, staff, cabine = [] }) {
  return { services, staff, cabine, closures: [] };
}
const orari = (cfg, ids, bk, opts) => orariPossibili(cfg, ids, GIORNO, bk, opts || {}).map((s) => hhmm(s.start));
const alle = (cfg, ids, bk, t, opts) => orariPossibili(cfg, ids, GIORNO, bk, opts || {}).find((s) => s.start === t);

// ---- §3 TIPO 1 · servizio base --------------------------------------------
test("§3 · il servizio base occupa un solo operatore per la sua durata", () => {
  const cfg = salone({ services: [TAGLIO], staff: [{ ...LUCA, serviceIds: ["taglio"] }, { ...GIOVANNI, serviceIds: ["taglio"] }] });
  const s = alle(cfg, ["taglio"], [], h(10));
  assert.deepEqual(s.impegni, [{ tipo: "operatore", risorsaId: "luca", from: h(10), to: h(10, 45) }]);
});

// ---- §4 TIPO 2 · servizio misto -------------------------------------------
test("§4 · il servizio misto non occupa nessuno per tutti i 100 minuti", () => {
  const staff = [{ ...LUCA, serviceIds: ["tc"] }, { ...GIOVANNI, serviceIds: ["tc"] }];
  const cfg = salone({ services: [TAGLIO_COLORE], staff });
  assert.equal(durataServizio(TAGLIO_COLORE), 100, "la durata complessiva è 40+30+30");
  const s = alle(cfg, ["tc"], [], h(10));
  assert.deepEqual(fasce(s.impegni.filter((i) => i.risorsaId === "luca")), ["10:00→10:40"]);
  assert.deepEqual(fasce(s.impegni.filter((i) => i.risorsaId === "giovanni")), ["11:10→11:40"]);
  assert.equal(s.impegni.length, 2, "10:40→11:10 non impegna nessuno");
});

// ---- §5 e §6 · il buco dell'operatore è davvero libero ---------------------
test("§6 · il calendario dell'operatore mostra il buco fra le fasi", () => {
  const staff = [{ ...LUCA, serviceIds: ["tc", "taglio", "rapido"] }, { ...GIOVANNI, serviceIds: ["tc", "taglio", "rapido"] }];
  const cfg = salone({ services: [TAGLIO_COLORE, TAGLIO, RAPIDO], staff });
  const s = alle(cfg, ["tc"], [], h(10));
  const appuntamento = { id: "a", date: GIORNO, startMin: h(10), endMin: h(11, 40), staffId: "luca", impegni: s.impegni };
  const occ = occupazioneDelGiorno([appuntamento], GIORNO);
  assert.deepEqual(fasce(occ.get("luca")), ["10:00→10:40"], "Luca risulta occupato solo nella sua fase");
  assert.deepEqual(fasce(spaziLiberiRisorsa(cfg, GIORNO, "luca", occ, -1)), ["09:00→10:00", "10:40→18:00"]);
});

// ---- §7 · il buco può essere riempito anche solo in parte ------------------
test("§7 · in un buco da 40 minuti entra un servizio da 20 e ne restano 20", () => {
  const staff = [{ ...LUCA, serviceIds: ["rapido"] }];
  const cfg = salone({ services: [RAPIDO], staff });
  const bk = [
    { id: "x", date: GIORNO, startMin: h(10), endMin: h(10, 40), staffId: "luca" },
    { id: "y", date: GIORNO, startMin: h(11, 20), endMin: h(12), staffId: "luca" },
  ];
  const proposti = orari(cfg, ["rapido"], bk, { modo: "ottimizzata" });
  assert.ok(proposti.includes("10:40"), "il servizio da 20' entra all'inizio del buco");
  assert.ok(proposti.includes("11:00"), "oppure in fondo, combaciando con ciò che segue");
  const occ = occupazioneDelGiorno([...bk, { id: "z", date: GIORNO, startMin: h(10, 40), endMin: h(11), staffId: "luca" }], GIORNO);
  const liberi = spaziLiberiRisorsa(cfg, GIORNO, "luca", occ, -1);
  assert.ok(fasce(liberi).includes("11:00→11:20"), "restano 20 minuti ancora sfruttabili");
});

// ---- §8 · servizio senza operatore -----------------------------------------
test("§8 · la lampada occupa la cabina e nessun operatore", () => {
  const LAMPADA = { id: "lampada", name: "Lampada", durationMin: 30, impegni: [{ tipo: "cabina", cabinaId: "cab-lampada", da: 0, durata: 30 }] };
  const cfg = salone({ services: [LAMPADA], staff: [{ ...LUCA, serviceIds: ["lampada"] }], cabine: [{ id: "cab-lampada", name: "Cabina Lampada" }] });
  const s = alle(cfg, ["lampada"], [], h(10));
  assert.deepEqual(s.impegni, [{ tipo: "cabina", risorsaId: "cab-lampada", from: h(10), to: h(10, 30) }]);
  assert.equal(s.staffId, "");
});

// ---- §9 · le cabine sono opzionali -----------------------------------------
test("§9 · senza cabine configurate il motore non le considera", () => {
  const cfg = salone({ services: [TAGLIO], staff: [{ ...LUCA, serviceIds: ["taglio"] }] });
  assert.equal(cfg.cabine.length, 0);
  assert.ok(orari(cfg, ["taglio"], []).includes("09:00"));
});

// ---- §10 · cabina predefinita dell'operatore -------------------------------
test("§10 · una fase senza cabina indicata usa quella predefinita dell'operatore", () => {
  const UNGHIE = { id: "unghie", name: "Unghie", durationMin: 60, impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 60 },
    { tipo: "cabina", da: 0, durata: 60 },
  ] };
  const cfg = salone({ services: [UNGHIE], staff: [{ ...LUCA, serviceIds: ["unghie"], cabinaId: "cab-unghie" }],
    cabine: [{ id: "cab-unghie", name: "Cabina Unghie" }, { id: "cab-altra", name: "Altra" }] });
  assert.deepEqual(alle(cfg, ["unghie"], [], h(10)).cabine, ["cab-unghie"]);
});

// ---- §11 · cabina associata al servizio ------------------------------------
test("§11 · la SPA tiene la cabina per tutte e tre le ore, senza operatori", () => {
  const SPA = { id: "spa", name: "SPA", durationMin: 180, impegni: [{ tipo: "cabina", cabinaId: "cab-spa", da: 0, durata: 180 }] };
  const cfg = salone({ services: [SPA], staff: [{ ...LUCA, serviceIds: ["spa"] }], cabine: [{ id: "cab-spa", name: "Cabina SPA" }] });
  assert.deepEqual(fasce(alle(cfg, ["spa"], [], h(10)).impegni), ["10:00→13:00"]);
});

// ---- §12 · la cabina può cambiare fra le fasi ------------------------------
test("§12 · un servizio può cambiare cabina durante le fasi", () => {
  const MISTO = { id: "misto", name: "Misto", durationMin: 90, impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 30 },
    { tipo: "cabina", cabinaId: "cab1", da: 0, durata: 60 },
    { tipo: "operatore", posto: 2, da: 60, durata: 30 },
    { tipo: "cabina", cabinaId: "cab2", da: 60, durata: 30 },
  ] };
  const cfg = salone({ services: [MISTO], staff: [{ ...LUCA, serviceIds: ["misto"] }, { ...GIOVANNI, serviceIds: ["misto"] }],
    cabine: [{ id: "cab1", name: "Cabina 1" }, { id: "cab2", name: "Cabina 2" }] });
  const s = alle(cfg, ["misto"], [], h(10));
  const di = (id) => fasce(s.impegni.filter((i) => i.risorsaId === id));
  assert.deepEqual(di("luca"), ["10:00→10:30"]);
  assert.deepEqual(di("cab1"), ["10:00→11:00"]);
  assert.deepEqual(di("giovanni"), ["11:00→11:30"]);
  assert.deepEqual(di("cab2"), ["11:00→11:30"]);
});

// ---- §13 e §24 · conflitto di cabina con operatore libero ------------------
test("§13 · la cabina occupata blocca lo slot anche se l'operatore è libero", () => {
  const A = { id: "a", name: "Servizio A", durationMin: 180, impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 180 },
    { tipo: "cabina", cabinaId: "cab1", da: 0, durata: 180 },
  ] };
  const B = { id: "b", name: "Servizio B", durationMin: 60, impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 60 },
    { tipo: "cabina", cabinaId: "cab1", da: 0, durata: 20 },
  ] };
  const cfg = salone({ services: [A, B], staff: [{ ...LUCA, serviceIds: ["a", "b"] }, { ...GIOVANNI, serviceIds: ["a", "b"] }],
    cabine: [{ id: "cab1", name: "Cabina 1" }] });
  const luca = alle(cfg, ["a"], [], h(10), { staffFilter: "luca" });
  const bk = [{ id: "a1", date: GIORNO, startMin: h(10), endMin: h(13), staffId: "luca", impegni: luca.impegni }];
  // Giovanni è libero alle 12:00 ma la Cabina 1 è occupata fino alle 13:00
  assert.ok(!orari(cfg, ["b"], bk, { staffFilter: "giovanni" }).includes("12:00"));
  assert.ok(orari(cfg, ["b"], bk, { staffFilter: "giovanni" }).includes("13:00"), "dalle 13 la cabina si libera");
});

// ---- §16 · il buco interno è riconosciuto dal motore -----------------------
test("§16 · Luca non è occupato dalle 09:00 alle 11:00, ha 60 minuti liberi", () => {
  const DUE_ORE = { id: "due", name: "Due ore", durationMin: 120, impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 30 },
    { tipo: "operatore", posto: 1, da: 90, durata: 30 },
  ] };
  const cfg = salone({ services: [DUE_ORE, RAPIDO], staff: [{ ...LUCA, serviceIds: ["due", "rapido"] }] });
  const s = alle(cfg, ["due"], [], h(9));
  const bk = [{ id: "d", date: GIORNO, startMin: h(9), endMin: h(11), staffId: "luca", impegni: s.impegni }];
  const occ = occupazioneDelGiorno(bk, GIORNO);
  assert.deepEqual(fasce(occ.get("luca")), ["09:00→09:30", "10:30→11:00"]);
  assert.ok(fasce(spaziLiberiRisorsa(cfg, GIORNO, "luca", occ, -1)).includes("09:30→10:30"), "60 minuti liberi nel mezzo");
  // e quei 60 minuti sono davvero prenotabili
  assert.ok(orari(cfg, ["rapido"], bk).includes("09:30"));
});

// ---- §29 · l'esempio conclusivo, risorsa per risorsa -----------------------
test("§29 · le occupazioni finali coincidono con quelle della specifica", () => {
  const SERV = { id: "s", name: "Servizio", durationMin: 120, impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 30 },
    { tipo: "cabina", cabinaId: "cab1", da: 0, durata: 90 },
    { tipo: "operatore", posto: 2, da: 90, durata: 30 },
    { tipo: "cabina", cabinaId: "cab2", da: 90, durata: 30 },
  ] };
  const cfg = salone({ services: [SERV], staff: [{ ...LUCA, serviceIds: ["s"] }, { ...GIOVANNI, serviceIds: ["s"] }],
    cabine: [{ id: "cab1", name: "Cabina 1" }, { id: "cab2", name: "Cabina 2" }] });
  const s = alle(cfg, ["s"], [], h(9));
  const occ = occupazioneDelGiorno([{ id: "x", date: GIORNO, startMin: h(9), endMin: h(11), staffId: "luca", impegni: s.impegni }], GIORNO);
  assert.deepEqual(fasce(occ.get("luca")), ["09:00→09:30"]);
  assert.deepEqual(fasce(occ.get("giovanni")), ["10:30→11:00"]);
  assert.deepEqual(fasce(occ.get("cab1")), ["09:00→10:30"]);
  assert.deepEqual(fasce(occ.get("cab2")), ["10:30→11:00"]);
});

// ---- §21 · non cercare "N minuti consecutivi" ------------------------------
test("§21 · lo slot vale se le fasi stanno in piedi, non se ci sono 90' liberi di fila", () => {
  const SEQ = { id: "seq", name: "Sequenza", durationMin: 90, impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 30 },
    { tipo: "operatore", posto: 2, da: 60, durata: 30 },
  ] };
  const cfg = salone({ services: [SEQ], staff: [{ ...LUCA, serviceIds: ["seq"] }, { ...GIOVANNI, serviceIds: ["seq"] }] });
  // Luca è occupato 09:30-10:00: nessuno dei due ha 90' liberi di fila da lì,
  // ma le fasi ci stanno lo stesso perché la parte centrale non serve a nessuno
  const bk = [{ id: "b", date: GIORNO, startMin: h(10, 30), endMin: h(11), staffId: "luca" }];
  const s = alle(cfg, ["seq"], bk, h(10));
  assert.ok(s, "lo slot delle 10:00 esiste");
  assert.deepEqual(fasce(s.impegni), ["10:00→10:30", "11:00→11:30"], "solo le fasi occupano");
  assert.equal(new Set(s.impegni.map((i) => i.risorsaId)).size, 2, "due persone diverse");
  // Il punto del paragrafo: nessuno dei due ha 90 minuti liberi di fila dalle
  // 10:00, eppure lo slot è valido perché la parte centrale non serve a nessuno.
  const occ = occupazioneDelGiorno(bk, GIORNO);
  const novantaDiFila = (id) => spaziLiberiRisorsa(cfg, GIORNO, id, occ, -1).some((sp) => sp.from <= h(10) && sp.to >= h(11, 30));
  assert.equal(novantaDiFila("luca"), false, "Luca è spezzato dalle 10:30 alle 11:00");
  assert.equal(s.impegni.filter((i) => i.risorsaId === "luca").length > 0, true, "eppure una fase la fa lui");
});
