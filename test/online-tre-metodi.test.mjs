// Controllo dei tre metodi di disponibilità online contro il modello a
// risorse: abilitazioni dichiarate dal servizio (anche per singola fase),
// cabine, multi-operatore e servizi senza operatore.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";

const h = (hh, mm = 0) => hh * 60 + mm;
const GIORNO = "2030-06-12"; // mercoledì
const WD = 3;
const AID = "az1";
const MODI = ["antivuoto", "griglia", "ottimizzata"];

// Gli operatori portano SOLO la fascia oraria: nessun elenco di servizi.
const op = (id, name) => ({ id, name, availability: { [WD]: [[h(9), h(19)]] } });

const SERVIZI = [
  // base, ristretto a una sola persona
  { id: "piega", name: "Piega", durationMin: 30, operatori: ["sara"] },
  // base, aperto a due
  { id: "taglio", name: "Taglio", durationMin: 45, operatori: ["sara", "anna"] },
  // misto: prima parte a chi taglia, coda a chi colora — persone diverse
  { id: "tc", name: "Taglio e colore", durationMin: 100, impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 40, operatori: ["anna"] },
    { tipo: "operatore", posto: 2, da: 70, durata: 30, operatori: ["federica"] },
  ] },
  // posa: stessa persona prima e dopo, libera nel mezzo
  { id: "colore", name: "Colore", durationMin: 90, operatori: ["federica"], impegni: [
    { tipo: "operatore", posto: 1, da: 0, durata: 10 },
    { tipo: "operatore", posto: 1, da: 50, durata: 40 },
  ] },
  // sola cabina, nessun operatore
  { id: "lampada", name: "Lampada", durationMin: 60, impegni: [{ tipo: "cabina", cabinaId: "cab-lampada", da: 0, durata: 60 }] },
];

