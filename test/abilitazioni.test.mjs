// Chi può fare che cosa. L'abilitazione vive sul servizio — e nei servizi misti
// fase per fase — non sull'operatore, che porta solo la propria fascia oraria.
import { test } from "node:test";
import assert from "node:assert/strict";
import { orariPossibili, operatoriAbilitati, operatoriDelServizio, impegniServizio } from "../src/orari.js";

const h = (hh, mm = 0) => hh * 60 + mm;
const GIORNO = "2030-06-12"; // mercoledì
const WD = 3;
// Gli operatori hanno SOLO la fascia oraria: nessun elenco di servizi.
const op = (id, dal = h(9), al = h(19)) => ({ id, name: id, availability: { [WD]: [[dal, al]] } });
const STAFF = [op("luca"), op("anna"), op("giovanni")];
const alle = (cfg, ids, bk, t, opts) => orariPossibili(cfg, ids, GIORNO, bk || [], opts || {}).find((s) => s.start === t);
const chi = (s) => s.impegni.filter((i) => i.tipo === "operatore").map((i) => i.risorsaId);

test("un servizio base dichiara chi lo può fare", () => {
  const TAGLIO = { id: "taglio", name: "Taglio", durationMin: 45, operatori: ["anna"] };
  const cfg = { services: [TAGLIO], staff: STAFF, cabine: [], closures: [] };
  assert.deepEqual(operatoriDelServizio(TAGLIO, [TAGLIO], STAFF), ["anna"]);
  assert.deepEqual(chi(alle(cfg, ["taglio"], [], h(10))), ["anna"], "lo prende solo chi è abilitato");
});

test("un servizio senza nessun operatore abilitato non è prenotabile", () => {
  const X = { id: "x", name: "X", durationMin: 30, operatori: [] };
  const cfg = { services: [X], staff: STAFF, cabine: [], closures: [] };
  // lista vuota = non dichiarata: senza nemmeno il vecchio legame non lo fa nessuno
  assert.deepEqual(orariPossibili(cfg, ["x"], GIORNO, [], {}), []);
});

test("in un servizio misto ogni fase ha i suoi operatori", () => {
  // Taglio + colore: i primi 40' li fa chi sa tagliare, gli ultimi 30' chi sa colorare
  const TC = { id: "tc", name: "Taglio e colore", durationMin: 100, impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 40, operatori: ["luca", "anna"] },
    { tipo: "operatore", posto: 2, da: 70, durata: 30, operatori: ["giovanni"] },
  ] };
  const cfg = { services: [TC], staff: STAFF, cabine: [], closures: [] };
  const s = alle(cfg, ["tc"], [], h(10));
  assert.deepEqual(chi(s), ["luca", "giovanni"], "prima parte a chi la sa fare, coda a Giovanni");
  // se Giovanni è occupato negli ultimi 10 minuti nessun altro può sostituirlo
  const occupato = [{ id: "b", staffId: "giovanni", date: GIORNO, startMin: h(11), endMin: h(12) }];
  assert.equal(alle(cfg, ["tc"], occupato, h(10)), undefined, "Luca e Anna non sono abilitati a quella fase");
});

test("la lista della fase ha la precedenza su quella del servizio", () => {
  const S = { id: "s", name: "S", durationMin: 60, operatori: ["luca", "anna"], impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 30 },                       // eredita dal servizio
    { tipo: "operatore", posto: 2, da: 30, durata: 30, operatori: ["giovanni"] }, // la sua
  ] };
  const fasi = impegniServizio(S).map((f) => ({ ...f, servizioId: "s" }));
  assert.deepEqual(operatoriAbilitati(fasi[0], [S], STAFF), ["luca", "anna"]);
  assert.deepEqual(operatoriAbilitati(fasi[1], [S], STAFF), ["giovanni"]);
  const cfg = { services: [S], staff: STAFF, cabine: [], closures: [] };
  assert.deepEqual(chi(alle(cfg, ["s"], [], h(10))), ["luca", "giovanni"]);
});

test("i saloni già configurati continuano a funzionare col vecchio legame", () => {
  // Nessun servizio dichiara operatori: vale ancora staff.serviceIds
  const TAGLIO = { id: "taglio", name: "Taglio", durationMin: 45 };
  const vecchioStaff = [{ ...op("luca"), serviceIds: ["taglio"] }, { ...op("anna"), serviceIds: [] }];
  const cfg = { services: [TAGLIO], staff: vecchioStaff, cabine: [], closures: [] };
  assert.deepEqual(operatoriDelServizio(TAGLIO, [TAGLIO], vecchioStaff), ["luca"]);
  assert.deepEqual(chi(alle(cfg, ["taglio"], [], h(10))), ["luca"]);
});

test("la lista sul servizio vince sul vecchio legame", () => {
  const TAGLIO = { id: "taglio", name: "Taglio", durationMin: 45, operatori: ["anna"] };
  const vecchioStaff = [{ ...op("luca"), serviceIds: ["taglio"] }, op("anna")];
  const cfg = { services: [TAGLIO], staff: vecchioStaff, cabine: [], closures: [] };
  assert.deepEqual(chi(alle(cfg, ["taglio"], [], h(10))), ["anna"]);
});

test("un posto raccoglie più fasi: serve chi è abilitato a tutte", () => {
  const S = { id: "s", name: "S", durationMin: 90, impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 10, operatori: ["luca", "anna"] },
    { tipo: "operatore", posto: 1, da: 50, durata: 40, operatori: ["anna", "giovanni"] },
  ] };
  const cfg = { services: [S], staff: STAFF, cabine: [], closures: [] };
  assert.deepEqual(chi(alle(cfg, ["s"], [], h(10))), ["anna", "anna"], "solo Anna è in entrambe le liste");
});

test("un servizio a sola cabina non chiede abilitazioni", () => {
  const LAMPADA = { id: "lampada", name: "Lampada", durationMin: 30, impegni: [{ tipo: "cabina", cabinaId: "c1", da: 0, durata: 30 }] };
  const cfg = { services: [LAMPADA], staff: STAFF, cabine: [{ id: "c1", name: "Cabina" }], closures: [] };
  assert.deepEqual(operatoriDelServizio(LAMPADA, [LAMPADA], STAFF), []);
  assert.ok(alle(cfg, ["lampada"], [], h(10)), "prenotabile senza operatori abilitati");
});
