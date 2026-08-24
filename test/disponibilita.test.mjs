// Test della disponibilità per le prenotazioni online.
// Si eseguono con: npm test  (usa il runner integrato di Node, nessuna dipendenza).
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStarts, valutaSlot, durateOnline } from "../functions/api/[[path]].js";

// ---- Impalcatura ----------------------------------------------------------
const h = (hh, mm = 0) => hh * 60 + mm;
const GIORNO = "2030-06-12";            // mercoledì, sempre nel futuro
const WD = 3;

// Servizi: tutti prenotabili online tranne quelli passati fuori da SERVIZI_ONLINE.
const SERVIZI = [
  { id: "piega", name: "Piega", durationMin: 30 },
  { id: "taglio", name: "Taglio", durationMin: 45 },
  { id: "colore", name: "Colore", durationMin: 90 },
  { id: "frangia", name: "Frangia", durationMin: 15 },
];

function salone({ servizi = SERVIZI, staff, closures = [] } = {}) {
  return { services: servizi, staff, closures };
}
function operatore(id, { orari = [[h(9), h(18)]], servizi = ["piega", "taglio", "colore"], off = [] } = {}) {
  return { id, name: id, serviceIds: servizi, availability: { [WD]: orari }, off };
}
function appuntamento(staffId, da, a, extra = {}) {
  return { id: `${staffId}-${da}`, staffId, date: GIORNO, startMin: da, endMin: a, ...extra };
}
// Orari proposti, in formato leggibile.
function orari(config, bookings, serviceId, mode, opts, staffFilter) {
  return computeStarts(config, bookings, GIORNO, serviceId, 0, mode, staffFilter, opts)
    .map((s) => `${String(Math.floor(s.start / 60)).padStart(2, "0")}:${String(s.start % 60).padStart(2, "0")}`);
}
// Nel metodo ottimizzato i servizi online sono quelli che l'API già calcola.
const ONLINE = (ids = ["piega", "taglio", "colore"]) => ({ servizionline: SERVIZI.filter((s) => ids.includes(s.id)) });

// ---- 1. Slot che riempie perfettamente un buco ----------------------------
test("1 · lo slot che riempie esattamente il buco viene proposto", () => {
  const cfg = salone({ staff: [operatore("a1")] });
  // libero solo 11:00-11:30, esattamente quanto una piega
  const bk = [appuntamento("a1", h(9), h(11)), appuntamento("a1", h(11, 30), h(18))];
  assert.deepEqual(orari(cfg, bk, "piega", "ottimizzata", ONLINE()), ["11:00"]);
  assert.equal(valutaSlot(0, 0, [30, 45, 90]), 200); // priorità 1
});

// ---- 2. Slot che crea un buco da 15 minuti --------------------------------
test("2 · lo slot che lascia 15 minuti morti viene escluso", () => {
  const cfg = salone({ staff: [operatore("a1")] });
  // libero 11:00-12:00; un taglio da 45 lascia sempre 15 minuti da una parte
  const bk = [appuntamento("a1", h(9), h(11)), appuntamento("a1", h(12), h(18))];
  const soli15 = valutaSlot(0, 15, [30, 45, 90]);
  assert.ok(soli15 < 0, "un buco da 15 minuti deve essere penalizzato");
  // nessuna collocazione pulita esiste: entra il fallback e lo spazio resta prenotabile
  const out = orari(cfg, bk, "taglio", "ottimizzata", ONLINE());
  assert.deepEqual(out, ["11:00", "11:15"]);
});

test("2b · con un'alternativa pulita, lo slot da 15 minuti sparisce", () => {
  const cfg = salone({ staff: [operatore("a1")] });
  // libero 10:00-11:30 (90 min): il taglio da 45 sta bene ai bordi
  const bk = [appuntamento("a1", h(9), h(10)), appuntamento("a1", h(11, 30), h(18))];
  assert.deepEqual(orari(cfg, bk, "taglio", "ottimizzata", ONLINE()), ["10:00", "10:45"]);
});

