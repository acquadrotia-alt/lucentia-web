// Test della rotta pubblica /api/prenota/:aid con la modalità "ottimizzata"
// attiva: verifica che l'impostazione venga letta davvero dal salone e che la
// conferma finale impedisca la doppia prenotazione dello stesso orario.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";

const h = (hh, mm = 0) => hh * 60 + mm;
const GIORNO = "2030-06-12"; // mercoledì
const AID = "az1";

function scenario(mode) {
  const config = {
    services: [{ id: "piega", name: "Piega", durationMin: 30 }, { id: "taglio", name: "Taglio", durationMin: 45 }],
    staff: [{ id: "a1", name: "Giulia", serviceIds: ["piega", "taglio"], availability: { 3: [[h(9), h(12)]] } }],
    closures: [],
    onlineBooking: { mode, leadHours: 0, horizonDays: 30 },
  };
  return {
    config,
    aziende: { [AID]: { id: AID, denominazione: "Salone Test", attiva: 1, licenza_scadenza: "2099-01-01", moduli: JSON.stringify(["online", "opinf"]) } },
    dati: { config, bookings: [{ id: "b1", staffId: "a1", date: GIORNO, startMin: h(9), endMin: h(10) }], clients: [], eventi: [] },
    online: [],  // prenotazioni_online già registrate
    inserite: [],
  };
}

function db(st) {
  return {
    prepare(sql) {
      let a = [];
      const self = {
        bind(...x) { a = x; return self; },
        async first() {
          if (sql.startsWith("SELECT * FROM aziende")) return st.aziende[a[0]] || null;
          if (sql.includes("FROM dati_app")) { const v = st.dati[a[1]]; return v === undefined ? null : { dati: JSON.stringify(v) }; }
          return null;
        },
        async all() {
          if (sql.includes("FROM prenotazioni_online")) {
            return { results: st.online.map((o) => ({ id: o.id, staff_id: o.staffId, start_min: o.startMin, end_min: o.endMin })) };
          }
          return { results: [] };
        },
        async run() {
          if (sql.startsWith("INSERT INTO prenotazioni_online")) {
            st.inserite.push({ id: a[0], startMin: a[3], endMin: a[4], staffId: a[6] });
            st.online.push({ id: a[0], staffId: a[6], startMin: a[3], endMin: a[4] });
          }
          return { success: true };
        },
      };
      return self;
    },
  };
}

async function chiama(st, path, { method = "GET", body } = {}) {
  const res = await onRequest({
    request: new Request("https://x" + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }),
    env: { DB: db(st), SETUP_TOKEN: "x" },
    params: { path: path.replace(/^\/api\/?/, "").split("?")[0].split("/").filter(Boolean) },
  });
  return { status: res.status, body: await res.json() };
}

const slotsDi = async (st, servizio) =>
  (await chiama(st, `/api/prenota/${AID}/slots?date=${GIORNO}&service=${servizio}`)).body.slots.map((s) => s.label);

test("la modalità impostata dal salone decide gli orari proposti", async () => {
  // agenda: 09:00-10:00 occupato, libero 10:00-12:00. Servizio: taglio da 45.
  assert.deepEqual(await slotsDi(scenario("antivuoto"), "taglio"), ["10:00"]);
  assert.deepEqual(await slotsDi(scenario("griglia"), "taglio"), ["10:00", "10:15", "10:30", "10:45", "11:00", "11:15"]);
  // ottimizzata: solo i bordi, gli orari intermedi lascerebbero spezzoni
  assert.deepEqual(await slotsDi(scenario("ottimizzata"), "taglio"), ["10:00", "11:15"]);
});

test("una modalità non riconosciuta ricade su anti-vuoto", async () => {
  assert.deepEqual(await slotsDi(scenario("qualcosa-di-ignoto"), "taglio"), ["10:00"]);
});

test("due clienti sullo stesso orario: il secondo viene rifiutato", async () => {
  const st = scenario("ottimizzata");
  const dati = { date: GIORNO, service: "taglio", start: h(10), name: "Maria Bianchi", phone: "3401112233" };

  const primo = await chiama(st, `/api/prenota/${AID}`, { method: "POST", body: dati });
  assert.equal(primo.status, 200);
  assert.equal(primo.body.conferma.label, "10:00");
  assert.equal(st.inserite.length, 1);

  // stesso slot, secondo cliente: l'orario ora è occupato
  const secondo = await chiama(st, `/api/prenota/${AID}`, { method: "POST", body: { ...dati, name: "Anna Russo", phone: "3402223344" } });
  assert.equal(secondo.status, 409);
  assert.match(secondo.body.error, /non è più disponibile/);
  assert.equal(st.inserite.length, 1, "nessuna seconda riga scritta in agenda");
});

test("uno slot libero ma non ottimale resta comunque confermabile", async () => {
  const st = scenario("ottimizzata");
  // 10:15 è tecnicamente libero ma la modalità non lo propone: frammenterebbe
  assert.ok(!(await slotsDi(st, "taglio")).includes("10:15"));
  // la verifica finale però guarda solo se lo slot è occupato: rifiutarlo
  // sarebbe una disponibilità persa senza motivo (es. slot visto poco prima,
  // o giudizio cambiato per una prenotazione altrui nel frattempo)
  const r = await chiama(st, `/api/prenota/${AID}`, { method: "POST", body: { date: GIORNO, service: "taglio", start: h(10, 15), name: "Laura Costa", phone: "3403334455" } });
  assert.equal(r.status, 200);
  assert.equal(st.inserite[0].startMin, h(10, 15));
});

test("le prenotazioni online già registrate occupano l'agenda", async () => {
  const st = scenario("ottimizzata");
  st.online.push({ id: "o1", staffId: "a1", startMin: h(10), endMin: h(11) });
  assert.deepEqual(await slotsDi(st, "piega"), ["11:00", "11:30"]);
});
