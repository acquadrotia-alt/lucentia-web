// ============================================================================
// STRATO DATI del gestionale: legge e salva le collezioni sul server (D1).
//
// · Le collezioni a elenco (appuntamenti, clienti, vendite, buoni, eventi,
//   fatture, fatture dei fornitori) si salvano UN RECORD ALLA VOLTA:
//   `apiPatchDebounced` confronta l'elenco con l'ultima versione nota del
//   server (la "base") e manda solo ciò che è cambiato (PATCH {upsert, delete}).
//   Così il banco, il telefono (/utenti), la cassa e l'area dei clienti
//   possono scrivere insieme senza pestarsi.
// · `unisciDalServer` è l'altra metà: ogni minuto (e tornando sulla scheda)
//   si rilegge l'elenco e si porta dentro ciò che è cambiato altrove, con una
//   fusione a tre vie (base, locale, server): vince la modifica locale solo
//   sui record che qui sono stati davvero toccati.
// · Le collezioni a oggetto (config, catalog, personale) restano salvate
//   per intero (PUT), come prima.
// · Se la rete manca, i salvataggi finiscono in una CODA nel localStorage e
//   ripartono da soli appena si torna online (modalità offline della cassa).
//   Nel programma della cassa si tiene anche una copia dei dati per aprire
//   la cassa senza rete: scontrini e vendite si registrano, poi si allineano.
// ============================================================================
export const COLLEZIONI_A_RECORD = ["bookings", "clients", "sales", "vouchers", "eventi", "fatture", "acquisti"];
export const chiaveRecord = (coll) => (coll === "clients" ? "code" : "id");
const CODA_KEY = "lc-coda-salvataggi-v1";
const CACHE_KEY = "lc-cassa-copia-v1";

// Da dove arriva il salvataggio (compare nel registro delle attività).
let _origine = "gestionale";
export const impostaOrigine = (o) => { _origine = String(o || "gestionale"); };
export const origineSalvataggi = () => _origine;

// ---- stato della rete e ascoltatori ------------------------------------------
const stato = { offline: false, inCoda: 0, ascoltatori: new Set(), timer: null, ultimoErroreRete: 0 };
const avvisa = () => { stato.inCoda = leggiCoda().length; stato.ascoltatori.forEach((f) => { try { f({ offline: stato.offline, inCoda: stato.inCoda }); } catch (e) {} }); };
export const ascoltaRete = (f) => { stato.ascoltatori.add(f); f({ offline: stato.offline, inCoda: leggiCoda().length }); return () => stato.ascoltatori.delete(f); };
export const statoRete = () => ({ offline: stato.offline, inCoda: leggiCoda().length });
const segnaOffline = () => { stato.ultimoErroreRete = Date.now(); if (!stato.offline) { stato.offline = true; avvisa(); } programmaRitorno(); };
const segnaOnline = () => { if (stato.offline) { stato.offline = false; avvisa(); } };
function programmaRitorno() {
  if (stato.timer || typeof window === "undefined") return;
  stato.timer = setInterval(async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    try { const r = await fetch("/api/health", { cache: "no-store" }); if (r.ok) { clearInterval(stato.timer); stato.timer = null; segnaOnline(); await svuotaCoda(); } } catch (e) {}
  }, 15000);
}
if (typeof window !== "undefined") {
  window.addEventListener("online", () => { svuotaCoda(); });
  window.addEventListener("offline", () => { segnaOffline(); });
}
const erroreDiRete = (e) => !!e && (e.name === "TypeError" || /fetch|network|rete/i.test(String(e && e.message)));

