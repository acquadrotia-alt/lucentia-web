// Cruscotto settimanale e costo del venduto (src/core/statistiche/cruscotto.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cruscottoSettimana, lunediDi, costoDelVenduto, minutiOccupati } from "../src/core/statistiche/cruscotto.js";

const h = (x) => x * 60;
const config = {
  services: [{ id: "piega", name: "Piega", durationMin: 30, price: 25 }, { id: "colore", name: "Colore", durationMin: 90, price: 60, impegni: [{ tipo: "operatore", posto: 1, da: 0, durata: 20 }, { tipo: "operatore", posto: 1, da: 60, durata: 30 }] }],
  staff: [
    { id: "a1", name: "Giulia", availability: { 1: [[h(9), h(13)], [h(14), h(18)]], 2: [[h(9), h(13)], [h(14), h(18)]] } },
    { id: "a2", name: "Sara", availability: { 1: [[h(9), h(13)]] }, off: [{ from: "2026-11-03", to: "2026-11-03" }] },
  ],
  closures: [],
};
// settimana di lunedì 2 novembre 2026
const bookings = [
  { id: "b1", date: "2026-11-02", startMin: h(9), endMin: h(9) + 30, serviceIds: ["piega"], staffId: "a1", clientCode: "c1", status: "done", amount: 25 },
  { id: "b2", date: "2026-11-02", startMin: h(10), endMin: h(11) + 30, serviceIds: ["colore"], staffId: "a1", clientCode: "c2", status: "done", impegni: [{ tipo: "operatore", risorsaId: "a1", from: h(10), to: h(10) + 20 }, { tipo: "operatore", risorsaId: "a1", from: h(11), to: h(11) + 30 }] },
  { id: "b3", date: "2026-11-03", startMin: h(15), endMin: h(15) + 30, serviceIds: ["piega"], staffId: "a1", clientCode: "c1", status: "noshow" },
  { id: "b4", date: "2026-11-03", startMin: h(16), endMin: h(16) + 30, serviceIds: ["piega"], staffId: "a1", clientCode: "c3", status: "cancelled" },
  { id: "b5", date: "2026-11-02", startMin: h(9), endMin: h(9) + 30, serviceIds: ["piega"], staffId: "a2", clientCode: "c3", fromOnline: true },
  { id: "vecchio", date: "2026-10-20", startMin: h(9), endMin: h(9) + 30, serviceIds: ["piega"], staffId: "a1", clientCode: "c1", status: "done", amount: 25 },
];
const ts = (d, hh) => new Date(`${d}T${String(hh).padStart(2, "0")}:00:00`).getTime();
const sales = [
  { id: "s1", type: "sale", ts: ts("2026-11-02", 11), total: 30, items: [{ productId: "p1", formatId: "f1", name: "Shampoo", qty: 2, price: 15, costo: 6 }] },
  { id: "s2", type: "sale", ts: ts("2026-11-04", 11), total: 40, items: [{ productId: "p2", formatId: "f1", name: "Maschera", qty: 1, price: 40 }] },
  { id: "s0", type: "sale", ts: ts("2026-10-28", 11), total: 15, items: [{ productId: "p1", formatId: "f1", name: "Shampoo", qty: 1, price: 15, costo: 6 }] },
  { id: "l1", type: "load", ts: ts("2026-11-02", 8), total: 0, items: [{ productId: "p1", formatId: "f1", qty: 10, costo: 6 }] },
];
const catalog = { products: [{ id: "p1", name: "Shampoo", formats: [{ id: "f1", label: "300 ml", price: 15, costo: 6 }] }, { id: "p2", name: "Maschera", formats: [{ id: "f1", label: "250 ml", price: 40, costo: 18 }] }] };

test("lunedì della settimana", () => {
  assert.equal(lunediDi("2026-11-04"), "2026-11-02");
  assert.equal(lunediDi("2026-11-08"), "2026-11-02", "la domenica chiude la settimana");
  assert.equal(lunediDi("2026-11-02"), "2026-11-02");
});

test("minuti occupati: fasi contate, posa esclusa, sovrapposizioni fuse", () => {
  assert.equal(minutiOccupati([bookings[1]], "a1"), 50);
  assert.equal(minutiOccupati([{ date: "d", startMin: 0, endMin: 60, staffId: "a1" }, { date: "d", startMin: 30, endMin: 90, staffId: "a1" }], "a1"), 90);
});

test("cruscotto della settimana: giorni, operatori, clienti nuovi e confronto", () => {
  const c = cruscottoSettimana(config, bookings, sales, [], "2026-11-04");
  assert.equal(c.lunedi, "2026-11-02");
  assert.equal(c.tot.appuntamenti, 4, "gli annullati non contano");
  assert.equal(c.tot.svolti, 2); assert.equal(c.tot.noshow, 1); assert.equal(c.tot.annullati, 1); assert.equal(c.tot.online, 1);
  assert.equal(c.tot.incassoServizi, 85, "25 dell'importo + 60 di listino");
  assert.equal(c.tot.incassoProdotti, 70); assert.equal(c.tot.incasso, 155);
  assert.equal(c.tot.clienti, 3); assert.equal(c.tot.nuovi, 2, "c2 e c3 sono alla prima visita; c1 veniva già"); assert.equal(c.tot.abituali, 1);
  assert.equal(c.tot.tassoNoshow, 25);
  const lun = c.perGiorno[0]; assert.equal(lun.data, "2026-11-02"); assert.equal(lun.appuntamenti, 3); assert.equal(lun.incassoProdotti, 30);
  const g = c.perOperatore.find((o) => o.id === "a1");
  assert.equal(g.appuntamenti, 3); assert.equal(g.minutiOccupati, 80, "30 + 50 (il no-show non occupa)"); assert.equal(g.minutiDisponibili, 2 * 8 * 60); assert.equal(g.occupazione, Math.round((80 / 960) * 100));
  assert.equal(g.incassoServizi, 85);
  const s = c.perOperatore.find((o) => o.id === "a2");
  assert.equal(s.minutiDisponibili, 240, "martedì è in ferie"); assert.equal(s.minutiOccupati, 30);
  assert.equal(c.precedente.appuntamenti, 0); assert.equal(c.delta.appuntamenti, 4);
});

test("costo del venduto: costo dalla riga o dal formato, margine per prodotto", () => {
  const r = costoDelVenduto(sales, catalog, "2026-11-02", "2026-11-08");
  assert.equal(r.ricavo, 70); assert.equal(r.costo, 30, "2×6 + 18 dal formato"); assert.equal(r.margine, 40); assert.equal(r.marginePct, 57);
  assert.equal(r.righe[0].nome, "Maschera"); assert.equal(r.righe[0].marginePct, 55);
  assert.equal(r.righe[1].qta, 2); assert.equal(r.senzaCosto, 0);
  const tutto = costoDelVenduto(sales, catalog);
  assert.equal(tutto.ricavo, 85);
  const senza = costoDelVenduto([{ type: "sale", ts: ts("2026-11-02", 9), total: 5, items: [{ productId: "px", qty: 1, price: 5 }] }], catalog);
  assert.equal(senza.senzaCosto, 1); assert.equal(senza.costo, 0);
});
