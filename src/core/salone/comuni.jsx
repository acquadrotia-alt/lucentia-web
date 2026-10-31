import { createContext, useContext } from "react";
import { Check, Gift, Star, Ban, UserX, Timer } from "lucide-react";
import { operatoriDelServizio } from "../../orari.js";

// Versione dell'app (da package.json, iniettata da Vite) mostrata nel login.
export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

export const CFG_KEY = "salon-config-v3";
export const BK_KEY = "salon-bookings-v2";
export const CLIENTS_KEY = "salon-clients-v1";
export const PROD_KEY = "salon-catalog-v1"; // catalogo prodotti + giacenze
export const SALES_KEY = "salon-sales-v1"; // storico vendite
export const LIC_KEY = "salon-license-v1"; // licenza salvata a parte: NON inclusa nei backup
export const STEP = 15;
export const ADVANCE_DAYS = 30;
export const LOYALTY_GOAL = 10;

// Codice master del RIVENDITORE: vale sempre, non scade mai, sblocca il pannello Licenza.
// Cambialo qui (e ricompila) se vuoi un master diverso da 0724 per le tue build.
export const RESELLER_CODE = "0724";
// Firma anti-manomissione della licenza (vedi nota sicurezza nel messaggio di consegna).
export const LIC_SECRET = "bs-lic-39f1c7";

export const uid = () => Math.random().toString(36).slice(2, 9);
export const pad = (n) => String(n).padStart(2, "0");
export const minToStr = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const strToMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
export const pd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => pd(new Date());
export const parseDate = (s) => { const [y, mo, d] = s.split("-").map(Number); return new Date(y, mo - 1, d); };
export const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return pd(d); };
export const bookingStart = (b) => { const d = parseDate(b.date); d.setHours(Math.floor(b.startMin / 60), b.startMin % 60, 0, 0); return d; };
export const bookingEnd = (b) => { const d = parseDate(b.date); d.setHours(Math.floor(b.endMin / 60), b.endMin % 60, 0, 0); return d; };

