// Portale: installazioni cliente e verifica della licenza da parte di
// un'installazione (id + chiave). Database simulato in memoria.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";

// Un piccolo D1 finto: capisce le poche query che il modulo installazioni usa.
function db(st) {
  return {
    prepare(sql) {
      let a = [];
      const self = {
        bind(...x) { a = x; return self; },
        async first() {
          if (sql.includes("FROM sessioni s JOIN utenti u")) return st.sessione && a[0] === "tok" ? st.sessione : null;
          if (sql.startsWith("SELECT * FROM installazioni WHERE id = ?")) return st.inst[a[0]] || null;
          return null;
        },
        async all() {
          if (sql.startsWith("SELECT * FROM installazioni")) return { results: Object.values(st.inst) };
          return { results: [] };
        },
        async run() {
          if (sql.startsWith("INSERT INTO installazioni")) {
            st.inst[a[0]] = { id: a[0], nome: a[1], dominio: a[2], chiave_hash: a[3], licenza_scadenza: a[4], attiva: 1, moduli: a[5], moduli_disponibili: "[]", note: a[6], creata_il: "2026-10-31" };
          } else if (sql.startsWith("UPDATE installazioni SET")) {
            const id = a[a.length - 1]; const r = st.inst[id];
            const campi = sql.match(/SET (.*) WHERE/)[1].split(",").map((s) => s.trim().split(" = ")[0]);
            campi.forEach((c, i) => { r[c] = a[i]; });
          } else if (sql.startsWith("DELETE FROM installazioni")) delete st.inst[a[0]];
          return { success: true };
        },
      };
      return self;
    },
  };
}

const admin = { token: "tok", scadenza: "2099-01-01T00:00:00.000Z", uid: "u1", email: "admin@x.it", ruolo: "reseller", azienda_id: null, nome: "Admin", staff_id: null, reseller_parent: null };
async function chiama(st, path, { method = "GET", body, auth = true } = {}) {
  const res = await onRequest({
    request: new Request("https://portale.test" + path, { method, headers: { "Content-Type": "application/json", ...(auth ? { Cookie: "sid=tok" } : {}) }, body: body ? JSON.stringify(body) : undefined }),
    env: { DB: db(st), SETUP_TOKEN: "x" },
    params: { path: path.replace(/^\/api\/?/, "").split("?")[0].split("/").filter(Boolean) },
  });
  return { status: res.status, body: await res.json() };
}
const scenario = () => ({ inst: {}, sessione: admin });

test("si crea un'installazione e la chiave si vede una volta sola", async () => {
  const st = scenario();
  const r = await chiama(st, "/api/installazioni", { method: "POST", body: { nome: "Salone Bellezza", dominio: "https://salonebellezza.it/", mesi: 12, moduli: ["fidelity", "opinf", "online"] } });
  assert.equal(r.status, 200);
  assert.match(r.body.chiave, /^[0-9a-f]{64}$/);
  const riga = st.inst[r.body.id];
  assert.equal(riga.dominio, "salonebellezza.it", "il dominio viene ripulito");
  assert.notEqual(riga.chiave_hash, r.body.chiave, "nel database resta solo l'impronta");
  const lista = await chiama(st, "/api/installazioni");
  assert.equal(lista.body.items.length, 1);
  assert.equal(lista.body.items[0].stato, "active");
  assert.deepEqual(lista.body.items[0].moduli, ["fidelity", "opinf", "online"]);
  assert.equal(lista.body.items[0].chiave, undefined, "la lista non espone mai la chiave");
});

test("senza sessione amministratore le installazioni non si toccano", async () => {
  const st = scenario(); st.sessione = null;
  assert.equal((await chiama(st, "/api/installazioni", { auth: false })).status, 401);
  st.sessione = { ...admin, ruolo: "azienda", azienda_id: "az1" };
  assert.equal((await chiama(st, "/api/installazioni")).status, 403);
});

