// Confronto fra il motore condiviso (src/orari.js) e le due modalità storiche
// dell'API sui servizi semplici. Serve a garantire che passare al modello a
// risorse non tolga disponibilità a nessuno.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStarts } from "../functions/api/[[path]].js";
import { orariPossibili } from "../src/orari.js";

const h = (hh, mm = 0) => hh * 60 + mm;
const GIORNO = "2030-06-12"; // mercoledì, futuro: nessun vincolo di preavviso
const WD = 3;

const SERVIZI = [
  { id: "s30", name: "Trenta", durationMin: 30 },
  { id: "s45", name: "Quarantacinque", durationMin: 45 },
  { id: "s90", name: "Novanta", durationMin: 90 },
];
const IDS = SERVIZI.map((s) => s.id);
// Turni allineati al quarto d'ora (il caso normale) e turni sfasati.
const ALLINEATI = [[[h(9), h(18)]], [[h(9), h(12, 30)], [h(14), h(19)]], [[h(8, 45), h(11)], [h(15), h(17, 30)]]];
const SFASATI = [[[h(9, 10), h(12)]], [[h(8, 50), h(13, 20)]]];
const AGENDE = [
  [],
  [[h(10), h(11)]],
  [[h(9), h(9, 30)], [h(11), h(12)], [h(15), h(16, 15)]],
  [[h(9), h(18)]],
  [[h(10), h(10, 20)], [h(10, 40), h(11)]],
];

function* casi(orari, unSoloOperatore) {
  for (const o1 of orari) for (const o2 of orari) for (const ag of AGENDE) for (const svc of SERVIZI) for (const mode of ["griglia", "antivuoto"]) {
    const staff = [{ id: "a1", serviceIds: IDS, availability: { [WD]: o1 } }];
    if (!unSoloOperatore) staff.push({ id: "a2", serviceIds: IDS, availability: { [WD]: o2 } });
    const config = { services: SERVIZI, cabine: [], closures: [], staff };
    const bookings = ag.flatMap(([da, al], k) => [
      { id: `b${k}`, staffId: "a1", date: GIORNO, startMin: da, endMin: al },
      ...(k % 2 && !unSoloOperatore ? [{ id: `c${k}`, staffId: "a2", date: GIORNO, startMin: da, endMin: al }] : []),
    ]);
    yield { nome: `${mode} ${svc.id} agenda${AGENDE.indexOf(ag)}`, config, bookings, svc, mode,
      vecchio: computeStarts(config, bookings, GIORNO, svc.id, 0, mode).map((s) => s.start),
      nuovo: orariPossibili(config, [svc.id], GIORNO, bookings, { soloBordi: mode === "antivuoto" }) };
  }
}

test("il nuovo motore non toglie mai un orario che prima era proposto", () => {
  let n = 0;
  for (const c of casi([...ALLINEATI, ...SFASATI])) {
    const orari = c.nuovo.map((s) => s.start);
    const persi = c.vecchio.filter((t) => !orari.includes(t));
    assert.deepEqual(persi, [], `${c.nome}: orari spariti`);
    n++;
  }
  assert.ok(n >= 500, `casi confrontati: ${n}`);
});

test("ogni orario proposto è davvero prenotabile", () => {
  // Ricontrollo fatto qui a mano, senza riusare le funzioni del motore: un bug
  // nel controllo interno non potrebbe passare inosservato.
  let controllati = 0;
  for (const c of casi([...ALLINEATI, ...SFASATI])) {
    for (const s of c.nuovo) {
      const st = c.config.staff.find((x) => x.id === s.staffId);
      const fine = s.start + c.svc.durationMin;
      assert.ok(st, `${c.nome}: nessun operatore assegnato`);
      assert.ok((st.availability[WD] || []).some((w) => s.start >= w[0] && fine <= w[1]), `${c.nome}: ${s.start} fuori orario di ${s.staffId}`);
      assert.ok(!c.bookings.some((b) => b.staffId === s.staffId && s.start < b.endMin && fine > b.startMin), `${c.nome}: ${s.start} accavalla un impegno di ${s.staffId}`);
      controllati++;
    }
  }
  assert.ok(controllati > 3000, `slot controllati: ${controllati}`);
});

test("con un solo operatore e turni regolari il risultato è identico a prima", () => {
  for (const c of casi(ALLINEATI, true)) {
    assert.deepEqual(c.nuovo.map((s) => s.start), c.vecchio, c.nome);
    assert.deepEqual(c.nuovo.map((s) => s.staffId), Array(c.vecchio.length).fill("a1"), c.nome);
  }
});

// Con più operatori il nuovo motore propone anche orari che prima sfuggivano:
// il vecchio calcolo generava gli orari di ciascun operatore solo a partire
// dall'inizio del suo turno, quindi un collega libero in un orario "della
// griglia di un altro" non veniva mai proposto.
test("con più operatori recupera orari che prima andavano persi", () => {
  const config = { services: SERVIZI, cabine: [], closures: [], staff: [
    { id: "a1", serviceIds: IDS, availability: { [WD]: [[h(9), h(18)]] } },
    { id: "a2", serviceIds: IDS, availability: { [WD]: [[h(9, 10), h(12)]] } },
  ] };
  const bookings = [{ id: "b1", staffId: "a1", date: GIORNO, startMin: h(10), endMin: h(11) }];
  const vecchio = computeStarts(config, bookings, GIORNO, "s30", 0, "griglia").map((s) => s.start);
  const nuovo = orariPossibili(config, ["s30"], GIORNO, bookings, {});
  assert.ok(!vecchio.includes(h(10)), "prima le 10:00 non venivano proposte");
  const alle10 = nuovo.find((s) => s.start === h(10));
  assert.ok(alle10, "ora vengono proposte");
  assert.equal(alle10.staffId, "a2", "le prende il collega che in quel momento è libero");
});