export const DAYS = [{ k: 1, l: "Lun" }, { k: 2, l: "Mar" }, { k: 3, l: "Mer" }, { k: 4, l: "Gio" }, { k: 5, l: "Ven" }, { k: 6, l: "Sab" }, { k: 0, l: "Dom" }];
export const DAY_NAMES = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
export const WDAY_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
export const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
export const fmtDate = (s) => { const d = parseDate(s); return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const fmtFullDate = (ms) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

export const W_FULL = [[540, 780], [900, 1140]];
export const SERVICES = [
  { id: "s1", name: "Taglio uomo", durationMin: 30 }, { id: "s2", name: "Taglio donna", durationMin: 45 },
  { id: "s3", name: "Piega", durationMin: 30 }, { id: "s4", name: "Colore", durationMin: 90 },
  { id: "s5", name: "Taglio + piega", durationMin: 60 }, { id: "s6", name: "Manicure", durationMin: 45 },
  { id: "s7", name: "Pedicure", durationMin: 60 }, { id: "s8", name: "Pulizia viso", durationMin: 50 },
  { id: "s9", name: "Trucco", durationMin: 40 }, { id: "s10", name: "Trattamento viso anti-age", durationMin: 70 },
  { id: "s11", name: "Ceretta gambe", durationMin: 40 },
];
export const STAFF = [
  { id: "a1", name: "Giulia", role: "Estetista", serviceIds: ["s6", "s7", "s8", "s11"], availability: { 1: W_FULL, 2: W_FULL, 3: W_FULL, 4: W_FULL, 5: W_FULL } },
  { id: "a2", name: "Sara", role: "Estetista", serviceIds: ["s9", "s10", "s11", "s6"], availability: { 2: [[600, 840], [900, 1140]], 3: [[600, 840], [900, 1140]], 4: [[600, 840], [900, 1140]], 5: [[600, 840], [900, 1140]], 6: [[600, 840], [900, 1140]] } },
  { id: "a3", name: "Marco", role: "Parrucchiere", serviceIds: ["s1", "s2", "s3", "s4", "s5"], availability: { 1: [[540, 780], [840, 1080]], 2: [[540, 780], [840, 1080]], 3: [[540, 780], [840, 1080]], 4: [[540, 780], [840, 1080]], 5: [[540, 780], [840, 1080]], 6: [[540, 780], [840, 1080]] } },
];
export const BRANDING = { name: "Bellezza & Stile", tagline: "Gestionale salone", logo: null, primary: "var(--lc-accent)", phone: "+39 070 123 4567", email: "info@bellezzaestile.it", address: "Via Roma 12, Cagliari" };
export const DEFAULT_LOYALTY = { mode: "flat", fromSales: false, rewards: [{ id: "rw5", points: 5, label: "Omaggio piccolo" }, { id: "rw10", points: 10, label: "Sconto 10%" }] };
export const DEFAULT_MARKETING = {
  msgInactive: "Ciao *{nome}*, come stai? Tutto bene? È un po' di tempo che non ci vediamo, volevo solo dirti che per questo mese abbiamo una promo dedicata!",
  msgServices: "Ciao *{nome}*, abbiamo delle novità che potrebbero interessarti. Ti aspettiamo in salone!",
  msgProducts: "Ciao *{nome}*, è disponibile un prodotto che potrebbe piacerti. Passa a trovarci quando vuoi!",
};
export const DEFAULT_CONFIG = { services: SERVICES, staff: STAFF, branding: BRANDING, cancelHours: 6, loyalty: DEFAULT_LOYALTY, marketing: DEFAULT_MARKETING, closures: [], backup: { enabled: false, time: "20:00" } };
export const BLANK_BRANDING = { name: "", tagline: "Gestionale salone", logo: null, primary: "#6b50b8", phone: "", email: "", address: "" };
export const PRESETS = ["var(--lc-accent)", "#db2777", "#7c3aed", "#2563eb", "#0d9488", "#059669", "#d97706", "#475569"];

// --- Catalogo prodotti (vendita + magazzino) ---
export const DEFAULT_CATALOG = {
  categories: [
    { id: "c-cap", name: "Capelli" },
    { id: "c-viso", name: "Viso" },
    { id: "c-corpo", name: "Corpo" },
    { id: "c-unghie", name: "Unghie" },
  ],
  products: [
    { id: "p1", name: "Shampoo idratante", description: "Per capelli secchi e sfibrati", categoryId: "c-cap", formats: [{ id: "f1", label: "300 ml", price: 12.5, stock: 8 }, { id: "f2", label: "1 L", price: 29, stock: 3 }] },
    { id: "p2", name: "Maschera nutriente", description: "Trattamento intensivo settimanale", categoryId: "c-cap", formats: [{ id: "f1", label: "250 ml", price: 18, stock: 5 }] },
    { id: "p3", name: "Crema viso anti-age", description: "Acido ialuronico, uso quotidiano", categoryId: "c-viso", formats: [{ id: "f1", label: "50 ml", price: 34, stock: 6 }] },
    { id: "p4", name: "Olio corpo elasticizzante", description: "Mandorle dolci e vitamina E", categoryId: "c-corpo", formats: [{ id: "f1", label: "100 ml", price: 15, stock: 4 }, { id: "f2", label: "250 ml", price: 28, stock: 2 }] },
    { id: "p5", name: "Smalto semipermanente", description: "Lunga tenuta, finish lucido", categoryId: "c-unghie", formats: [{ id: "f1", label: "Rosso", price: 9.5, stock: 10 }, { id: "f2", label: "Rosa cipria", price: 9.5, stock: 7 }] },
  ],
};
export const eur = (n) => (Number(n) || 0).toFixed(2).replace(".", ",") + " €";
export const fmtDateTime = (ts) => { const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
// --- Salvataggio LOCALE su questo PC (localStorage di Tauri) ---
export const loadKey = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } };
export const saveKey = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} };