// ---- 3. Buco da 30 minuti quando esiste un servizio da 30 -----------------
test("3 · un buco da 30 minuti è accettabile se esiste un servizio da 30", () => {
  const cfg = salone({ staff: [operatore("a1")] });
  // libero 10:00-11:15 (75 min): il taglio da 45 alle 10:00 lascia 30 minuti
  const bk = [appuntamento("a1", h(9), h(10)), appuntamento("a1", h(11, 15), h(18))];
  assert.ok(orari(cfg, bk, "taglio", "ottimizzata", ONLINE()).includes("10:00"));
  // senza il servizio da 30 minuti, quello stesso buco diventa morto
  // togliendo il servizio da 30, quel buco diventa morto: nessuna collocazione
  // è pulita e resta solo il ripiego (le due meno peggio, entrambe accodate)
  const senzaPiega = orari(cfg, bk, "taglio", "ottimizzata", ONLINE(["taglio", "colore"]));
  assert.deepEqual(senzaPiega, ["10:00", "10:30"]);
});

// ---- 4. Slot che crea due buchi differenti --------------------------------
test("4 · lo slot che spezza lo spazio in due è penalizzato", () => {
  const durate = [30, 45, 90];
  const aiBordi = valutaSlot(0, 45, durate);
  const inMezzo = valutaSlot(30, 45, durate); // lascia spazio da entrambi i lati
  assert.ok(inMezzo < aiBordi, "frammentare deve valere meno che accodarsi");
  const cfg = salone({ staff: [operatore("a1")] });
  // libero 10:00-12:00 (120 min), piega da 30
  const bk = [appuntamento("a1", h(9), h(10)), appuntamento("a1", h(12), h(18))];
  assert.deepEqual(orari(cfg, bk, "piega", "ottimizzata", ONLINE()), ["10:00", "11:30"]);
});

// ---- 5. Giornata completamente libera -------------------------------------
test("5 · giornata vuota: propone l'apertura e la chiusura, non il mezzo", () => {
  const cfg = salone({ staff: [operatore("a1", { orari: [[h(9), h(11)]] })] });
  assert.deepEqual(orari(cfg, [], "piega", "ottimizzata", ONLINE()), ["09:00", "10:30"]);
});

// ---- 6. Giornata quasi del tutto occupata ---------------------------------
test("6 · giornata quasi piena: resta solo il varco buono", () => {
  const cfg = salone({ staff: [operatore("a1")] });
  const bk = [appuntamento("a1", h(9), h(13)), appuntamento("a1", h(13, 30), h(18))];
  assert.deepEqual(orari(cfg, bk, "piega", "ottimizzata", ONLINE()), ["13:00"]);
});

// ---- 7 e 8. Primo e ultimo appuntamento della giornata --------------------
test("7 · il primo slot della giornata parte dall'apertura", () => {
  const cfg = salone({ staff: [operatore("a1", { orari: [[h(9), h(12)]] })] });
  assert.equal(orari(cfg, [], "taglio", "ottimizzata", ONLINE())[0], "09:00");
});
test("8 · l'ultimo slot della giornata combacia con la chiusura", () => {
  const cfg = salone({ staff: [operatore("a1", { orari: [[h(9), h(12)]] })] });
  const out = orari(cfg, [], "taglio", "ottimizzata", ONLINE());
  assert.equal(out[out.length - 1], "11:15"); // 11:15 + 45 = 12:00
});

// ---- 9. Pausa dell'operatore ----------------------------------------------
test("9 · la pausa pranzo spezza la giornata in due spazi indipendenti", () => {
  const cfg = salone({ staff: [operatore("a1", { orari: [[h(9), h(12)], [h(14), h(17)]] })] });
  const out = orari(cfg, [], "piega", "ottimizzata", ONLINE());
  assert.deepEqual(out, ["09:00", "11:30", "14:00", "16:30"]);
  assert.ok(!out.includes("12:00") && !out.includes("13:00"), "niente orari dentro la pausa");
});

// ---- 10. Più operatori ----------------------------------------------------
test("10 · con più operatori vince chi tiene la giornata più compatta", () => {
  const cfg = salone({ staff: [operatore("a1"), operatore("a2")] });
  // a1 è occupato fino alle 11:00, a2 fino alle 10:45
  const bk = [appuntamento("a1", h(9), h(11)), appuntamento("a2", h(9), h(10, 45))];
  const out = orari(cfg, bk, "piega", "ottimizzata", ONLINE());
  assert.ok(out.includes("10:45"), "a2 si libera alle 10:45 e quello slot si accoda");
  assert.ok(out.includes("11:00"), "a1 si libera alle 11:00");
  // lo slot è assegnato all'operatore che davvero lo rende compatto
  const s = computeStarts(cfg, bk, GIORNO, "piega", 0, "ottimizzata", undefined, ONLINE()).find((x) => x.start === h(10, 45));
  assert.equal(s.staffId, "a2");
});

