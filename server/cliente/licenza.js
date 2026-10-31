// ============================================================================
// Installazione cliente: la licenza arriva da Lucentia.
//
// L'installazione si presenta al portale con INSTALLAZIONE_ID e
// INSTALLAZIONE_CHIAVE (variabili d'ambiente del progetto Cloudflare) e
// riceve stato, scadenza e moduli attivi. La risposta viene copiata nella
// riga `aziende` del salone, così tutto il resto del codice (licStatus,
// parseModuli, i limiti operatori…) continua a leggere da lì come sempre.
//
// Tolleranza: la verifica si ripete al massimo ogni INTERVALLO; se Lucentia
// non risponde si usa l'ultimo esito buono per TOLLERANZA giorni, poi il
// gestionale si ferma ("non_verificata"). Un portale che risponde "chiave
// non valida" o "installazione sconosciuta" ferma subito ("rifiutata").
//
// Senza HUB_URL la licenza è quella scritta nella riga `aziende`: serve per
// lo sviluppo e per le emergenze (vedi LEGGIMI.md).
// ============================================================================
import { json, licStatus, APP_VERSION, MODULI } from "../core/util.js";
import { MODULI_CLIENTE } from "../../src/cliente/moduli.js";

export const INTERVALLO_MS = 6 * 3600 * 1000;      // riverifica ogni 6 ore
export const TOLLERANZA_MS = 7 * 24 * 3600 * 1000; // senza portale, 7 giorni di grazia
const MEMO_MS = 10 * 60 * 1000;                    // in memoria, per non rileggere il DB a ogni richiesta

// Stato in memoria dell'isolate: sopravvive tra richieste vicine, non oltre.
let memo = { at: 0, esito: null };
export function azzeraMemo() { memo = { at: 0, esito: null }; }

export function configurata(env) { return !!(env && env.HUB_URL && env.INSTALLAZIONE_ID && env.INSTALLAZIONE_CHIAVE); }
export function chiaviExtra() { return MODULI_CLIENTE.map((m) => m.key).filter((k) => !MODULI.includes(k)); }

// Il salone di questa installazione: ce n'è uno solo.
export async function aziendaCliente(env) {
  if (env.INSTALLAZIONE_ID) {
    const r = await env.DB.prepare("SELECT * FROM aziende WHERE id = ?").bind(env.INSTALLAZIONE_ID).first();
    if (r) return r;
  }
  return await env.DB.prepare("SELECT * FROM aziende WHERE demo = 0 OR demo IS NULL ORDER BY creata_il LIMIT 1").first();
}

async function leggiCache(env) {
  try {
    const r = await env.DB.prepare("SELECT * FROM licenza_locale WHERE id = 'hub'").first();
    if (!r) return null;
    return { dati: JSON.parse(r.dati || "null"), verificata_il: r.verificata_il ? Date.parse(r.verificata_il) : 0, tentata_il: r.tentata_il ? Date.parse(r.tentata_il) : 0 };
  } catch (e) { return null; }
}
async function scriviCache(env, dati, verificata) {
  const ora = new Date().toISOString();
  await env.DB.prepare("INSERT INTO licenza_locale (id, dati, verificata_il, tentata_il) VALUES ('hub', ?, ?, ?) ON CONFLICT(id) DO UPDATE SET dati = excluded.dati, verificata_il = COALESCE(excluded.verificata_il, licenza_locale.verificata_il), tentata_il = excluded.tentata_il")
    .bind(JSON.stringify(dati), verificata ? ora : null, ora).run();
}

// Applica l'esito del portale alla riga del salone.
async function applica(env, az, r) {
  if (!az) return;
  await env.DB.prepare("UPDATE aziende SET licenza_scadenza = ?, attiva = ?, moduli = ? WHERE id = ?")
    .bind(r.licenza_scadenza || null, r.attiva ? 1 : 0, JSON.stringify(Array.isArray(r.moduli) ? r.moduli : []), az.id).run();
}

async function chiamaPortale(env, az, dominio) {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
  try {
    const res = await fetch(String(env.HUB_URL).replace(/\/+$/, "") + "/api/licenze/verifica", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: env.INSTALLAZIONE_ID, chiave: env.INSTALLAZIONE_CHIAVE, versione: APP_VERSION, dominio, moduli_disponibili: MODULI_CLIENTE }),
      ...(ctrl ? { signal: ctrl.signal } : {}),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body && body.ok) return { ok: true, dati: body };
    if (res.status === 401 || res.status === 404) return { ok: false, rifiutata: true, errore: body.error || `HTTP ${res.status}` };
    return { ok: false, errore: body.error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, errore: String((e && e.message) || e) };
  } finally { if (timer) clearTimeout(timer); }
}

// Esito: { stato: "ok" | "rifiutata" | "non_verificata" | "locale", verificata_il, dettaglio }
// "ok" vuol dire che la licenza è quella del portale (attiva o scaduta che sia:
// quello lo dice poi licStatus sulla riga aggiornata).
export async function aggiornaLicenza(env, request) {
  if (!configurata(env)) return { stato: "locale" };
  const ora = Date.now();
  if (memo.esito && ora - memo.at < MEMO_MS) return memo.esito;

  const cache = await leggiCache(env);
  const az = await aziendaCliente(env);
  let esito;
  if (cache && cache.dati && cache.dati.ok && ora - cache.verificata_il < INTERVALLO_MS) {
    esito = { stato: "ok", verificata_il: new Date(cache.verificata_il).toISOString(), dettaglio: "cache" };
  } else {
    const dominio = (() => { try { return new URL(request.url).hostname; } catch (e) { return ""; } })();
    const r = await chiamaPortale(env, az, dominio);
    if (r.ok) {
      await scriviCache(env, r.dati, true);
      await applica(env, az, r.dati);
      esito = { stato: "ok", verificata_il: new Date().toISOString(), dettaglio: "portale" };
    } else if (r.rifiutata) {
      await scriviCache(env, { ok: false, rifiutata: true, errore: r.errore }, false);
      esito = { stato: "rifiutata", dettaglio: r.errore };
    } else {
      // Portale irraggiungibile: vale l'ultimo esito buono, entro la tolleranza.
      await scriviCache(env, cache && cache.dati ? cache.dati : { ok: false, errore: r.errore }, false);
      if (cache && cache.dati && cache.dati.ok && ora - cache.verificata_il < TOLLERANZA_MS) esito = { stato: "ok", verificata_il: new Date(cache.verificata_il).toISOString(), dettaglio: "tolleranza: " + r.errore };
      else esito = { stato: "non_verificata", dettaglio: r.errore };
    }
  }
  memo = { at: ora, esito };
  return esito;
}

// Stato della licenza del salone su un'installazione cliente: prima l'esito
// della verifica col portale, poi la riga aziende (che quella verifica tiene aggiornata).
export function statoCliente(esito, az) {
  if (!esito || esito.stato === "ok" || esito.stato === "locale") return licStatus(az);
  return esito.stato; // "rifiutata" | "non_verificata"
}

// Forza una nuova verifica (bottone nel gestionale): svuota la memoria e la cache.
export async function forzaVerifica(env, request) {
  azzeraMemo();
  await env.DB.prepare("UPDATE licenza_locale SET verificata_il = NULL WHERE id = 'hub'").run().catch(() => {});
  return await aggiornaLicenza(env, request);
}

export function descriviEsito(esito) {
  if (!esito) return null;
  return { stato: esito.stato, verificata_il: esito.verificata_il || null, dettaglio: esito.dettaglio || null };
}

export { json };