// --- Strato dati: legge/salva sul server (database D1) invece che nel localStorage ---
// Login e licenze restano in locale e invariati; qui passano solo i 5 contenitori dati.
export async function apiLoad(coll, fallback) {
  try { const r = await fetch(`/api/data/${coll}`); if (!r.ok) return fallback; const j = await r.json(); return (j && j.value != null) ? j.value : fallback; }
  catch (e) { return fallback; }
}
// Variante con esito: usata dove un salvataggio fallito va segnalato subito
// (es. eventi con immagini: se il payload è troppo grande l'utente deve saperlo).
export async function apiSaveVerificato(coll, value) {
  try {
    const r = await fetch(`/api/data/${coll}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); return { ok: false, error: (j && j.error) || `HTTP ${r.status}` }; }
    return { ok: true };
  } catch (e) { return { ok: false, error: "errore di rete" }; }
}
export async function apiSave(coll, value) {
  try { await fetch(`/api/data/${coll}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }) }); } catch (e) {}
}
export const _saveTimers = {};
export function apiSaveDebounced(coll, value, delay = 800) {
  clearTimeout(_saveTimers[coll]);
  _saveTimers[coll] = setTimeout(() => apiSave(coll, value), delay);
}

// --- Sistema licenza cliente (a tempo) ---
export function hashStr(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); }
export const licSig = (code, expiry) => hashStr(`${code}|${expiry}|${LIC_SECRET}`);
export const loadLicense = () => loadKey(LIC_KEY, null);
export const saveLicense = (lic) => saveKey(LIC_KEY, lic);
export function makeLicense(code, months) {
  const m = Number(months) || 0;
  let expiry = null;
  if (m > 0) { const d = new Date(); d.setMonth(d.getMonth() + m); expiry = d.getTime(); }
  const base = { code: String(code).trim(), expiry, months: m, issuedAt: Date.now() };
  return { ...base, sig: licSig(base.code, base.expiry) };
}
export function licenseState(lic) {
  if (!lic || !lic.code) return { state: "none" };
  if (lic.sig !== licSig(lic.code, lic.expiry)) return { state: "tampered" };
  if (lic.expiry == null) return { state: "active", unlimited: true };
  const ms = lic.expiry - Date.now();
  if (ms <= 0) return { state: "expired", expiry: lic.expiry };
  return { state: "active", expiry: lic.expiry, days: Math.ceil(ms / 86400000) };
}
export const licenseOk = (lic) => licenseState(lic).state === "active";

export const hexToRgb = (h) => { h = String(h).replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const mix = (rgb, t, a) => rgb.map((c, i) => Math.round(c + (t[i] - c) * a));
export const rgbStr = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;
export function themeVars(primary) {
  let rgb; try { rgb = hexToRgb(primary); } catch (e) { rgb = [225, 29, 72]; }
  return { "--brand": rgbStr(rgb), "--brand-dark": rgbStr(mix(rgb, [0, 0, 0], 0.18)), "--brand-soft": rgbStr(mix(rgb, [255, 255, 255], 0.9)), "--brand-text": rgbStr(mix(rgb, [0, 0, 0], 0.25)), "--brand-ring": `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.3)` };
}
export function fileToResizedDataURL(file, max = 256) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => { const img = new Image(); img.onload = () => { let w = img.width, h = img.height; if (w > h && w > max) { h = (h * max) / w; w = max; } else if (h > max) { w = (w * max) / h; h = max; } const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h); res(c.toDataURL("image/png")); }; img.onerror = rej; img.src = reader.result; };
    reader.onerror = rej; reader.readAsDataURL(file);
  });
}

// Variante per foto/copertine: più grande e in JPEG (pesa molto meno del PNG).
export function fileToCoverDataURL(file, max = 1200) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => { const img = new Image(); img.onload = () => { let w = img.width, h = img.height; if (w > h && w > max) { h = (h * max) / w; w = max; } else if (h > max) { w = (w * max) / h; h = max; } const c = document.createElement("canvas"); c.width = w; c.height = h; const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h); res(c.toDataURL("image/jpeg", 0.82)); }; img.onerror = rej; img.src = reader.result; };
    reader.onerror = rej; reader.readAsDataURL(file);
  });
}