test("10b · con operatore richiesto si guarda solo la sua agenda", () => {
  const cfg = salone({ staff: [operatore("a1"), operatore("a2")] });
  const bk = [appuntamento("a2", h(9), h(10, 45))];
  const out = orari(cfg, bk, "piega", "ottimizzata", ONLINE(), "a2");
  assert.ok(out.includes("10:45"));
  assert.ok(!out.includes("09:00"), "a2 alle 9 è occupato, anche se a1 è libero");
});

// ---- 11. Servizi con durate differenti ------------------------------------
test("11 · la soglia segue le durate reali, non un valore fisso", () => {
  assert.deepEqual(durateOnline(SERVIZI), [15, 30, 45, 90]);
  assert.ok(valutaSlot(0, 15, [30, 45]) < 0, "15 minuti sono morti se il minimo è 30");
  assert.ok(valutaSlot(0, 15, [15, 30]) > 0, "gli stessi 15 minuti vanno bene se esiste un servizio da 15");
});

// ---- 12. Servizi non prenotabili online -----------------------------------
test("12 · i servizi non prenotabili online non allargano la soglia", () => {
  const cfg = salone({ staff: [operatore("a1", { servizi: ["piega", "taglio", "colore", "frangia"] })] });
  // libero 10:00-11:00; il taglio da 45 lascia 15 minuti
  const bk = [appuntamento("a1", h(9), h(10)), appuntamento("a1", h(11), h(18))];
  // se la frangia da 15 è prenotabile online, quei 15 minuti sono utilizzabili
  const conFrangia = computeStarts(cfg, bk, GIORNO, "taglio", 0, "ottimizzata", undefined, ONLINE(["frangia", "piega", "taglio", "colore"]));
  assert.equal(conFrangia.length, 2);
  // se la frangia è solo da gestionale, restano morti: sopravvive solo il fallback
  const senza = computeStarts(cfg, bk, GIORNO, "taglio", 0, "ottimizzata", undefined, ONLINE());
  assert.equal(senza.length, 2, "fallback: lo spazio resta comunque prenotabile");
});

// ---- 13. Nessuno slot ottimale ma disponibilità tecnica -------------------
test("13 · mai 'nessuna disponibilità' se uno slot è tecnicamente prenotabile", () => {
  const cfg = salone({ staff: [operatore("a1")] });
  // unico varco 10:00-10:50: qualunque taglio da 45 lascia 5 minuti morti
  const bk = [appuntamento("a1", h(9), h(10)), appuntamento("a1", h(10, 50), h(18))];
  const out = orari(cfg, bk, "taglio", "ottimizzata", ONLINE());
  assert.ok(out.length > 0, "il fallback deve tenere in vita lo slot");
  assert.deepEqual(out, ["10:00"]);
});

test("13b · spazi buoni e spazi scomodi convivono nella stessa giornata", () => {
  const cfg = salone({ staff: [operatore("a1")] });
  const bk = [
    appuntamento("a1", h(9), h(10)), appuntamento("a1", h(10, 50), h(14)), // varco scomodo 10:00-10:50
    appuntamento("a1", h(15, 30), h(18)),                                   // varco pulito 14:00-15:30
  ];
  const out = orari(cfg, bk, "taglio", "ottimizzata", ONLINE());
  assert.ok(out.includes("10:00"), "lo spazio scomodo resta prenotabile per fallback");
  assert.ok(out.includes("14:00") && out.includes("14:45"), "lo spazio pulito propone i bordi");
  assert.ok(!out.includes("14:15"), "le collocazioni che frammentano lo spazio pulito spariscono");
});

// ---- 14. Conferma: la verifica finale guarda solo la disponibilità reale ---
test("14 · in conferma passa qualunque slot davvero libero, non solo gli ottimali", () => {
  const cfg = salone({ staff: [operatore("a1")] });
  const bk = [appuntamento("a1", h(9), h(10)), appuntamento("a1", h(11, 30), h(18))];
  const mostrati = computeStarts(cfg, bk, GIORNO, "taglio", 0, "ottimizzata", undefined, ONLINE());
  const inConferma = computeStarts(cfg, bk, GIORNO, "taglio", 0, "ottimizzata", undefined, { ...ONLINE(), confirm: true });
  assert.ok(inConferma.length > mostrati.length, "la conferma è più permissiva del listino mostrato");
  assert.ok(mostrati.every((m) => inConferma.some((c) => c.start === m.start)), "tutti gli orari mostrati restano confermabili");
});