test("l'installazione si verifica con id e chiave e riceve licenza e moduli", async () => {
  const st = scenario();
  const c = await chiama(st, "/api/installazioni", { method: "POST", body: { nome: "Salone Test", mesi: 12, moduli: ["vendite", "op3"] } });
  const { id, chiave } = c.body;

  // chiave sbagliata → 401, id sconosciuto → 404
  assert.equal((await chiama(st, "/api/licenze/verifica", { method: "POST", auth: false, body: { id, chiave: "x".repeat(64) } })).status, 401);
  assert.equal((await chiama(st, "/api/licenze/verifica", { method: "POST", auth: false, body: { id: "nope", chiave } })).status, 404);

  // chiave giusta: stato, moduli, e il portale annota versione, dominio e moduli su misura dichiarati
  const v = await chiama(st, "/api/licenze/verifica", { method: "POST", auth: false, body: { id, chiave, versione: "2.0.0", dominio: "salonetest.it", moduli_disponibili: [{ key: "whatsapp-auto", label: "Promemoria WhatsApp", desc: "Il giorno prima" }, { key: "fidelity", label: "non deve passare: è del core" }] } });
  assert.equal(v.status, 200);
  assert.equal(v.body.stato, "active");
  assert.deepEqual(v.body.moduli, ["vendite", "op3"]);
  const riga = st.inst[id];
  assert.equal(riga.versione, "2.0.0");
  assert.equal(riga.dominio_rilevato, "salonetest.it");
  assert.deepEqual(JSON.parse(riga.moduli_disponibili).map((m) => m.key), ["whatsapp-auto"]);
  assert.ok(riga.ultimo_contatto);

  // ora l'amministratore vede l'interruttore su misura e può accenderlo
  const lista = await chiama(st, "/api/installazioni");
  assert.deepEqual(lista.body.items[0].moduli_disponibili.map((m) => m.key), ["whatsapp-auto"]);
  const p = await chiama(st, `/api/installazioni/${id}`, { method: "PATCH", body: { moduli: ["vendite", "op3", "whatsapp-auto", "inventato"] } });
  assert.equal(p.status, 200);
  const v2 = await chiama(st, "/api/licenze/verifica", { method: "POST", auth: false, body: { id, chiave } });
  assert.deepEqual(v2.body.moduli, ["vendite", "op3", "whatsapp-auto"], "i moduli dichiarati passano, quelli inventati no");
});

test("sospensione, rinnovo e rigenerazione della chiave", async () => {
  const st = scenario();
  const c = await chiama(st, "/api/installazioni", { method: "POST", body: { nome: "Salone Test", mesi: 1 } });
  const { id, chiave } = c.body;
  await chiama(st, `/api/installazioni/${id}`, { method: "PATCH", body: { attiva: false } });
  let v = await chiama(st, "/api/licenze/verifica", { method: "POST", auth: false, body: { id, chiave } });
  assert.equal(v.body.stato, "disabled", "sospesa dal portale → l'installazione lo sa");
  await chiama(st, `/api/installazioni/${id}`, { method: "PATCH", body: { attiva: true, rinnovaMesi: 0 } });
  v = await chiama(st, "/api/licenze/verifica", { method: "POST", auth: false, body: { id, chiave } });
  assert.equal(v.body.stato, "active");
  assert.equal(v.body.licenza_scadenza, null, "rinnovo con 0 mesi = illimitata");

  const r = await chiama(st, `/api/installazioni/${id}`, { method: "PATCH", body: { rigeneraChiave: true } });
  assert.match(r.body.chiave, /^[0-9a-f]{64}$/);
  assert.notEqual(r.body.chiave, chiave);
  assert.equal((await chiama(st, "/api/licenze/verifica", { method: "POST", auth: false, body: { id, chiave } })).status, 401, "la vecchia chiave non vale più");
  assert.equal((await chiama(st, "/api/licenze/verifica", { method: "POST", auth: false, body: { id, chiave: r.body.chiave } })).status, 200);
});

test("sul portale /api/installazione risponde hub e le rotte cliente non esistono", async () => {
  const st = scenario();
  const r = await chiama(st, "/api/installazione", { auth: false });
  assert.equal(r.body.modalita, "hub");
  assert.equal((await chiama(st, "/api/sito", { auth: false })).status, 401);
});