// Foto prodotto: ritaglio quadrato 1:1 centrato, JPEG compatto.
export function fileToSquareDataURL(file, size = 480) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        const c = document.createElement("canvas"); c.width = size; c.height = size;
        const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        res(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = rej; img.src = reader.result;
    };
    reader.onerror = rej; reader.readAsDataURL(file);
  });
}

// Gli eventi occupano uno o più operatori: per il calcolo degli slot vengono
// espansi in pseudo-appuntamenti (uno per operatore), così gli orari occupati
// da un evento non risultano prenotabili.
export function eventiImpegni(eventi) {
  if (!Array.isArray(eventi)) return [];
  const out = [];
  for (const ev of eventi) {
    if (!ev) continue;
    for (const sid of (ev.staffIds || [])) out.push({ id: `ev-${ev.id}-${sid}`, staffId: sid, date: ev.date, startMin: ev.startMin, endMin: ev.endMin });
  }
  return out;
}

// Chi può eseguire tutti i servizi indicati. L'abilitazione la dichiara il
// servizio; per i saloni non ancora aggiornati vale il vecchio staff.serviceIds.
export function qualifiedStaff(staff, ids, services) {
  const el = (id) => { const sv = (services || []).find((x) => x.id === id); return sv ? operatoriDelServizio(sv, services, staff) : []; };
  return staff.filter((st) => (ids || []).every((id) => el(id).includes(st.id)));
}
export function inRange(date, from, to) { const lo = from || to, hi = to || from; if (!lo) return false; return date >= lo && date <= hi; }
export function staffOff(st, date) { return Array.isArray(st && st.off) && st.off.some((r) => inRange(date, r.from, r.to)); }
export function salonClosure(config, date) { return ((config && config.closures) || []).find((r) => inRange(date, r.from, r.to)) || null; }
export function generateCode(clients) { let c; do { c = String(Math.floor(10000 + Math.random() * 90000)); } while (clients.some((x) => x.code === c)); return c; }
export function upsertClient(info, clients) {
  const name = info.name, email = info.email, phone = info.phone, code = info.code;
  let list = clients;
  if (code) { const ex = list.find((c) => c.code === code); if (ex) { list = list.map((c) => (c.code === code ? { ...c, name: name || c.name, email: email || c.email, phone: phone || c.phone } : c)); return { code, clients: list }; } }
  if (email) { const be = list.find((c) => c.email && c.email.toLowerCase() === email.toLowerCase()); if (be) { list = list.map((c) => (c.code === be.code ? { ...c, name: name || c.name, phone: phone || c.phone } : c)); return { code: be.code, clients: list }; } }
  const nc = generateCode(list);
  list = [...list, { code: nc, name, email: email || "", phone: phone || "", createdAt: Date.now() }];
  return { code: nc, clients: list };
}
export function clientStats(code, bookings) {
  const cb = bookings.filter((b) => b.clientCode === code);
  const now = Date.now();
  const upcoming = cb.filter((b) => !b.status && bookingEnd(b).getTime() > now).sort((a, b) => bookingStart(a) - bookingStart(b));
  const past = cb.filter((b) => b.status || bookingEnd(b).getTime() <= now).sort((a, b) => bookingStart(b) - bookingStart(a));
  const done = cb.filter((b) => b.status === "done" || b.status === "partial");
  const servicesUsed = done.reduce((a, b) => a + b.serviceIds.length, 0);
  return { all: cb, past, upcoming, done, servicesUsed, rewards: Math.floor(servicesUsed / LOYALTY_GOAL), progress: servicesUsed % LOYALTY_GOAL };
}
export function loyaltyConfig(config) { const L = (config && config.loyalty) || {}; return { mode: L.mode || "flat", fromSales: !!L.fromSales, rewards: Array.isArray(L.rewards) ? L.rewards : [] }; }
export function marketingConfig(config) { const m = (config && config.marketing) || {}; return { msgInactive: m.msgInactive != null ? m.msgInactive : DEFAULT_MARKETING.msgInactive, msgServices: m.msgServices != null ? m.msgServices : DEFAULT_MARKETING.msgServices, msgProducts: m.msgProducts != null ? m.msgProducts : DEFAULT_MARKETING.msgProducts }; }
export function waNumber(phone) { let d = String(phone || "").replace(/\D/g, ""); if (!d) return ""; if (d.startsWith("00")) d = d.slice(2); if (!d.startsWith("39") && d.length <= 11) d = "39" + d; return d; }
export function clientPoints(code, bookings, sales, config, catalog) {
  const L = loyaltyConfig(config);
  const svcPts = (id) => { if (L.mode === "perService") { const s = (config.services || []).find((x) => x.id === id); return s && s.points != null ? Number(s.points) || 0 : 0; } return 1; };
  let pts = 0;
  (bookings || []).forEach((b) => { if ((b.status === "done" || b.status === "partial") && b.clientCode === code) pts += (b.serviceIds || []).reduce((a, id) => a + svcPts(id), 0); });
  if (L.fromSales && Array.isArray(sales) && catalog) { const prodPts = (pid) => { const p = (catalog.products || []).find((x) => x.id === pid); return p && p.points != null ? Number(p.points) || 0 : 0; }; sales.forEach((s) => { if (s.type === "sale" && s.clientCode === code) (s.items || []).forEach((it) => { pts += prodPts(it.productId) * it.qty; }); }); }
  return pts;
}
export function clientBalance(c, bookings, sales, config, catalog) { return clientPoints(c.code, bookings, sales, config, catalog) + (Number(c.bonusPoints) || 0) - (Number(c.redeemedPoints) || 0); }
export function matchPackage(client, serviceIds) { if (!client || !Array.isArray(client.packages)) return null; for (const sid of (serviceIds || [])) { const pkg = client.packages.find((p) => p.serviceId === sid && (Number(p.used) || 0) < p.total); if (pkg) return pkg; } return null; }

