// Salvataggi per singolo record (PATCH /api/data/:coll), registro delle
// attività e fusione a tre vie lato gestionale (dati.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";
import { applicaPatch } from "../server/core/salone.js";
import { fissaBase, differenze, unisci } from "../src/core/salone/dati.js";

const AID = "az1";
function db(st) {
  return {
    prepare(sql) {
      let a = [];
      const self = {
        bind(...x) { a = x; return self; },
        async first() {
          if (sql.includes("FROM sessioni s JOIN utenti u")) return a[0] === "tok" ? st.sessione : null;
          if (sql.startsWith("SELECT * FROM aziende")) return st.azienda;
          if (sql.includes("FROM dati_app")) { const v = st.dati[a[1]]; return v === undefined ? null : { dati: JSON.stringify(v) }; }
          if (sql.startsWith("SELECT id, dettagli FROM registro")) return st.registro.find((r) => r.chi === a[1] && r.tipo === a[2] && r.testo === a[3]) || null;
          return null;
        },
        async all() {
          if (sql.startsWith("SELECT * FROM registro")) return { results: st.registro.slice().reverse() };
          return { results: [] };
        },
        async run() {
          if (sql.startsWith("INSERT INTO dati_app")) { if (sql.includes("'personale'")) st.dati.personale = JSON.parse(a[2]); else st.dati[a[2]] = JSON.parse(a[3]); }
          else if (sql.startsWith("INSERT INTO registro")) st.registro.push({ id: a[0], azienda_id: a[1], chi: a[2], origine: a[3], tipo: a[4], testo: a[5], dettagli: a[6], quando: "2026-11-04 10:00:00" });
          else if (sql.startsWith("UPDATE registro SET")) { const r = st.registro.find((x) => x.id === a[1]); if (r) r.dettagli = a[0]; }
          return { success: true };
        },
      };
      return self;
    },
  };
}
const scenario = () => ({
  azienda: { id: AID, denominazione: "Prova", attiva: 1, licenza_scadenza: "2099-01-01", moduli: null, demo: 0 },
  sessione: { token: "tok", scadenza: "2099-01-01T00:00:00.000Z", uid: "u1", email: "titolare@prova.it", ruolo: "azienda", azienda_id: AID, nome: "T", staff_id: null },
  dati: { bookings: [{ id: "b1", clientName: "Anna", date: "2026-11-05", startMin: 600 }, { id: "b2", clientName: "Luca", date: "2026-11-05", startMin: 660 }], clients: [{ code: "10001", name: "Anna" }] },
  registro: [],
});
async function chiama(st, path, { method = "GET", body } = {}) {
  const res = await onRequest({ request: new Request("https://salone.test" + path, { method, headers: { "Content-Type": "application/json", Cookie: "sid=tok" }, body: body ? JSON.stringify(body) : undefined }), env: { DB: db(st), SETUP_TOKEN: "x" }, params: { path: path.replace(/^\/api\/?/, "").split("?")[0].split("/").filter(Boolean) } });
  return { status: res.status, body: await res.json() };
}

test("applicaPatch: sostituisce al posto, aggiunge in coda, cancella; i clienti usano code", () => {
  const r = applicaPatch("bookings", [{ id: "a" }, { id: "b", x: 1 }, { id: "c" }], { upsert: [{ id: "b", x: 2 }, { id: "d" }], delete: ["c"] });
  assert.deepEqual(r.lista, [{ id: "a" }, { id: "b", x: 2 }, { id: "d" }]);
  assert.equal(r.upsert, 2); assert.equal(r.delete, 1);
  const c = applicaPatch("clients", [{ code: "1", name: "A" }], { upsert: [{ code: "1", name: "B" }, { name: "senza chiave" }] });
  assert.deepEqual(c.lista, [{ code: "1", name: "B" }]);
});