function scenario(mode) {
  const config = {
    services: SERVIZI,
    staff: [op("sara", "Sara"), op("federica", "Federica"), op("anna", "Anna")],
    cabine: [{ id: "cab-lampada", name: "Cabina lampada" }],
    closures: [],
    onlineBooking: { mode, leadHours: 0, horizonDays: 30 },
  };
  return { config, aziende: { [AID]: { id: AID, denominazione: "Centro", attiva: 1, licenza_scadenza: "2099-01-01", moduli: JSON.stringify(["online", "opinf"]) } },
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
const info = (st) => chiama(st, `/api/prenota/${AID}`).then((r) => r.body);
const slots = async (st, svc, staff) => (await chiama(st, `/api/prenota/${AID}/slots?date=${GIORNO}&service=${svc}${staff ? `&staff=${staff}` : ""}`)).body.slots.map((s) => s.label);
const prenota = (st, svc, start, nome = "Cliente") => chiama(st, `/api/prenota/${AID}`, { method: "POST", body: { date: GIORNO, service: svc, start, name: nome, phone: "3401112233" } });

// ---- l'elenco dei servizi e degli operatori segue il nuovo modello --------
test("i servizi prenotabili online li decide l'abilitazione del servizio", async () => {
  for (const modo of MODI) {
    const i = await info(scenario(modo));
    assert.deepEqual(i.services.map((s) => s.id).sort(), ["colore", "lampada", "piega", "taglio", "tc"], modo);
  }
});

test("il mini-sito riceve, per operatore, i servizi che sa davvero fare", async () => {
  const i = await info(scenario("griglia"));
  const di = (id) => (i.staff.find((s) => s.id === id) || {}).serviceIds.slice().sort();
  assert.deepEqual(di("sara"), ["piega", "taglio"]);
  assert.deepEqual(di("federica"), ["colore", "tc"], "solo la coda del misto e il colore");
  assert.deepEqual(di("anna"), ["taglio", "tc"]);
});

test("un operatore non abilitato non riceve slot in nessuno dei tre metodi", async () => {
  for (const modo of MODI) {
    const st = scenario(modo);
    assert.ok((await slots(st, "piega", "sara")).length > 0, `${modo}: Sara fa la piega`);
    assert.deepEqual(await slots(st, "piega", "federica"), [], `${modo}: Federica non è abilitata`);
    assert.deepEqual(await slots(st, "piega", "anna"), [], `${modo}: Anna non è abilitata`);
  }
});

// ---- servizio misto con abilitazioni diverse per fase ---------------------
test("nel misto ogni fase va a chi è abilitato a quella fase", async () => {
  for (const modo of MODI) {
    const st = scenario(modo);
    // ogni metodo propone orari diversi: si prenota il primo che propone lui
    const [hh, mm] = (await slots(st, "tc"))[0].split(":").map(Number);
    const inizio = h(hh, mm);
    const r = await prenota(st, "tc", inizio);
    assert.equal(r.status, 200, modo);
    assert.deepEqual(st.inserite[0].impegni, [
      { tipo: "operatore", risorsaId: "anna", from: inizio, to: inizio + 40 },
      { tipo: "operatore", risorsaId: "federica", from: inizio + 70, to: inizio + 100 },
    ], `${modo}: la prima parte ad Anna, la coda a Federica`);
  }
});

test("se chi fa la coda è occupato, l'orario sparisce in tutti e tre i metodi", async () => {
  for (const modo of MODI) {
    const st = scenario(modo);
    // Federica è l'unica abilitata alla coda: occupandola tutto il giorno il
    // servizio non è più collocabile da nessuna parte
    st.dati.bookings = [{ id: "x", staffId: "federica", date: GIORNO, startMin: h(9), endMin: h(19) }];
    assert.deepEqual(await slots(st, "tc"), [], `${modo}: nessun altro è abilitato alla coda`);
    assert.equal((await prenota(st, "tc", h(10))).status, 409, `${modo}: nemmeno confermabile`);
  }
});

// ---- posa: l'operatore torna libero in mezzo ------------------------------
test("la posa libera l'operatore in tutti e tre i metodi", async () => {
  for (const modo of MODI) {
    const st = scenario(modo);
    assert.equal((await prenota(st, "colore", h(9))).status, 200, modo);
    // Federica è libera 9:10→9:50; il colore lo fa solo lei, quindi un altro
    // colore ci sta solo se la finestra basta — qui verifichiamo l'occupazione
    assert.deepEqual(st.inserite[0].impegni, [
      { tipo: "operatore", risorsaId: "federica", from: h(9), to: h(9, 10) },
      { tipo: "operatore", risorsaId: "federica", from: h(9, 50), to: h(10, 30) },
    ], modo);
    // la coda del misto tocca a Federica: alle 9:20 sarebbe dentro la posa
    const tc = await slots(st, "tc");
    assert.ok(!tc.includes("08:10"), modo);
  }
});

// ---- cabina ---------------------------------------------------------------
test("la cabina occupata blocca lo slot in tutti e tre i metodi", async () => {
  for (const modo of MODI) {
    const st = scenario(modo);
    assert.equal((await prenota(st, "lampada", h(9))).status, 200, modo);
    assert.ok(!(await slots(st, "lampada")).includes("09:00"), `${modo}: cabina occupata`);
    assert.ok((await slots(st, "lampada")).includes("10:00"), `${modo}: libera dalle 10`);
    // gli operatori restano liberi: la lampada non ne impegna nessuno
    assert.ok((await slots(st, "piega")).includes("09:00"), `${modo}: Sara è libera`);
  }
});

test("il servizio a sola cabina non chiede l'operatore", async () => {
  const i = await info(scenario("griglia"));
  assert.equal(i.services.find((s) => s.id === "lampada").senzaOperatore, true);
  assert.equal(i.services.find((s) => s.id === "tc").senzaOperatore, undefined);
});

// ---- ogni slot proposto deve essere davvero confermabile ------------------
test("tutti gli orari proposti sono confermabili, in tutti e tre i metodi", async () => {
  for (const modo of MODI) {
    for (const svc of ["piega", "taglio", "tc", "colore", "lampada"]) {
      const proposti = await slots(scenario(modo), svc);
      assert.ok(proposti.length, `${modo}/${svc}: nessuno slot`);
      for (const label of [proposti[0], proposti[Math.floor(proposti.length / 2)], proposti[proposti.length - 1]]) {
        const [hh, mm] = label.split(":").map(Number);
        const st2 = scenario(modo);
        const r = await prenota(st2, svc, h(hh, mm));
        assert.equal(r.status, 200, `${modo}/${svc}/${label} proposto ma rifiutato`);
      }
    }
  }
});

// ---- le tre modalità restano distinte ------------------------------------
test("i tre metodi propongono insiemi diversi, e sono l'uno sottoinsieme dell'altro dove deve", async () => {
  const g = await slots(scenario("griglia"), "taglio");
  const a = await slots(scenario("antivuoto"), "taglio");
  const o = await slots(scenario("ottimizzata"), "taglio");
  assert.ok(g.length > o.length && o.length >= a.length, `griglia ${g.length}, ottimizzata ${o.length}, anti-vuoto ${a.length}`);
  for (const x of a) assert.ok(g.includes(x), `anti-vuoto ${x} non è fra i liberi`);
  for (const x of o) assert.ok(g.includes(x), `ottimizzata ${x} non è fra i liberi`);
});