test("14b · lo slot già occupato viene rifiutato anche in conferma", () => {
  const cfg = salone({ staff: [operatore("a1")] });
  const libera = [appuntamento("a1", h(9), h(10)), appuntamento("a1", h(11, 30), h(18))];
  const opts = { ...ONLINE(), confirm: true };
  assert.ok(computeStarts(cfg, libera, GIORNO, "taglio", 0, "ottimizzata", undefined, opts).some((s) => s.start === h(10)));
  // secondo cliente: nel frattempo le 10:00 sono state prese
  const occupata = [...libera, appuntamento("a1", h(10), h(10, 45))];
  assert.ok(!computeStarts(cfg, occupata, GIORNO, "taglio", 0, "ottimizzata", undefined, opts).some((s) => s.start === h(10)),
    "la doppia prenotazione dello stesso slot deve essere impedita");
});

// ---- 15. I due metodi esistenti non cambiano ------------------------------
test("15 · anti-vuoto e griglia restano identici a prima", () => {
  const cfg = salone({ staff: [operatore("a1", { orari: [[h(9), h(12)]] }), operatore("a2", { orari: [[h(9), h(12)]] })] });
  const bk = [appuntamento("a1", h(10), h(10, 45)), appuntamento("a2", h(9), h(11))];

  // anti-vuoto: solo il bordo sinistro di ogni segmento libero
  assert.deepEqual(orari(cfg, bk, "piega", "antivuoto"), ["09:00", "10:45", "11:00"]);
  // griglia: passo fisso di 15 minuti su tutto ciò che è libero
  assert.deepEqual(orari(cfg, bk, "piega", "griglia"),
    ["09:00", "09:15", "09:30", "10:45", "11:00", "11:15", "11:30"]);

  // `opts` non deve influenzare in alcun modo le due modalità storiche
  for (const mode of ["antivuoto", "griglia"]) {
    assert.deepEqual(orari(cfg, bk, "piega", mode), orari(cfg, bk, "piega", mode, ONLINE()));
    assert.deepEqual(orari(cfg, bk, "piega", mode), orari(cfg, bk, "piega", mode, { ...ONLINE(), confirm: true }));
  }
  // una modalità sconosciuta ricade su anti-vuoto, come prima
  assert.deepEqual(orari(cfg, bk, "piega", "boh"), orari(cfg, bk, "piega", "antivuoto"));
});

// ---- Regole rigide condivise ---------------------------------------------
test("16 · chiusure, ferie e giorni non lavorati valgono per tutte e tre", () => {
  const chiuso = salone({ staff: [operatore("a1")], closures: [{ from: GIORNO, to: GIORNO }] });
  const ferie = salone({ staff: [operatore("a1", { off: [{ from: GIORNO, to: GIORNO }] })] });
  const altroGiorno = salone({ staff: [{ id: "a1", serviceIds: ["piega"], availability: { 0: [[h(9), h(12)]] } }] });
  for (const mode of ["antivuoto", "griglia", "ottimizzata"]) {
    assert.deepEqual(orari(chiuso, [], "piega", mode, ONLINE()), [], `chiusura · ${mode}`);
    assert.deepEqual(orari(ferie, [], "piega", mode, ONLINE()), [], `ferie · ${mode}`);
    assert.deepEqual(orari(altroGiorno, [], "piega", mode, ONLINE()), [], `giorno non lavorato · ${mode}`);
  }
});

test("17 · gli slot ottimizzati sono sempre un sottoinsieme di quelli liberi", () => {
  const cfg = salone({ staff: [operatore("a1"), operatore("a2")] });
  const bk = [appuntamento("a1", h(10), h(11)), appuntamento("a2", h(9, 30), h(12)), appuntamento("a1", h(14), h(15, 30))];
  for (const svc of ["piega", "taglio", "colore"]) {
    const griglia = new Set(orari(cfg, bk, svc, "griglia"));
    for (const s of orari(cfg, bk, svc, "ottimizzata", ONLINE())) {
      assert.ok(griglia.has(s), `${svc} · ${s} non è tra gli orari tecnicamente liberi`);
    }
  }
});

test("18 · gli appuntamenti annullati non occupano l'agenda", () => {
  const cfg = salone({ staff: [operatore("a1", { orari: [[h(9), h(10)]] })] });
  const bk = [appuntamento("a1", h(9), h(9, 30), { status: "cancelled" })];
  assert.ok(orari(cfg, bk, "piega", "ottimizzata", ONLINE()).includes("09:00"));
});