test("PATCH /api/data/bookings tocca solo i record indicati e scrive il registro", async () => {
  const st = scenario();
  const r = await chiama(st, "/api/data/bookings", { method: "PATCH", body: { upsert: [{ id: "b2", clientName: "Luca", date: "2026-11-05", startMin: 720 }, { id: "b3", clientName: "Sara", date: "2026-11-06", startMin: 600 }], delete: ["b1"], origine: "telefono" } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(st.dati.bookings.map((b) => b.id), ["b2", "b3"]);
  assert.equal(st.dati.bookings[0].startMin, 720);
  assert.equal(st.registro.length, 1);
  assert.equal(st.registro[0].tipo, "dati"); assert.equal(st.registro[0].origine, "telefono"); assert.match(st.registro[0].testo, /appuntamenti: 2 record salvati, 1 eliminato/);
  assert.match(st.registro[0].dettagli, /Sara/);
  // una collezione a oggetto non si tocca per record
  assert.equal((await chiama(st, "/api/data/config", { method: "PATCH", body: { upsert: [] } })).status, 400);
  // il PUT delle impostazioni finisce nel registro, e le ripetizioni si fondono
  await chiama(st, "/api/data/config", { method: "PUT", body: { value: { a: 1 } } });
  await chiama(st, "/api/data/config", { method: "PUT", body: { value: { a: 2 } } });
  const imp = st.registro.filter((x) => x.tipo === "impostazioni");
  assert.equal(imp.length, 1); assert.match(imp[0].dettagli, /"volte":2/);
  const lista = await chiama(st, "/api/registro?limit=10");
  assert.equal(lista.status, 200); assert.equal(lista.body.items.length, 2);
  const nota = await chiama(st, "/api/registro", { method: "POST", body: { tipo: "cassa", testo: "Scontrino n. 12" } });
  assert.equal(nota.status, 200); assert.equal(st.registro.length, 3);
});

test("l'operatore non può scrivere per record", async () => {
  const st = scenario();
  st.sessione = { ...st.sessione, ruolo: "operatore", staff_id: "a1" };
  assert.equal((await chiama(st, "/api/data/bookings", { method: "PATCH", body: { upsert: [{ id: "x" }] } })).status, 403);
});

test("differenze: parte solo ciò che è cambiato rispetto alla base", () => {
  fissaBase("sales", [{ id: "s1", total: 10 }, { id: "s2", total: 20 }]);
  const d = differenze("sales", [{ id: "s1", total: 10 }, { id: "s2", total: 25 }, { id: "s3", total: 5 }]);
  assert.deepEqual(d.upsert.map((x) => x.id), ["s2", "s3"]); assert.deepEqual(d.delete, []);
  assert.deepEqual(differenze("sales", [{ id: "s1", total: 10 }]).delete, ["s2"]);
  assert.equal(differenze("sales", [{ id: "s1" }, { total: 1 }]), null, "senza chiave si torna al salvataggio intero");
});

test("unisci: tre vie — vince il locale solo sui record toccati qui", () => {
  fissaBase("bookings", [{ id: "a", v: 1 }, { id: "b", v: 1 }, { id: "c", v: 1 }, { id: "d", v: 1 }]);
  const locale = [{ id: "a", v: 1 }, { id: "b", v: 2 }, { id: "c", v: 1 }, { id: "d", v: 1 }, { id: "nuovoQui", v: 1 }];
  const server = [{ id: "a", v: 9 }, { id: "b", v: 9 }, { id: "d", v: 1 }, { id: "nuovoLa", v: 1 }];
  const r = unisci("bookings", locale, server);
  assert.equal(r.cambiata, true);
  const per = Object.fromEntries(r.lista.map((x) => [x.id, x.v]));
  assert.equal(per.a, 9, "cambiato altrove e intatto qui: arriva");
  assert.equal(per.b, 2, "modificato qui: resta il locale");
  assert.equal(per.c, undefined, "cancellato altrove e intatto qui: sparisce");
  assert.equal(per.d, 1);
  assert.equal(per.nuovoQui, 1, "nuovo qui, non ancora salvato: resta");
  assert.equal(per.nuovoLa, 1, "nuovo altrove: arriva");
  r.applica();
  // dopo la fusione, le differenze da mandare sono solo le modifiche locali
  const d = differenze("bookings", r.lista);
  assert.deepEqual(d.upsert.map((x) => x.id).sort(), ["b", "nuovoQui"]); assert.deepEqual(d.delete, []);
  // senza applica() la base non cambia
  const r2 = unisci("bookings", [{ id: "a", v: 9 }], [{ id: "a", v: 9 }]);
  assert.equal(r2.cambiata, false);
});

test("timbratura dal telefono: entrata e uscita di oggi nel foglio ore, una volta sola", async () => {
  const st = scenario();
  st.dati.config = { staff: [{ id: "a1", name: "Giulia" }] };
  st.dati.personale = { dipendenti: [], ore: {} };
  assert.equal((await chiama(st, "/api/timbra", { method: "POST", body: { staffId: "zz", azione: "entrata" } })).status, 404);
  const e = await chiama(st, "/api/timbra", { method: "POST", body: { staffId: "a1", azione: "entrata" } });
  assert.equal(e.status, 200, JSON.stringify(e.body));
  assert.equal(e.body.dipId, "st-a1"); assert.match(e.body.giorno.entrata, /^\d\d:\d\d$/); assert.equal(e.body.giorno.tipo, "lavoro"); assert.equal(e.body.giorno.timbrato, true);
  assert.equal(st.dati.personale.ore["st-a1"][e.body.data].entrata, e.body.giorno.entrata);
  assert.equal((await chiama(st, "/api/timbra", { method: "POST", body: { staffId: "a1", azione: "entrata" } })).status, 409, "già timbrata");
  const u = await chiama(st, "/api/timbra", { method: "POST", body: { staffId: "a1", azione: "uscita" } });
  assert.equal(u.status, 200); assert.ok(u.body.giorno.uscita);
  const g = await chiama(st, "/api/timbra?staffId=a1");
  assert.equal(g.body.giorno.uscita, u.body.giorno.uscita);
  assert.ok(st.registro.some((r) => r.tipo === "personale" && /Giulia: timbrata entrata/.test(r.testo)));
  // un operatore timbra solo per sé
  st.sessione = { ...st.sessione, ruolo: "operatore", staff_id: "a1" };
  assert.equal((await chiama(st, "/api/timbra", { method: "POST", body: { staffId: "a2", azione: "entrata" } })).status, 403);
});