// ---- la coda dei salvataggi non riusciti --------------------------------------
function leggiCoda() { try { const v = JSON.parse(localStorage.getItem(CODA_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function scriviCoda(c) { try { localStorage.setItem(CODA_KEY, JSON.stringify(c)); } catch (e) {} }
function accoda(voce) {
  const c = leggiCoda();
  // un PUT della stessa collezione sostituisce quello già in coda (vale l'ultimo); le patch si accumulano
  const n = voce.tipo === "put" ? c.filter((x) => !(x.tipo === "put" && x.coll === voce.coll)) : c;
  n.push({ ...voce, ts: Date.now() });
  scriviCoda(n); avvisa();
}
let svuotando = false;
// Rimanda ciò che è in coda, nell'ordine; si ferma al primo errore di rete.
export async function svuotaCoda() {
  if (svuotando) return { inviate: 0 };
  svuotando = true;
  let inviate = 0;
  try {
    let c = leggiCoda();
    while (c.length) {
      const v = c[0];
      const r = v.tipo === "put" ? await inviaPut(v.coll, v.value, v.origine) : await inviaPatch(v.coll, v.patch, v.origine);
      if (!r.ok && r.rete) { segnaOffline(); break; }
      // riuscita, o rifiutata dal server (licenza, errore): in entrambi i casi non resta in coda
      if (r.ok && v.tipo === "patch") aggiornaBase(v.coll, v.patch);
      c = c.slice(1); scriviCoda(c); inviate++;
      segnaOnline();
    }
    if (!c.length) segnaOnline();
  } finally { svuotando = false; avvisa(); }
  return { inviate };
}

// ---- letture --------------------------------------------------------------------
export async function apiLoadEsito(coll) {
  try {
    const r = await fetch(`/api/data/${coll}`, { cache: "no-store" });
    if (!r.ok) { const j = await r.json().catch(() => ({})); return { ok: false, status: r.status, error: (j && j.error) || `HTTP ${r.status}` }; }
    const j = await r.json(); segnaOnline();
    return { ok: true, value: j && j.value != null ? j.value : null };
  } catch (e) { if (erroreDiRete(e)) segnaOffline(); return { ok: false, rete: true, error: "errore di rete" }; }
}
export async function apiLoad(coll, fallback) {
  const r = await apiLoadEsito(coll);
  if (!r.ok || r.value == null) return fallback;
  if (COLLEZIONI_A_RECORD.includes(coll) && Array.isArray(r.value)) fissaBase(coll, r.value);
  return r.value;
}

// ---- la base: l'ultima versione di ogni record che il server conosce ---------
const _base = {}; // coll -> Map(chiave -> JSON del record)
const chiaveDi = (coll, r) => { const k = chiaveRecord(coll); return r && typeof r === "object" && r[k] != null && r[k] !== "" ? String(r[k]) : null; };
export function fissaBase(coll, lista) {
  const m = new Map();
  for (const r of lista || []) { const k = chiaveDi(coll, r); if (k != null) m.set(k, JSON.stringify(r)); }
  _base[coll] = m;
}
function aggiornaBase(coll, patch) {
  const m = _base[coll] || (_base[coll] = new Map());
  (patch.upsert || []).forEach((r) => { const k = chiaveDi(coll, r); if (k != null) m.set(k, JSON.stringify(r)); });
  (patch.delete || []).forEach((k) => m.delete(String(k)));
}
// Cosa manda al server rispetto alla base. `null` = non si può fare per record (manca una chiave).
export function differenze(coll, lista) {
  if (!Array.isArray(lista)) return null;
  const m = _base[coll];
  if (!m) return null;
  const upsert = [], visti = new Set();
  for (const r of lista) {
    const k = chiaveDi(coll, r);
    if (k == null) return null;
    if (visti.has(k)) continue; visti.add(k);
    const js = JSON.stringify(r);
    if (m.get(k) !== js) upsert.push(r);
  }
  const del = [...m.keys()].filter((k) => !visti.has(k));
  return { upsert, delete: del };
}

// ---- scritture ------------------------------------------------------------------
async function inviaPut(coll, value, origine) {
  try {
    const r = await fetch(`/api/data/${coll}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value, origine: origine || _origine }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); return { ok: false, status: r.status, error: (j && j.error) || `HTTP ${r.status}` }; }
    segnaOnline(); return { ok: true };
  } catch (e) { if (erroreDiRete(e)) segnaOffline(); return { ok: false, rete: true, error: "errore di rete" }; }
}
async function inviaPatch(coll, patch, origine) {
  try {
    const r = await fetch(`/api/data/${coll}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ upsert: patch.upsert || [], delete: patch.delete || [], origine: origine || _origine }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); return { ok: false, status: r.status, error: (j && j.error) || `HTTP ${r.status}` }; }
    segnaOnline(); return { ok: true };
  } catch (e) { if (erroreDiRete(e)) segnaOffline(); return { ok: false, rete: true, error: "errore di rete" }; }
}
// Salvataggio per intero (collezioni a oggetto, o elenchi senza chiave). Con la rete assente va in coda.
export async function apiSaveVerificato(coll, value) {
  const r = await inviaPut(coll, value);
  if (r.ok && COLLEZIONI_A_RECORD.includes(coll) && Array.isArray(value)) fissaBase(coll, value);
  if (!r.ok && r.rete) { accoda({ tipo: "put", coll, value, origine: _origine }); if (COLLEZIONI_A_RECORD.includes(coll) && Array.isArray(value)) fissaBase(coll, value); return { ok: true, inCoda: true }; }
  return r;
}
export async function apiSave(coll, value) { await apiSaveVerificato(coll, value); }
// Salvataggio di un elenco per record: manda solo le differenze dalla base.
export async function apiPatchVerificato(coll, lista) {
  const d = differenze(coll, lista);
  if (!d) return apiSaveVerificato(coll, lista);
  if (!d.upsert.length && !d.delete.length) return { ok: true, vuoto: true };
  const r = await inviaPatch(coll, d);
  if (r.ok) { aggiornaBase(coll, d); return { ok: true, upsert: d.upsert.length, delete: d.delete.length }; }
  if (r.rete) { accoda({ tipo: "patch", coll, patch: d, origine: _origine }); aggiornaBase(coll, d); return { ok: true, inCoda: true }; }
  return r;
}
export const _saveTimers = {};
export function apiSaveDebounced(coll, value, delay = 800) {
  clearTimeout(_saveTimers[coll]);
  _saveTimers[coll] = setTimeout(() => { if (COLLEZIONI_A_RECORD.includes(coll) && Array.isArray(value)) apiPatchVerificato(coll, value); else apiSaveVerificato(coll, value); }, delay);
}
export const apiPatchDebounced = apiSaveDebounced;

// ---- la fusione a tre vie con ciò che è cambiato altrove ---------------------
// Torna { lista, cambiata }: `lista` è l'elenco locale con dentro le modifiche
// arrivate dal server (record nuovi, modificati o cancellati da altri
// dispositivi), tranne quelli che qui sono stati modificati e non ancora
// salvati, che restano come sono.
export async function unisciDalServer(coll, locale) {
  if (!Array.isArray(locale)) return { lista: locale, cambiata: false, applica() {} };
  if (leggiCoda().length) await svuotaCoda();
  if (leggiCoda().length) return { lista: locale, cambiata: false, applica() {} }; // ancora offline: non si tocca niente
  const r = await apiLoadEsito(coll);
  if (!r.ok || !Array.isArray(r.value)) return { lista: locale, cambiata: false, applica() {} };
  return { ...unisci(coll, locale, r.value), server: r.value };
}
// Fusione pura: non tocca la base finché non si chiama `applica()` (cioè
// quando l'elenco fuso è davvero diventato quello in uso).
export function unisci(coll, locale, server) {
  const base = _base[coll] || new Map();
  const nuovaBase = new Map(base);
  const mServer = new Map(); for (const s of server) { const k = chiaveDi(coll, s); if (k != null) mServer.set(k, s); }
  const mLocale = new Set();
  const out = []; let cambiata = false;
  for (const L of locale) {
    const k = chiaveDi(coll, L);
    if (k == null) { out.push(L); continue; }
    mLocale.add(k);
    const jl = JSON.stringify(L), B = base.get(k), S = mServer.get(k);
    if (!S) {
      if (B != null && jl === B) { nuovaBase.delete(k); cambiata = true; continue; } // cancellato altrove, qui intatto
      out.push(L); continue; // nuovo qui (o modificato qui): resta
    }
    const js = JSON.stringify(S);
    if (js === jl) { nuovaBase.set(k, js); out.push(L); continue; }
    if (B == null || jl === B) { nuovaBase.set(k, js); out.push(S); cambiata = true; continue; } // cambiato altrove, qui intatto
    out.push(L); // modificato qui e non ancora salvato: vince il locale
  }
  for (const [k, S] of mServer) {
    if (mLocale.has(k)) continue;
    if (base.has(k)) continue; // lo abbiamo cancellato qui, salvataggio in corso
    nuovaBase.set(k, JSON.stringify(S)); out.push(S); cambiata = true;
  }
  return { lista: cambiata ? out : locale, cambiata, applica() { _base[coll] = nuovaBase; } };
}

// ---- la copia locale per la cassa senza rete -----------------------------------
const oggiISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const giorniFa = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export function scriviCopiaCassa(d) {
  try {
    const da = giorniFa(7);
    const copia = { il: Date.now(), config: d.config, catalog: d.catalog, clients: d.clients, vouchers: d.vouchers || [], bookings: (d.bookings || []).filter((b) => b && b.date >= da), sales: (d.sales || []).slice(0, 400), eventi: (d.eventi || []).filter((e) => e && e.date >= oggiISO()) };
    localStorage.setItem(CACHE_KEY, JSON.stringify(copia));
  } catch (e) {}
}
export function leggiCopiaCassa() { try { const v = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); return v && v.config ? v : null; } catch (e) { return null; } }
export const copiaCassaOre = (c) => (c && c.il ? Math.round((Date.now() - c.il) / 360000) / 10 : null);