// --- Dati DEMO FREE (in memoria, mai salvati su disco) ---
export const DEMO_FIRST = ["Anna", "Marco", "Giulia", "Luca", "Sara", "Elena", "Paolo", "Chiara"];
export const DEMO_LAST = ["Rossi", "Bianchi", "Verdi", "Russo", "Ferrari", "Romano", "Greco", "Conti"];
export function buildDemoData() {
  const config = { ...DEFAULT_CONFIG, branding: { ...BRANDING, name: "Salone Demo" }, loyalty: DEFAULT_LOYALTY };
  const catalog = JSON.parse(JSON.stringify(DEFAULT_CATALOG));
  const clients = []; const bookings = [];
  const allSvc = config.services;
  for (let i = 0; i < 5; i++) {
    const code = String(10000 + i * 137 + 7);
    const name = `${DEMO_FIRST[i]} ${DEMO_LAST[i]}`;
    const phone = `3${pad(20 + i)} ${pad(100 + i * 3).slice(0, 3)} ${pad(10 + i)}${pad(20 + i)}`;
    clients.push({ code, name, email: "", phone, card: "", createdAt: Date.now() - (i + 1) * 30 * 864e5 });
    const visits = 2 + (i % 3);
    for (let v = 0; v < visits; v++) {
      const svc = allSvc[(i + v) % allSvc.length];
      const st = qualifiedStaff(config.staff, [svc.id], config.services)[0] || config.staff[0];
      const daysAgo = (v + 1) * 12 + i * 3;
      bookings.push({ id: uid(), date: addDays(todayStr(), -daysAgo), startMin: 600 + v * 30, endMin: 600 + v * 30 + svc.durationMin, serviceIds: [svc.id], staffId: st ? st.id : "", clientCode: code, clientName: name, status: "done", createdAt: Date.now() });
    }
  }
  return { config, bookings, clients, catalog, sales: [] };
}
export const DEMO_SEED = buildDemoData();
export const DEMO_MAX_CLIENTS = DEMO_SEED.clients.length + 3;
export const DEMO_MAX_BOOKINGS = DEMO_SEED.bookings.length + 20;

