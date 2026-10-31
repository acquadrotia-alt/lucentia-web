// ============================================================================
// Utilità condivise dall'API: risposte JSON, cookie, password, date, moduli
// e stato della licenza. Nessuna dipendenza dal database.
// ============================================================================
import pkg from "../../package.json" with { type: "json" };

export const APP_VERSION = pkg.version;

export const COLLEZIONI = ["config", "bookings", "clients", "catalog", "sales", "vouchers", "eventi"];
// I moduli del core, quelli che il gestionale conosce di suo. Un'installazione
// cliente può dichiararne altri (vedi src/cliente/moduli.js).
export const MODULI = ["fidelity", "vendite", "statistiche", "marketing", "allergeni", "pacchetti", "online", "op3", "opinf"];
export const OLD_MAP = { shop: "vendite", stats: "statistiche" };
// "online" (prenotazioni online) è un add-on non disponibile col piano Basic:
// richiede un piano con più operatori (op3 o opinf).
export function multiOp(a) { return a.includes("op3") || a.includes("opinf"); }
export function parseModuli(raw, extra) {
  if (raw == null) return MODULI.slice(); // clienti creati prima dei moduli: tutto attivo
  const noti = Array.isArray(extra) ? [...MODULI, ...extra] : MODULI;
  try { const a = JSON.parse(raw); if (Array.isArray(a)) return a.map((k) => OLD_MAP[k] || k).filter((k) => noti.includes(k)); } catch (e) {}
  return [];
}
export function cleanModuli(arr) {
  let a = Array.isArray(arr) ? arr.map((k) => OLD_MAP[k] || k).filter((k) => MODULI.includes(k)) : [];
  if (a.includes("online") && !multiOp(a)) a = a.filter((k) => k !== "online"); // non con Basic
  return JSON.stringify(a);
}
// Variante per le installazioni: oltre ai moduli del core accetta le chiavi
// che l'installazione stessa ha dichiarato di supportare (moduli su misura).
export function cleanModuliInstallazione(arr, dichiarati) {
  const extra = Array.isArray(dichiarati) ? dichiarati.map((m) => (m && m.key) || m).filter((k) => typeof k === "string" && /^[a-z0-9_-]{2,40}$/i.test(k)) : [];
  const noti = [...MODULI, ...extra];
  const a = Array.isArray(arr) ? arr.map((k) => OLD_MAP[k] || k).filter((k, i, s) => noti.includes(k) && s.indexOf(k) === i) : [];
  return JSON.stringify(a);
}
export function cleanPrezzo(v) { if (v == null) return null; const s = String(v).trim(); return s === "" ? null : s; }
export function maxOperatoriOf(raw) { const m = parseModuli(raw); return m.includes("opinf") ? Infinity : (m.includes("op3") ? 3 : 1); }
// L'amministratore del portale. Il ruolo nel database resta "reseller" per
// compatibilità con gli account già creati: oggi è una sola persona.
export function isAdmin(sess) { return !!sess && sess.ruolo === "reseller"; }

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });
}
export function getCookie(request, name) {
  const h = request.headers.get("Cookie") || "";
  const m = h.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
export const b64 = (bytes) => btoa(String.fromCharCode.apply(null, Array.from(bytes)));
export const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export function randomToken(bytes = 24) { const a = crypto.getRandomValues(new Uint8Array(bytes)); return Array.from(a).map((x) => x.toString(16).padStart(2, "0")).join(""); }

export async function hashPassword(password, iterations = 100000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}
export async function verifyPassword(password, stored) {
  try {
    const parts = String(stored).split("$");
    if (parts[0] !== "pbkdf2") return false;
    const iterations = parseInt(parts[1], 10);
    const salt = unb64(parts[2]);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
    return b64(new Uint8Array(bits)) === parts[3];
  } catch (e) { return false; }
}
// Impronta SHA-256 (esadecimale) di una chiave: le chiavi delle installazioni
// si conservano così, mai in chiaro.
export async function sha256Hex(testo) {
  const bits = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(testo)));
  return Array.from(new Uint8Array(bits)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function pad2(n) { return String(n).padStart(2, "0"); }
export function todayISO() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
export function addMonthsISO(months) { const d = new Date(); d.setMonth(d.getMonth() + Number(months || 0)); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
export function addDaysISO(days) { const d = new Date(); d.setDate(d.getDate() + Number(days || 0)); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

export function licStatus(az) {
  if (!az) return "none";
  if (!az.attiva) return "disabled";
  if (!az.licenza_scadenza) return "active"; // illimitata
  const exp = new Date(az.licenza_scadenza + "T23:59:59").getTime();
  return Date.now() > exp ? "expired" : "active";
}

// In quale modalità gira questa installazione: "hub" è il portale Lucentia
// (vetrina, amministrazione, demo), "cliente" è il sito+gestionale di un
// singolo salone sul suo dominio. Senza variabile si è sul portale.
export function modalita(env) { return env && env.MODALITA === "cliente" ? "cliente" : "hub"; }