// Dati di esempio precaricati (clienti, appuntamenti, vendite) per mostrare l'app già "viva".
export function buildSampleData() {
  const services = SERVICES, staff = STAFF, cat = DEFAULT_CATALOG;
  const FIRST = ["Anna", "Marco", "Giulia", "Luca", "Sara", "Elena", "Paolo", "Chiara"];
  const LAST = ["Rossi", "Bianchi", "Ferrari", "Russo", "Esposito", "Romano", "Greco", "Conti"];
  const pick = (arr, idx) => arr[((idx % arr.length) + arr.length) % arr.length];
  const clients = [];
  for (let i = 0; i < 8; i++) {
    const d = "3" + String(200000000 + i * 11111111).slice(0, 9);
    clients.push({ code: String(10010 + i * 53), name: `${FIRST[i]} ${LAST[i]}`, firstName: FIRST[i], lastName: LAST[i], email: i % 3 === 0 ? `${FIRST[i].toLowerCase()}.${LAST[i].toLowerCase()}@email.it` : "", phone: `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`, card: i % 4 === 0 ? `TS${1000 + i}` : "", createdAt: Date.now() - (i + 1) * 25 * 864e5 });
  }
  if (clients[0]) clients[0].packages = [{ id: uid(), serviceId: "s11", total: 10, used: 3, price: 120, createdAt: Date.now() }];
  if (clients[1]) clients[1].packages = [{ id: uid(), serviceId: "s4", total: 5, used: 1, price: 150, createdAt: Date.now() }];
  const bookings = [];
  clients.forEach((c, i) => {
    const visits = 2 + (i % 3);
    for (let v = 0; v < visits; v++) {
      const svc = pick(services, i + v * 2);
      const stf = qualifiedStaff(staff, [svc.id], services)[0] || staff[0];
      const start = 540 + ((i + v) % 6) * 60;
      bookings.push({ id: uid(), date: addDays(todayStr(), -((v + 1) * 11 + i * 4)), startMin: start, endMin: start + svc.durationMin, serviceIds: [svc.id], staffId: stf ? stf.id : "", clientCode: c.code, clientName: c.name, status: "done", createdAt: Date.now() });
    }
  });
  for (let k = 0; k < 5; k++) {
    const c = clients[k];
    const svc = pick(services, k * 3 + 1);
    const stf = qualifiedStaff(staff, [svc.id], services)[0] || staff[0];
    const start = 600 + (k % 5) * 45;
    bookings.push({ id: uid(), date: addDays(todayStr(), k + 1), startMin: start, endMin: start + svc.durationMin, serviceIds: [svc.id], staffId: stf ? stf.id : "", clientCode: c.code, clientName: c.name, createdAt: Date.now() });
  }
  const sales = [];
  for (let s = 0; s < 10; s++) {
    const c = clients[(s * 3) % clients.length];
    const p = pick(cat.products, s);
    const f = p.formats[s % p.formats.length];
    const qty = 1 + (s % 2);
    const assign = s % 2 === 0;
    sales.push({ id: uid(), ts: Date.now() - (s * 12 + 3) * 864e5, type: "sale", partial: false, clientCode: assign ? c.code : null, clientName: assign ? c.name : "", items: [{ productId: p.id, formatId: f.id, name: p.name, label: f.label, price: f.price, qty }], total: f.price * qty });
  }
  return { clients, bookings, sales };
}

export const STATUS = {
  done: { label: "Svolto", cls: "bg-green-100 text-green-700", Icon: Check },
  partial: { label: "Parziale", cls: "bg-sky-100 text-sky-700", Icon: Timer },
  noshow: { label: "Non presentato", cls: "bg-amber-100 text-amber-700", Icon: UserX },
  cancelled: { label: "Annullato", cls: "bg-stone-200 text-stone-500", Icon: Ban },
};
export const BRAND_CSS = ".brand-bg{background:var(--brand);color:#fff}.brand-bg:hover:not(:disabled){background:var(--brand-dark)}.brand-soft{background:var(--brand-soft)}.brand-text{color:var(--brand-text)}.brand-accent{color:var(--brand)}.brand-border{border-color:var(--brand)!important}.brand-hover:hover{border-color:var(--brand)}.brand-ring:focus,.brand-ring:focus-within{outline:none;box-shadow:0 0 0 3px var(--brand-ring)}";
// `has(chiave)` legge qualunque modulo, compresi quelli su misura dichiarati
// in src/cliente/moduli.js e accesi dal portale.
export const ALL_FLAGS = { fidelity: true, vendite: true, statistiche: true, marketing: true, allergeni: true, pacchetti: true, online: true, maxOperatori: Infinity, moduli: null, has: () => true };
export function flagsFromModuli(moduli) {
  if (!Array.isArray(moduli)) return ALL_FLAGS;
  const has = (k) => moduli.includes(k);
  return {
    fidelity: has("fidelity"), vendite: has("vendite"), statistiche: has("statistiche"),
    marketing: has("marketing"), allergeni: has("allergeni"), pacchetti: has("pacchetti"), online: has("online"),
    maxOperatori: has("opinf") ? Infinity : (has("op3") ? 3 : 1),
    moduli, has,
  };
}
export const ModsCtx = createContext(ALL_FLAGS);
export function useMods() { return useContext(ModsCtx) || ALL_FLAGS; }
export function planName(moduli) {
  const KEYS = ["fidelity", "vendite", "statistiche", "marketing", "allergeni", "pacchetti"];
  const opt = (Array.isArray(moduli) ? moduli : []).filter((k) => KEYS.includes(k));
  const arr = Array.isArray(moduli) ? moduli : [];
  const tier = arr.includes("opinf") ? "inf" : (arr.includes("op3") ? "3" : "1");
  const sk = (a, b) => a.length === b.length && a.slice().sort().join() === b.slice().sort().join();
  if (tier === "1" && opt.length === 0) return "Basic";
  if (tier === "3" && sk(opt, ["fidelity", "pacchetti", "vendite"])) return "Smart";
  if (tier === "inf" && sk(opt, KEYS)) return "Pro";
  return "Personalizzato";
}
// Logo dell'app Lucentia (marchio + nome) per la schermata di accesso.
export const LUCENTIA_LOGO = "/lucentia-logo.png";

// Logo del produttore (Office Solution) usato come firma nella schermata di accesso.
export const MAKER_LOGO = "data:image/png;base64,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";
export function FieldIcon({ icon: Icon, children }) { return <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 brand-ring"><Icon size={16} className="text-stone-400" />{children}</div>; }
export function Row({ icon: Icon, label }) { return <div className="flex items-center gap-2"><Icon size={15} className="text-stone-400 shrink-0" /><span>{label}</span></div>; }
export function StaffPick({ active, onClick, name, role }) { return <button onClick={onClick} className={`text-left p-3 rounded-xl border transition ${active ? "brand-soft brand-border" : "bg-white border-stone-200 brand-hover"}`}><div className="font-medium text-sm">{name}</div><div className="text-xs text-stone-400">{role}</div></button>; }
export function Field({ label, children }) { return <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">{label}</div>{children}</div>; }

export function LoyaltyCard({ stats }) {
  const filled = stats.progress;
  return (
    <div className="lc-card p-5">
      <div className="flex items-center gap-2 mb-3"><Star size={16} className="brand-accent" /><h3 className="font-semibold">Programma fedeltà</h3></div>
      {stats.rewards > 0 ? <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-lg px-3 py-2 text-sm mb-3"><Gift size={16} /> <span>Ha <span className="font-semibold">{stats.rewards} sconto{stats.rewards > 1 ? "i" : ""} del 10%</span> disponibile.</span></div> : null}
      <div className="flex items-center gap-1.5 mb-2">{Array.from({ length: LOYALTY_GOAL }).map((_, i) => <div key={i} className={`h-2.5 flex-1 rounded-full ${i < filled ? "brand-bg" : "bg-stone-200"}`} />)}</div>
      <p className="text-sm text-stone-500">{stats.servicesUsed} servizi completati · {filled === 0 && stats.rewards > 0 ? "premio maturato!" : `mancano ${LOYALTY_GOAL - filled} servizi al prossimo sconto`}</p>
    </div>
  );
}
