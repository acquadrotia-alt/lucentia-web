import { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import { Sparkles, Calendar, Clock, User, Mail, Lock, Settings, LayoutDashboard, Plus, Trash2, Check, ChevronLeft, ChevronRight, X, Users, CalendarPlus, Phone, MapPin, Image as ImageIcon, Palette, Store, Sunrise, Sun, Moon, History, Search, Gift, Star, Hash, LogOut, Ban, UserX, Undo2, Timer, CalendarClock, Wallet, RefreshCw, Printer, Download, Upload, KeyRound, ShieldCheck, CalendarX2, AlertTriangle, BadgeCheck, ShoppingCart, ShoppingBag, Package, Tag, Minus, Boxes, Receipt, Layers, AlertCircle, CalendarRange, CalendarDays, PackagePlus, BarChart3, TrendingUp, MessageCircle, FolderOpen } from "lucide-react";

// Versione dell'app (da package.json, iniettata da Vite) mostrata nel login.
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

const CFG_KEY = "salon-config-v3";
const BK_KEY = "salon-bookings-v2";
const CLIENTS_KEY = "salon-clients-v1";
const PROD_KEY = "salon-catalog-v1"; // catalogo prodotti + giacenze
const SALES_KEY = "salon-sales-v1"; // storico vendite
const LIC_KEY = "salon-license-v1"; // licenza salvata a parte: NON inclusa nei backup
const STEP = 15;
const ADVANCE_DAYS = 30;
const LOYALTY_GOAL = 10;

// Codice master del RIVENDITORE: vale sempre, non scade mai, sblocca il pannello Licenza.
// Cambialo qui (e ricompila) se vuoi un master diverso da 0724 per le tue build.
const RESELLER_CODE = "0724";
// Firma anti-manomissione della licenza (vedi nota sicurezza nel messaggio di consegna).
const LIC_SECRET = "bs-lic-39f1c7";

const uid = () => Math.random().toString(36).slice(2, 9);
const pad = (n) => String(n).padStart(2, "0");
const minToStr = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const strToMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
const pd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => pd(new Date());
const parseDate = (s) => { const [y, mo, d] = s.split("-").map(Number); return new Date(y, mo - 1, d); };
const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return pd(d); };
const bookingStart = (b) => { const d = parseDate(b.date); d.setHours(Math.floor(b.startMin / 60), b.startMin % 60, 0, 0); return d; };
const bookingEnd = (b) => { const d = parseDate(b.date); d.setHours(Math.floor(b.endMin / 60), b.endMin % 60, 0, 0); return d; };

const DAYS = [{ k: 1, l: "Lun" }, { k: 2, l: "Mar" }, { k: 3, l: "Mer" }, { k: 4, l: "Gio" }, { k: 5, l: "Ven" }, { k: 6, l: "Sab" }, { k: 0, l: "Dom" }];
const DAY_NAMES = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const WDAY_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const fmtDate = (s) => { const d = parseDate(s); return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const fmtFullDate = (ms) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

const W_FULL = [[540, 780], [900, 1140]];
const SERVICES = [
  { id: "s1", name: "Taglio uomo", durationMin: 30 }, { id: "s2", name: "Taglio donna", durationMin: 45 },
  { id: "s3", name: "Piega", durationMin: 30 }, { id: "s4", name: "Colore", durationMin: 90 },
  { id: "s5", name: "Taglio + piega", durationMin: 60 }, { id: "s6", name: "Manicure", durationMin: 45 },
  { id: "s7", name: "Pedicure", durationMin: 60 }, { id: "s8", name: "Pulizia viso", durationMin: 50 },
  { id: "s9", name: "Trucco", durationMin: 40 }, { id: "s10", name: "Trattamento viso anti-age", durationMin: 70 },
  { id: "s11", name: "Ceretta gambe", durationMin: 40 },
];
const STAFF = [
  { id: "a1", name: "Giulia", role: "Estetista", serviceIds: ["s6", "s7", "s8", "s11"], availability: { 1: W_FULL, 2: W_FULL, 3: W_FULL, 4: W_FULL, 5: W_FULL } },
  { id: "a2", name: "Sara", role: "Estetista", serviceIds: ["s9", "s10", "s11", "s6"], availability: { 2: [[600, 840], [900, 1140]], 3: [[600, 840], [900, 1140]], 4: [[600, 840], [900, 1140]], 5: [[600, 840], [900, 1140]], 6: [[600, 840], [900, 1140]] } },
  { id: "a3", name: "Marco", role: "Parrucchiere", serviceIds: ["s1", "s2", "s3", "s4", "s5"], availability: { 1: [[540, 780], [840, 1080]], 2: [[540, 780], [840, 1080]], 3: [[540, 780], [840, 1080]], 4: [[540, 780], [840, 1080]], 5: [[540, 780], [840, 1080]], 6: [[540, 780], [840, 1080]] } },
];
const BRANDING = { name: "Bellezza & Stile", tagline: "Gestionale salone", logo: null, primary: "var(--lc-accent)", phone: "+39 070 123 4567", email: "info@bellezzaestile.it", address: "Via Roma 12, Cagliari" };
const DEFAULT_LOYALTY = { mode: "flat", fromSales: false, rewards: [{ id: "rw5", points: 5, label: "Omaggio piccolo" }, { id: "rw10", points: 10, label: "Sconto 10%" }] };
const DEFAULT_MARKETING = {
  msgInactive: "Ciao *{nome}*, come stai? Tutto bene? È un po' di tempo che non ci vediamo, volevo solo dirti che per questo mese abbiamo una promo dedicata!",
  msgServices: "Ciao *{nome}*, abbiamo delle novità che potrebbero interessarti. Ti aspettiamo in salone!",
  msgProducts: "Ciao *{nome}*, è disponibile un prodotto che potrebbe piacerti. Passa a trovarci quando vuoi!",
};
const DEFAULT_CONFIG = { services: SERVICES, staff: STAFF, branding: BRANDING, cancelHours: 6, loyalty: DEFAULT_LOYALTY, marketing: DEFAULT_MARKETING, closures: [], backup: { enabled: false, time: "20:00" } };
const BLANK_BRANDING = { name: "", tagline: "Gestionale salone", logo: null, primary: "#6b50b8", phone: "", email: "", address: "" };
const PRESETS = ["var(--lc-accent)", "#db2777", "#7c3aed", "#2563eb", "#0d9488", "#059669", "#d97706", "#475569"];

// --- Catalogo prodotti (vendita + magazzino) ---
const DEFAULT_CATALOG = {
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
const eur = (n) => (Number(n) || 0).toFixed(2).replace(".", ",") + " €";
const fmtDateTime = (ts) => { const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const cartTotal = (cart) => cart.reduce((a, it) => a + it.price * it.qty, 0);
// Scarica le giacenze dal catalogo in base al carrello venduto.
function applySaleToCatalog(catalog, cart) {
  const products = catalog.products.map((p) => {
    const touched = cart.some((it) => it.productId === p.id);
    if (!touched) return p;
    const formats = p.formats.map((f) => { const it = cart.find((x) => x.productId === p.id && x.formatId === f.id); return it ? { ...f, stock: Math.max(0, (Number(f.stock) || 0) - it.qty) } : f; });
    return { ...p, formats };
  });
  return { ...catalog, products };
}
// Carico magazzino: incrementa le giacenze.
function applyLoadToCatalog(catalog, items) {
  const products = catalog.products.map((p) => {
    if (!items.some((it) => it.productId === p.id)) return p;
    const formats = p.formats.map((f) => { const it = items.find((x) => x.productId === p.id && x.formatId === f.id); return it ? { ...f, stock: (Number(f.stock) || 0) + it.qty } : f; });
    return { ...p, formats };
  });
  return { ...catalog, products };
}

// --- Salvataggio LOCALE su questo PC (localStorage di Tauri) ---
const loadKey = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } };
const saveKey = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} };

// --- Strato dati: legge/salva sul server (database D1) invece che nel localStorage ---
// Login e licenze restano in locale e invariati; qui passano solo i 5 contenitori dati.
async function apiLoad(coll, fallback) {
  try { const r = await fetch(`/api/data/${coll}`); if (!r.ok) return fallback; const j = await r.json(); return (j && j.value != null) ? j.value : fallback; }
  catch (e) { return fallback; }
}
async function apiSave(coll, value) {
  try { await fetch(`/api/data/${coll}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }) }); } catch (e) {}
}
const _saveTimers = {};
function apiSaveDebounced(coll, value, delay = 800) {
  clearTimeout(_saveTimers[coll]);
  _saveTimers[coll] = setTimeout(() => apiSave(coll, value), delay);
}

// --- Sistema licenza cliente (a tempo) ---
function hashStr(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); }
const licSig = (code, expiry) => hashStr(`${code}|${expiry}|${LIC_SECRET}`);
const loadLicense = () => loadKey(LIC_KEY, null);
const saveLicense = (lic) => saveKey(LIC_KEY, lic);
function makeLicense(code, months) {
  const m = Number(months) || 0;
  let expiry = null;
  if (m > 0) { const d = new Date(); d.setMonth(d.getMonth() + m); expiry = d.getTime(); }
  const base = { code: String(code).trim(), expiry, months: m, issuedAt: Date.now() };
  return { ...base, sig: licSig(base.code, base.expiry) };
}
function licenseState(lic) {
  if (!lic || !lic.code) return { state: "none" };
  if (lic.sig !== licSig(lic.code, lic.expiry)) return { state: "tampered" };
  if (lic.expiry == null) return { state: "active", unlimited: true };
  const ms = lic.expiry - Date.now();
  if (ms <= 0) return { state: "expired", expiry: lic.expiry };
  return { state: "active", expiry: lic.expiry, days: Math.ceil(ms / 86400000) };
}
const licenseOk = (lic) => licenseState(lic).state === "active";

const hexToRgb = (h) => { h = String(h).replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (rgb, t, a) => rgb.map((c, i) => Math.round(c + (t[i] - c) * a));
const rgbStr = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;
function themeVars(primary) {
  let rgb; try { rgb = hexToRgb(primary); } catch (e) { rgb = [225, 29, 72]; }
  return { "--brand": rgbStr(rgb), "--brand-dark": rgbStr(mix(rgb, [0, 0, 0], 0.18)), "--brand-soft": rgbStr(mix(rgb, [255, 255, 255], 0.9)), "--brand-text": rgbStr(mix(rgb, [0, 0, 0], 0.25)), "--brand-ring": `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.3)` };
}
function fileToResizedDataURL(file, max = 256) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => { const img = new Image(); img.onload = () => { let w = img.width, h = img.height; if (w > h && w > max) { h = (h * max) / w; w = max; } else if (h > max) { w = (w * max) / h; h = max; } const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h); res(c.toDataURL("image/png")); }; img.onerror = rej; img.src = reader.result; };
    reader.onerror = rej; reader.readAsDataURL(file);
  });
}

function qualifiedStaff(staff, ids) { return staff.filter((st) => ids.every((id) => st.serviceIds.includes(id))); }
function inRange(date, from, to) { const lo = from || to, hi = to || from; if (!lo) return false; return date >= lo && date <= hi; }
function staffOff(st, date) { return Array.isArray(st && st.off) && st.off.some((r) => inRange(date, r.from, r.to)); }
function salonClosure(config, date) { return ((config && config.closures) || []).find((r) => inRange(date, r.from, r.to)) || null; }
function computeSlots(dateStr, duration, staffList, bookings, closures) {
  if (Array.isArray(closures) && closures.some((r) => inRange(dateStr, r.from, r.to))) return {};
  const wd = parseDate(dateStr).getDay();
  const isToday = dateStr === todayStr();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const map = {};
  staffList.forEach((st) => {
    if (staffOff(st, dateStr)) return;
    const windows = (st.availability && st.availability[wd]) || [];
    const stBk = bookings.filter((b) => b.staffId === st.id && b.date === dateStr && b.status !== "cancelled");
    windows.forEach((win) => {
      const ws = win[0], we = win[1];
      for (let t = ws; t + duration <= we; t += STEP) {
        if (isToday && t < nowMin + 15) continue;
        const clash = stBk.some((b) => t < b.endMin && t + duration > b.startMin);
        if (!clash) { if (!map[t]) map[t] = []; map[t].push(st.id); }
      }
    });
  });
  return map;
}
function generateCode(clients) { let c; do { c = String(Math.floor(10000 + Math.random() * 90000)); } while (clients.some((x) => x.code === c)); return c; }
function upsertClient(info, clients) {
  const name = info.name, email = info.email, phone = info.phone, code = info.code;
  let list = clients;
  if (code) { const ex = list.find((c) => c.code === code); if (ex) { list = list.map((c) => (c.code === code ? { ...c, name: name || c.name, email: email || c.email, phone: phone || c.phone } : c)); return { code, clients: list }; } }
  if (email) { const be = list.find((c) => c.email && c.email.toLowerCase() === email.toLowerCase()); if (be) { list = list.map((c) => (c.code === be.code ? { ...c, name: name || c.name, phone: phone || c.phone } : c)); return { code: be.code, clients: list }; } }
  const nc = generateCode(list);
  list = [...list, { code: nc, name, email: email || "", phone: phone || "", createdAt: Date.now() }];
  return { code: nc, clients: list };
}
function clientStats(code, bookings) {
  const cb = bookings.filter((b) => b.clientCode === code);
  const now = Date.now();
  const upcoming = cb.filter((b) => !b.status && bookingEnd(b).getTime() > now).sort((a, b) => bookingStart(a) - bookingStart(b));
  const past = cb.filter((b) => b.status || bookingEnd(b).getTime() <= now).sort((a, b) => bookingStart(b) - bookingStart(a));
  const done = cb.filter((b) => b.status === "done" || b.status === "partial");
  const servicesUsed = done.reduce((a, b) => a + b.serviceIds.length, 0);
  return { all: cb, past, upcoming, done, servicesUsed, rewards: Math.floor(servicesUsed / LOYALTY_GOAL), progress: servicesUsed % LOYALTY_GOAL };
}
function loyaltyConfig(config) { const L = (config && config.loyalty) || {}; return { mode: L.mode || "flat", fromSales: !!L.fromSales, rewards: Array.isArray(L.rewards) ? L.rewards : [] }; }
function marketingConfig(config) { const m = (config && config.marketing) || {}; return { msgInactive: m.msgInactive != null ? m.msgInactive : DEFAULT_MARKETING.msgInactive, msgServices: m.msgServices != null ? m.msgServices : DEFAULT_MARKETING.msgServices, msgProducts: m.msgProducts != null ? m.msgProducts : DEFAULT_MARKETING.msgProducts }; }
function waNumber(phone) { let d = String(phone || "").replace(/\D/g, ""); if (!d) return ""; if (d.startsWith("00")) d = d.slice(2); if (!d.startsWith("39") && d.length <= 11) d = "39" + d; return d; }
function clientPoints(code, bookings, sales, config, catalog) {
  const L = loyaltyConfig(config);
  const svcPts = (id) => { if (L.mode === "perService") { const s = (config.services || []).find((x) => x.id === id); return s && s.points != null ? Number(s.points) || 0 : 0; } return 1; };
  let pts = 0;
  (bookings || []).forEach((b) => { if ((b.status === "done" || b.status === "partial") && b.clientCode === code) pts += (b.serviceIds || []).reduce((a, id) => a + svcPts(id), 0); });
  if (L.fromSales && Array.isArray(sales) && catalog) { const prodPts = (pid) => { const p = (catalog.products || []).find((x) => x.id === pid); return p && p.points != null ? Number(p.points) || 0 : 0; }; sales.forEach((s) => { if (s.type === "sale" && s.clientCode === code) (s.items || []).forEach((it) => { pts += prodPts(it.productId) * it.qty; }); }); }
  return pts;
}
function clientBalance(c, bookings, sales, config, catalog) { return clientPoints(c.code, bookings, sales, config, catalog) + (Number(c.bonusPoints) || 0) - (Number(c.redeemedPoints) || 0); }
function matchPackage(client, serviceIds) { if (!client || !Array.isArray(client.packages)) return null; for (const sid of (serviceIds || [])) { const pkg = client.packages.find((p) => p.serviceId === sid && (Number(p.used) || 0) < p.total); if (pkg) return pkg; } return null; }

// --- Dati DEMO FREE (in memoria, mai salvati su disco) ---
const DEMO_FIRST = ["Anna", "Marco", "Giulia", "Luca", "Sara", "Elena", "Paolo", "Chiara"];
const DEMO_LAST = ["Rossi", "Bianchi", "Verdi", "Russo", "Ferrari", "Romano", "Greco", "Conti"];
function buildDemoData() {
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
      const st = qualifiedStaff(config.staff, [svc.id])[0] || config.staff[0];
      const daysAgo = (v + 1) * 12 + i * 3;
      bookings.push({ id: uid(), date: addDays(todayStr(), -daysAgo), startMin: 600 + v * 30, endMin: 600 + v * 30 + svc.durationMin, serviceIds: [svc.id], staffId: st ? st.id : "", clientCode: code, clientName: name, status: "done", createdAt: Date.now() });
    }
  }
  return { config, bookings, clients, catalog, sales: [] };
}
const DEMO_SEED = buildDemoData();
const DEMO_MAX_CLIENTS = DEMO_SEED.clients.length + 3;
const DEMO_MAX_BOOKINGS = DEMO_SEED.bookings.length + 20;

// Dati di esempio precaricati (clienti, appuntamenti, vendite) per mostrare l'app già "viva".
function buildSampleData() {
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
      const stf = qualifiedStaff(staff, [svc.id])[0] || staff[0];
      const start = 540 + ((i + v) % 6) * 60;
      bookings.push({ id: uid(), date: addDays(todayStr(), -((v + 1) * 11 + i * 4)), startMin: start, endMin: start + svc.durationMin, serviceIds: [svc.id], staffId: stf ? stf.id : "", clientCode: c.code, clientName: c.name, status: "done", createdAt: Date.now() });
    }
  });
  for (let k = 0; k < 5; k++) {
    const c = clients[k];
    const svc = pick(services, k * 3 + 1);
    const stf = qualifiedStaff(staff, [svc.id])[0] || staff[0];
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

const STATUS = {
  done: { label: "Svolto", cls: "bg-green-100 text-green-700", Icon: Check },
  partial: { label: "Parziale", cls: "bg-sky-100 text-sky-700", Icon: Timer },
  noshow: { label: "Non presentato", cls: "bg-amber-100 text-amber-700", Icon: UserX },
  cancelled: { label: "Annullato", cls: "bg-stone-200 text-stone-500", Icon: Ban },
};
function downloadICS(booking, staff, services, brandName) {
  const st = staff.find((s) => s.id === booking.staffId);
  const names = booking.serviceIds.map((id) => { const s = services.find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  const d = parseDate(booking.date);
  const f = (m) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`;
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SaloneApp//IT", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:${booking.id}@saloneapp`, `DTSTAMP:${stamp}`, `DTSTART:${f(booking.startMin)}`, `DTEND:${f(booking.endMin)}`, `SUMMARY:${brandName} - ${names}`, `DESCRIPTION:Servizi: ${names}\\nCon: ${st ? st.name : "-"}`, "BEGIN:VALARM", "TRIGGER:-PT60M", "ACTION:DISPLAY", "DESCRIPTION:Promemoria appuntamento", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "appuntamento.ics"; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function paintCard(ctx, branding, name, code, logoImg) {
  const W = 720, H = 440;
  let rgb; try { rgb = hexToRgb(branding.primary); } catch (e) { rgb = [225, 29, 72]; }
  const dark = mix(rgb, [0, 0, 0], 0.18);
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, rgbStr(rgb)); g.addColorStop(1, rgbStr(dark));
  roundRect(ctx, 0, 0, W, H, 36); ctx.fillStyle = g; ctx.fill();
  ctx.save(); roundRect(ctx, 0, 0, W, H, 36); ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.arc(W - 30, -10, 130, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.beginPath(); ctx.arc(W - 10, 130, 90, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  const font = (w, s) => `${w} ${s}px -apple-system, system-ui, Segoe UI, Roboto, sans-serif`;
  let nameX = 52;
  if (logoImg) { ctx.save(); roundRect(ctx, 52, 42, 56, 56, 14); ctx.clip(); ctx.drawImage(logoImg, 52, 42, 56, 56); ctx.restore(); nameX = 124; }
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle";
  ctx.font = font("600", 30); ctx.fillText(branding.name || "", nameX, 72);
  ctx.font = font("500", 22); ctx.textAlign = "right"; ctx.globalAlpha = 0.92; ctx.fillText("★ Carta Fedeltà", W - 44, 66); ctx.textAlign = "left"; ctx.globalAlpha = 1;
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = 0.7; ctx.font = font("600", 20); ctx.fillText("INTESTATARIO", 52, 252);
  ctx.globalAlpha = 1; ctx.font = font("600", 42); ctx.fillText(name || "Cliente", 52, 302);
  ctx.globalAlpha = 0.7; ctx.font = font("600", 20); ctx.fillText("CODICE", 52, 362);
  ctx.globalAlpha = 1; ctx.font = font("700", 58); ctx.fillText(String(code), 52, 418);
}
function downloadCardImage(branding, name, code) {
  const c = document.createElement("canvas"); c.width = 720; c.height = 440; const ctx = c.getContext("2d");
  const finish = () => { try { const url = c.toDataURL("image/png"); const a = document.createElement("a"); a.href = url; a.download = `tessera-${code}.png`; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { alert("Impossibile generare l'immagine."); } };
  if (branding.logo) { const img = new Image(); img.onload = () => { paintCard(ctx, branding, name, code, img); finish(); }; img.onerror = () => { paintCard(ctx, branding, name, code, null); finish(); }; img.src = branding.logo; }
  else { paintCard(ctx, branding, name, code, null); finish(); }
}

function receiptHTML(booking, config, code) {
  const branding = config.branding, services = config.services, staff = config.staff;
  const st = staff.find((s) => s.id === booking.staffId);
  const items = booking.serviceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean);
  const total = items.reduce((a, s) => a + s.durationMin, 0);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const logo = branding.logo ? `<img src="${branding.logo}" style="width:120px;height:120px;object-fit:contain;display:block;margin:0 auto 6px;border-radius:8px"/>` : "";
  const rows = items.map((s) => `<tr><td>${esc(s.name)}</td><td style="text-align:right;white-space:nowrap">${s.durationMin}'</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Riepilogo</title><style>@page{size:80mm auto;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{width:72mm;margin:0 auto;padding:8px 4px;font-family:'Courier New',monospace;color:#000}.c{text-align:center}.b{font-weight:bold}.big{font-size:15px}.sm{font-size:11px}hr{border:none;border-top:1px dashed #000;margin:6px 0}table{width:100%;font-size:12px;border-collapse:collapse}td{padding:1px 0;vertical-align:top}.row{display:flex;justify-content:space-between;gap:8px;font-size:12px}</style></head><body>${logo}<div class="c b big">${esc(branding.name)}</div>${branding.address ? `<div class="c sm">${esc(branding.address)}</div>` : ""}${branding.phone ? `<div class="c sm">${esc(branding.phone)}</div>` : ""}<hr/><div class="c b">RIEPILOGO APPUNTAMENTO</div><hr/><div class="row"><span>Cliente</span><span class="b">${esc(booking.clientName)}</span></div><div class="row"><span>Codice</span><span>${esc(code || booking.clientCode || "-")}</span></div><div class="row"><span>Data</span><span>${esc(fmtDate(booking.date))}</span></div><div class="row"><span>Orario</span><span>${minToStr(booking.startMin)} - ${minToStr(booking.endMin)}</span></div><div class="row"><span>Operatore</span><span>${st ? esc(st.name) : "-"}</span></div><hr/><table>${rows}</table><hr/><div class="row b"><span>Durata totale</span><span>${total} min</span></div><hr/><div class="c sm">Grazie e a presto!</div></body></html>`;
}
function printReceipt(booking, config, code) {
  try {
    const html = receiptHTML(booking, config, code);
    const ifr = document.createElement("iframe");
    ifr.style.position = "fixed"; ifr.style.width = "0"; ifr.style.height = "0"; ifr.style.right = "0"; ifr.style.bottom = "0"; ifr.style.border = "0";
    document.body.appendChild(ifr);
    const doc = ifr.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (e) {} setTimeout(() => { ifr.remove(); }, 1500); }, 500);
  } catch (e) { alert("Stampa non disponibile."); }
}

function saleReceiptHTML(sale, branding) {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const logo = branding.logo ? `<img src="${branding.logo}" style="width:120px;height:120px;object-fit:contain;display:block;margin:0 auto 6px;border-radius:8px"/>` : "";
  const rows = sale.items.map((it) => `<tr><td>${esc(it.name)}${it.label ? ` <span style="color:#666">(${esc(it.label)})</span>` : ""}<br><span style="color:#666">${it.qty} × ${eur(it.price)}</span></td><td style="text-align:right;white-space:nowrap;vertical-align:top">${eur(it.price * it.qty)}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Scontrino</title><style>@page{size:80mm auto;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{width:72mm;margin:0 auto;padding:8px 4px;font-family:'Courier New',monospace;color:#000}.c{text-align:center}.b{font-weight:bold}.big{font-size:15px}.sm{font-size:11px}hr{border:none;border-top:1px dashed #000;margin:6px 0}table{width:100%;font-size:12px;border-collapse:collapse}td{padding:2px 0;vertical-align:top}.row{display:flex;justify-content:space-between;gap:8px;font-size:13px}</style></head><body>${logo}<div class="c b big">${esc(branding.name)}</div>${branding.address ? `<div class="c sm">${esc(branding.address)}</div>` : ""}${branding.phone ? `<div class="c sm">${esc(branding.phone)}</div>` : ""}<hr/><div class="c b">SCONTRINO PRODOTTI${sale.partial ? " · PARZIALE" : ""}</div><div class="c sm">${esc(fmtDateTime(sale.ts))}</div>${sale.clientName ? `<div class="c sm">Cliente: ${esc(sale.clientName)}${sale.clientCode ? ` #${esc(sale.clientCode)}` : ""}</div>` : ""}<hr/><table>${rows}</table><hr/><div class="row b"><span>TOTALE</span><span>${eur(sale.total)}</span></div><hr/><div class="c sm">Grazie e a presto!</div></body></html>`;
}
function printSale(sale, branding) {
  try {
    const html = saleReceiptHTML(sale, branding);
    const ifr = document.createElement("iframe");
    ifr.style.position = "fixed"; ifr.style.width = "0"; ifr.style.height = "0"; ifr.style.right = "0"; ifr.style.bottom = "0"; ifr.style.border = "0";
    document.body.appendChild(ifr);
    const doc = ifr.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (e) {} setTimeout(() => { ifr.remove(); }, 1500); }, 500);
  } catch (e) { alert("Stampa non disponibile."); }
}

function priceListHTML(config) {
  const branding = config.branding || {};
  const services = config.services || [];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const brand = branding.primary || "#7c3aed";
  const PAL = ["#7c3aed", "#0d9488", "var(--lc-accent)", "#f59e0b", "#2563eb", "#16a34a", "#db2777", "#0891b2"];
  const logo = branding.logo ? `<img class="logo" src="${branding.logo}" alt=""/>` : "";
  const contacts = [branding.address, branding.phone, branding.email].filter(Boolean).map(esc).join("&nbsp;&nbsp;&middot;&nbsp;&nbsp;");
  const cards = services.map((s, idx) => {
    const c = PAL[idx % PAL.length];
    const dur = s.durationMin ? `<span class="du" style="background:${c}20;color:${c}">${s.durationMin} min</span>` : "<span></span>";
    const has = s.price != null && String(s.price).trim() !== "" && Number(s.price) > 0;
    const pr = has ? `<span class="pr" style="color:${c}">${esc(eur(s.price))}</span>` : "";
    return `<div class="card"><div class="band" style="background:${c}"></div><div class="body" style="background:${c}0F"><div class="nm">${esc(s.name)}</div><div class="meta">${dur}${pr}</div></div></div>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Listino servizi</title><style>
    @page{size:A4;margin:0}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937}
    .header{background:${brand};color:#fff;padding:30px 18mm 26px;text-align:center}
    .logo{width:72px;height:72px;object-fit:contain;border-radius:50%;background:#fff;padding:5px;margin-bottom:10px}
    .name{font-size:30px;font-weight:800;letter-spacing:.4px;line-height:1.05;margin:0}
    .tag{font-size:13px;opacity:.92;margin-top:6px;font-weight:500}
    .contacts{font-size:10.5px;opacity:.85;margin-top:9px;letter-spacing:.2px}
    .wrap{padding:24px 16mm 16mm}
    .title{text-align:center;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#9ca3af;font-weight:700;margin-bottom:20px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .card{break-inside:avoid;border-radius:14px;overflow:hidden;border:1px solid #eef0f3}
    .band{height:7px}
    .body{padding:13px 15px}
    .nm{font-size:14px;font-weight:700;color:#1f2937;line-height:1.2}
    .meta{display:flex;align-items:center;justify-content:space-between;margin-top:10px;gap:8px;min-height:24px}
    .du{font-size:10.5px;font-weight:700;padding:3px 10px;border-radius:999px;letter-spacing:.2px}
    .pr{font-size:17px;font-weight:800;white-space:nowrap;margin-left:auto}
    .foot{text-align:center;font-size:9.5px;color:#b4afbe;margin-top:24px;letter-spacing:.2px}
  </style></head><body>
    <div class="header">${logo}<div class="name">${esc(branding.name || "Listino")}</div>${branding.tagline ? `<div class="tag">${esc(branding.tagline)}</div>` : ""}${contacts ? `<div class="contacts">${contacts}</div>` : ""}</div>
    <div class="wrap">
      <div class="title">Listino servizi</div>
      <div class="grid">${cards || '<div class="card"><div class="band" style="background:#ccc"></div><div class="body"><div class="nm">Nessun servizio inserito.</div></div></div>'}</div>
      <div class="foot">Listino aggiornato al ${esc(fmtDate(todayStr()))}&nbsp;&nbsp;&middot;&nbsp;&nbsp;I prezzi possono subire variazioni</div>
    </div>
  </body></html>`;
}
function printPriceList(config) {
  try {
    const html = priceListHTML(config);
    const ifr = document.createElement("iframe");
    ifr.style.position = "fixed"; ifr.style.width = "0"; ifr.style.height = "0"; ifr.style.right = "0"; ifr.style.bottom = "0"; ifr.style.border = "0";
    document.body.appendChild(ifr);
    const doc = ifr.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (e) {} setTimeout(() => { ifr.remove(); }, 1500); }, 500);
  } catch (e) { alert("Generazione listino non disponibile."); }
}

// La licenza NON viene inclusa nel backup: il cliente non può estendersela reimportando un file.
function exportBackup(config, bookings, clients, catalog, sales) {
  const data = { config, bookings, clients, catalog, sales, exportedAt: new Date().toISOString(), version: 3 };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `backup-salone-${todayStr()}.json`; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

const BACKUP_KEY = "salon-backup-meta-v1";
function backupPayload(config, bookings, clients, catalog, sales) { return { config, bookings, clients, catalog, sales, exportedAt: new Date().toISOString(), version: 3 }; }
function openBackupDB() { return new Promise((res, rej) => { const r = indexedDB.open("lucentia-backup", 1); r.onupgradeneeded = () => { r.result.createObjectStore("h"); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function saveDirHandle(handle) { const db = await openBackupDB(); await new Promise((res, rej) => { const tx = db.transaction("h", "readwrite"); tx.objectStore("h").put(handle, "dir"); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }
async function loadDirHandle() { try { const db = await openBackupDB(); return await new Promise((res) => { const tx = db.transaction("h", "readonly"); const rq = tx.objectStore("h").get("dir"); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); }); } catch (e) { return null; } }
async function clearDirHandle() { try { const db = await openBackupDB(); await new Promise((res) => { const tx = db.transaction("h", "readwrite"); tx.objectStore("h").delete("dir"); tx.oncomplete = () => res(); tx.onerror = () => res(); }); } catch (e) {} }
async function writeBackupToDir(handle, data) {
  if (handle.queryPermission) { let p = await handle.queryPermission({ mode: "readwrite" }); if (p !== "granted") { p = await handle.requestPermission({ mode: "readwrite" }); if (p !== "granted") throw new Error("perm"); } }
  const fh = await handle.getFileHandle(`lucentia-backup-${todayStr()}.json`, { create: true });
  const w = await fh.createWritable(); await w.write(JSON.stringify(data, null, 2)); await w.close();
}

const BRAND_CSS = ".brand-bg{background:var(--brand);color:#fff}.brand-bg:hover:not(:disabled){background:var(--brand-dark)}.brand-soft{background:var(--brand-soft)}.brand-text{color:var(--brand-text)}.brand-accent{color:var(--brand)}.brand-border{border-color:var(--brand)!important}.brand-hover:hover{border-color:var(--brand)}.brand-ring:focus,.brand-ring:focus-within{outline:none;box-shadow:0 0 0 3px var(--brand-ring)}";

function FidelityCard({ branding, name, code }) {
  return (
    <div className="rounded-2xl p-5 text-white shadow-lg relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-dark))" }}>
      <div className="absolute right-0 top-0 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,0.12)", transform: "translate(35%,-35%)" }} />
      <div className="absolute right-0 top-12 w-20 h-20 rounded-full" style={{ background: "rgba(255,255,255,0.1)", transform: "translate(25%,0)" }} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {branding.logo ? <img src={branding.logo} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}><Sparkles size={16} /></div>}
            <span className="font-semibold text-sm truncate">{branding.name}</span>
          </div>
          <div className="flex items-center gap-1 text-xs shrink-0" style={{ opacity: 0.9 }}><Star size={13} /> Carta Fedeltà</div>
        </div>
        <div className="mt-6">
          <div className="text-xs uppercase tracking-widest" style={{ opacity: 0.7 }}>Intestatario</div>
          <div className="text-lg font-semibold tracking-wide truncate">{name || "Cliente"}</div>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ opacity: 0.7 }}>Codice</div>
            <div className="text-2xl font-bold tracking-widest">{code}</div>
          </div>
          <Hash size={20} style={{ opacity: 0.5 }} />
        </div>
      </div>
    </div>
  );
}
function CardActions({ branding, name, code }) {
  return (
    <div className="mt-2 flex flex-col items-center gap-1">
      <button onClick={() => downloadCardImage(branding, name, code)} className="text-sm brand-bg px-4 py-2 rounded-lg inline-flex items-center gap-2"><Wallet size={16} /> Salva tessera</button>
      <p className="text-xs text-stone-400 text-center">Salvala come immagine.</p>
    </div>
  );
}

// ===== BUONI REGALO (gift card) =====
function genVoucherCode(vouchers) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const exists = (c) => (vouchers || []).some((v) => v.code === c);
  let c; do { let s = ""; for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]; c = "BN-" + s; } while (exists(c));
  return c;
}
function voucherServiceName(v, services) { const s = (services || []).find((x) => x.id === v.serviceId); return s ? s.name : "Servizio"; }
function voucherSubtitle(v, services) {
  if (v.tipo === "valore") return eur(v.tipo === "valore" ? (v.residuo != null ? v.residuo : v.importo) : 0);
  return `${v.sedute} sedute · ${voucherServiceName(v, services)}`;
}
function paintVoucher(ctx, branding, v, line1, line2, logoImg) {
  const W = 720, H = 440;
  let rgb; try { rgb = hexToRgb(branding.primary); } catch (e) { rgb = [225, 29, 72]; }
  const dark = mix(rgb, [0, 0, 0], 0.2);
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, rgbStr(rgb)); g.addColorStop(1, rgbStr(dark));
  roundRect(ctx, 0, 0, W, H, 36); ctx.fillStyle = g; ctx.fill();
  ctx.save(); roundRect(ctx, 0, 0, W, H, 36); ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.arc(W - 30, -10, 130, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.beginPath(); ctx.arc(W - 10, 130, 90, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  const font = (w, s) => `${w} ${s}px -apple-system, system-ui, Segoe UI, Roboto, sans-serif`;
  let nameX = 52;
  if (logoImg) { ctx.save(); roundRect(ctx, 52, 42, 56, 56, 14); ctx.clip(); ctx.drawImage(logoImg, 52, 42, 56, 56); ctx.restore(); nameX = 124; }
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle";
  ctx.font = font("600", 30); ctx.fillText(branding.name || "", nameX, 72);
  ctx.font = font("600", 22); ctx.textAlign = "right"; ctx.globalAlpha = 0.92; ctx.fillText("★ Buono Regalo", W - 44, 66); ctx.textAlign = "left"; ctx.globalAlpha = 1;
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = 1; ctx.font = font("700", 52); ctx.fillText(line1 || "", 52, 240);
  if (line2) { ctx.globalAlpha = 0.92; ctx.font = font("500", 26); ctx.fillText(line2, 52, 286); }
  ctx.globalAlpha = 0.7; ctx.font = font("600", 20); ctx.fillText("CODICE", 52, 362);
  ctx.globalAlpha = 1; ctx.font = font("700", 50); ctx.fillText(String(v.code), 52, 414);
}
function voucherLines(v, services) {
  if (v.tipo === "valore") return [eur(v.importo), v.descrizione || "Buono valore"];
  return [`${v.sedute} sedute`, (v.descrizione ? v.descrizione + " · " : "") + voucherServiceName(v, services)];
}
function downloadVoucherImage(branding, v, services) {
  const [l1, l2] = voucherLines(v, services);
  const c = document.createElement("canvas"); c.width = 720; c.height = 440; const ctx = c.getContext("2d");
  const finish = () => { try { const url = c.toDataURL("image/png"); const a = document.createElement("a"); a.href = url; a.download = `buono-${v.code}.png`; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { alert("Impossibile generare l'immagine."); } };
  if (branding.logo) { const img = new Image(); img.onload = () => { paintVoucher(ctx, branding, v, l1, l2, img); finish(); }; img.onerror = () => { paintVoucher(ctx, branding, v, l1, l2, null); finish(); }; img.src = branding.logo; }
  else { paintVoucher(ctx, branding, v, l1, l2, null); finish(); }
}
function VoucherCard({ branding, v, services }) {
  const [l1, l2] = voucherLines(v, services);
  return (
    <div className="rounded-2xl p-5 text-white shadow-lg relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-dark))" }}>
      <div className="absolute right-0 top-0 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,0.12)", transform: "translate(35%,-35%)" }} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {branding.logo ? <img src={branding.logo} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}><Gift size={16} /></div>}
            <span className="font-semibold text-sm truncate">{branding.name}</span>
          </div>
          <div className="flex items-center gap-1 text-xs shrink-0" style={{ opacity: 0.9 }}><Gift size={13} /> Buono Regalo</div>
        </div>
        <div className="mt-6">
          <div className="text-3xl font-bold tracking-wide">{l1}</div>
          {l2 ? <div className="text-sm mt-1" style={{ opacity: 0.9 }}>{l2}</div> : null}
        </div>
        <div className="mt-4">
          <div className="text-xs uppercase tracking-widest" style={{ opacity: 0.7 }}>Codice</div>
          <div className="text-2xl font-bold tracking-widest">{v.code}</div>
        </div>
      </div>
    </div>
  );
}

function SlotPicker({ duration, candidates, bookings, value, onChange, startDate, closures }) {
  const [weekStart, setWeekStart] = useState(startDate);
  const [date, setDate] = useState(startDate);
  const maxDate = pd(new Date(Date.now() + ADVANCE_DAYS * 864e5));
  const slotMap = useMemo(() => computeSlots(date, duration, candidates, bookings, closures), [date, duration, candidates, bookings, closures]);
  const slotTimes = useMemo(() => Object.keys(slotMap).map(Number).sort((a, b) => a - b), [slotMap]);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const d0 = parseDate(weekDays[0]); const d6 = parseDate(weekDays[6]);
  const rangeLabel = `${d0.getDate()} – ${d6.getDate()} ${MONTHS[d6.getMonth()]} ${d6.getFullYear()}`;
  const groups = [
    { label: "Mattina", Icon: Sunrise, times: slotTimes.filter((t) => t < 720) },
    { label: "Pomeriggio", Icon: Sun, times: slotTimes.filter((t) => t >= 720 && t < 1020) },
    { label: "Sera", Icon: Moon, times: slotTimes.filter((t) => t >= 1020) },
  ].filter((g) => g.times.length);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button disabled={weekStart <= todayStr()} onClick={() => setWeekStart((w) => { const p = addDays(w, -7); return p < todayStr() ? todayStr() : p; })} className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ChevronLeft size={18} /></button>
        <span className="text-sm font-medium capitalize">{rangeLabel}</span>
        <button disabled={addDays(weekStart, 7) > maxDate} onClick={() => setWeekStart((w) => addDays(w, 7))} className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((ds) => { const d = parseDate(ds); const beyond = ds > maxDate; const has = !beyond && Object.keys(computeSlots(ds, duration, candidates, bookings, closures)).length > 0; const isSel = ds === date; return (
          <button key={ds} disabled={!has} onClick={() => { setDate(ds); onChange(null); }} className={`flex flex-col items-center py-2 rounded-xl border transition ${isSel ? "brand-bg border-transparent" : has ? "bg-white border-stone-200 brand-hover" : "bg-stone-50 border-stone-100 text-stone-300 cursor-not-allowed"}`}>
            <span className={`text-xs uppercase ${isSel ? "opacity-80" : "text-stone-400"}`}>{WDAY_SHORT[d.getDay()]}</span>
            <span className="text-base font-semibold leading-tight">{d.getDate()}</span>
          </button>
        ); })}
      </div>
      <div className="mt-5">
        {slotTimes.length === 0 ? <p className="text-sm text-stone-400 bg-stone-50 rounded-lg p-3 text-center">Nessuno slot disponibile per <span className="font-medium">{fmtDate(date)}</span>.</p> : (
          <div className="space-y-4">{groups.map((g) => (
            <div key={g.label}>
              <div className="flex items-center gap-1.5 text-xs font-medium text-stone-400 uppercase tracking-wide mb-2"><g.Icon size={13} className="brand-accent" /> {g.label}</div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">{g.times.map((t) => { const on = value && value.date === date && value.startMin === t; return <button key={t} onClick={() => onChange({ date, startMin: t })} className={`py-2 rounded-lg border text-sm font-medium transition ${on ? "brand-bg border-transparent" : "bg-white border-stone-200 brand-hover"}`}>{minToStr(t)}</button>; })}</div>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}

function RescheduleModal({ booking, config, bookings, onClose, onSave }) {
  const services = config.services, staff = config.staff;
  const dur = booking.endMin - booking.startMin;
  const st = staff.find((s) => s.id === booking.staffId);
  const candidates = st ? [st] : qualifiedStaff(staff, booking.serviceIds);
  const others = useMemo(() => bookings.filter((b) => b.id !== booking.id), [bookings, booking.id]);
  const start = booking.date >= todayStr() ? booking.date : todayStr();
  const [pick, setPick] = useState(null);
  const names = booking.serviceIds.map((id) => { const s = services.find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 overflow-auto" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold flex items-center gap-2"><CalendarClock size={16} className="brand-accent" /> Sposta appuntamento</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>
        <p className="text-sm text-stone-400 mb-4">{names} · {st ? st.name : "operatore"} — attuale: {fmtDate(booking.date)} {minToStr(booking.startMin)}</p>
        <SlotPicker duration={dur} candidates={candidates} bookings={others} value={pick} onChange={setPick} startDate={start} closures={config.closures} />
        <button disabled={!pick} onClick={() => onSave(pick.date, pick.startMin)} className="w-full brand-bg disabled:opacity-40 disabled:cursor-not-allowed font-medium py-2.5 rounded-lg transition mt-5">Conferma nuovo orario</button>
      </div>
    </div>
  );
}

const ALL_FLAGS = { fidelity: true, vendite: true, statistiche: true, marketing: true, allergeni: true, pacchetti: true, maxOperatori: Infinity };
function flagsFromModuli(moduli) {
  if (!Array.isArray(moduli)) return ALL_FLAGS;
  const has = (k) => moduli.includes(k);
  return {
    fidelity: has("fidelity"), vendite: has("vendite"), statistiche: has("statistiche"),
    marketing: has("marketing"), allergeni: has("allergeni"), pacchetti: has("pacchetti"),
    maxOperatori: has("opinf") ? Infinity : (has("op3") ? 3 : 1),
  };
}
const ModsCtx = createContext(ALL_FLAGS);
function useMods() { return useContext(ModsCtx) || ALL_FLAGS; }
function planName(moduli) {
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
export default function SalonApp({ onLogout, moduli, azienda, demo }) {
  const flags = flagsFromModuli(moduli);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [catalog, setCatalog] = useState(DEFAULT_CATALOG);
  const [sales, setSales] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  const [license, setLicense] = useState(() => loadLicense()); // licenza: resta in locale, invariata
  const [session, setSession] = useState({ role: "operator", hidePartial: false }); // login gestito dal contenitore (server)
  const [view, setView] = useState("agenda");
  const enabledSections = ["agenda", "clienti", "buoni", ...(flags.vendite ? ["shop"] : []), ...(flags.statistiche ? ["stats"] : []), ...(flags.marketing ? ["marketing"] : []), "settings"];
  useEffect(() => { if (!enabledSections.includes(view)) setView("agenda"); }, [moduli, view]);
  const [demoBanner, setDemoBanner] = useState(!!demo);
  const isDemo = !!demo;
  const demoRef = useRef(false); demoRef.current = false;
  const [backupDir, setBackupDir] = useState(null);
  const [backupDirName, setBackupDirName] = useState("");
  const [lastBackup, setLastBackup] = useState(() => loadKey(BACKUP_KEY, null));
  const backupDirRef = useRef(null); backupDirRef.current = backupDir;
  const dataRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [cfg, bk, cl, cat, sl] = await Promise.all([
        apiLoad("config", null), apiLoad("bookings", null), apiLoad("clients", null), apiLoad("catalog", null), apiLoad("sales", null),
      ]);
      if (!alive) return;
      const vch = await apiLoad("vouchers", null);
      if (alive) setVouchers(Array.isArray(vch) ? vch : []);
      if (cfg == null && bk == null && cl == null && sl == null) {
        const s = buildSampleData();
        setConfig(DEFAULT_CONFIG); setBookings(s.bookings); setClients(s.clients); setSales(s.sales); setCatalog(DEFAULT_CATALOG);
        await Promise.all([ apiSave("config", DEFAULT_CONFIG), apiSave("bookings", s.bookings), apiSave("clients", s.clients), apiSave("sales", s.sales), apiSave("catalog", DEFAULT_CATALOG) ]);
      } else {
        setConfig(cfg ? { ...DEFAULT_CONFIG, ...cfg, branding: { ...BRANDING, ...(cfg.branding || {}) } } : DEFAULT_CONFIG);
        setBookings(Array.isArray(bk) ? bk : []);
        setClients(Array.isArray(cl) ? cl : []);
        setCatalog(cat && Array.isArray(cat.products) ? cat : DEFAULT_CATALOG);
        setSales(Array.isArray(sl) ? sl : []);
      }
      loadedRef.current = true;
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (demoRef.current || !loadedRef.current) return; apiSaveDebounced("bookings", bookings); }, [bookings]);
  useEffect(() => { if (demoRef.current || !loadedRef.current) return; apiSaveDebounced("clients", clients); }, [clients]);
  useEffect(() => { if (demoRef.current || !loadedRef.current) return; apiSaveDebounced("catalog", catalog); }, [catalog]);
  useEffect(() => { if (demoRef.current || !loadedRef.current) return; apiSaveDebounced("sales", sales); }, [sales]);
  useEffect(() => { if (demoRef.current || !loadedRef.current) return; apiSaveDebounced("vouchers", vouchers); }, [vouchers]);
  dataRef.current = { config, bookings, clients, catalog, sales };
  useEffect(() => { loadDirHandle().then((h) => { if (h) { setBackupDir(h); setBackupDirName(h.name || "cartella"); } }); }, []);
  useEffect(() => {
    const tick = async () => {
      if (demoRef.current) return;
      const d = dataRef.current || {}; const bkc = (d.config && d.config.backup) || {};
      if (!bkc.enabled || !bkc.time) return;
      const h = backupDirRef.current; if (!h) return;
      const today = todayStr(); const last = loadKey(BACKUP_KEY, null);
      if (last && last.date === today) return;
      const now = new Date(); const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      if (hhmm >= bkc.time) { try { await writeBackupToDir(h, backupPayload(d.config, d.bookings, d.clients, d.catalog, d.sales)); const info = { date: today, at: Date.now() }; saveKey(BACKUP_KEY, info); setLastBackup(info); } catch (e) {} }
    };
    const id = setInterval(tick, 60000); const t0 = setTimeout(tick, 5000);
    return () => { clearInterval(id); clearTimeout(t0); };
  }, []);
  // La licenza è ora verificata dal server: nessun controllo locale qui.
  useEffect(() => {}, [session]);

  const saveConfig = (next) => { setConfig(next); if (!demoRef.current && loadedRef.current) apiSaveDebounced("config", next); };
  const updateLicense = (lic) => { setLicense(lic); saveLicense(lic); };
  const enterSession = (role, hidePartial) => {
    if (role === "demo") {
      const d = buildDemoData();
      setConfig(d.config); setBookings(d.bookings); setClients(d.clients); setCatalog(d.catalog); setSales(d.sales);
      setView("agenda"); setDemoBanner(true); setSession({ role: "demo", hidePartial: false }); return;
    }
    setSession({ role, hidePartial: !!hidePartial });
  };
  const logout = () => {
    const wasDemo = demoRef.current;
    setDemoBanner(false); setSession(null);
    if (wasDemo) (async () => {
      const [cfg, bk, cl, cat, sl] = await Promise.all([
        apiLoad("config", null), apiLoad("bookings", null), apiLoad("clients", null), apiLoad("catalog", null), apiLoad("sales", null),
      ]);
      setConfig(cfg ? { ...DEFAULT_CONFIG, ...cfg, branding: { ...BRANDING, ...(cfg.branding || {}) } } : DEFAULT_CONFIG);
      setBookings(Array.isArray(bk) ? bk : []); setClients(Array.isArray(cl) ? cl : []);
      setCatalog(cat && Array.isArray(cat.products) ? cat : DEFAULT_CATALOG); setSales(Array.isArray(sl) ? sl : []);
    })();
  };
  const b = config.branding;
  const pickBackupDir = async () => {
    if (!window.showDirectoryPicker) { alert("La scelta della cartella non è supportata in questo ambiente. Su Windows funziona; altrimenti usa \"Esporta backup\"."); return; }
    try { const h = await window.showDirectoryPicker({ mode: "readwrite", id: "lucentia-backup" }); await saveDirHandle(h); setBackupDir(h); setBackupDirName(h.name || "cartella"); } catch (e) {}
  };
  const backupNow = async () => {
    const h = backupDirRef.current; if (!h) { alert("Scegli prima una cartella di destinazione."); return; }
    try { await writeBackupToDir(h, backupPayload(config, bookings, clients, catalog, sales)); const info = { date: todayStr(), at: Date.now() }; saveKey(BACKUP_KEY, info); setLastBackup(info); alert("Backup salvato nella cartella scelta."); } catch (e) { alert("Backup non riuscito: permesso negato o cartella non disponibile. Riprova."); }
  };
  const clearBackupDir = async () => { await clearDirHandle(); setBackupDir(null); setBackupDirName(""); };

  if (!session) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-800" style={themeVars(b.primary)}>
        <style>{BRAND_CSS}</style>
        <LoginGate branding={b} license={license} onUnlock={(role, hidePartial) => enterSession(role, hidePartial)} />
      </div>
    );
  }

  const ls = licenseState(license);
  const operatorWarn = session.role === "operator" && ls.state === "active" && !ls.unlimited && ls.days <= 30;
  const ALL_NAV = [["agenda", "Agenda", Calendar], ["clienti", "Clienti", Users], ["buoni", "Buoni", Gift], ["shop", "Vendite", ShoppingBag], ["stats", "Statistiche", BarChart3], ["marketing", "Marketing", MessageCircle], ["settings", "Impostazioni", Settings]];
  const canAddVoucher = !isDemo || vouchers.filter((v) => !v.seed).length < 5;
  const NAV = ALL_NAV.filter((x) => enabledSections.includes(x[0]));
  const canAddClient = !isDemo || clients.filter((c) => !c.seed).length < 2;
  const canAddBooking = !isDemo || bookings.filter((b) => !b.seed).length < 20;

  return (
    <ModsCtx.Provider value={flags}>
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col" style={themeVars(b.primary)}>
      <style>{BRAND_CSS}</style>
      <header className="bg-white/80 backdrop-blur-xl border-b border-stone-200/70 sticky top-0 z-20" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 28px)", boxShadow: "var(--lc-shadow-xs)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {b.logo ? <img src={b.logo} alt="logo" className="w-9 h-9 rounded-xl object-cover shrink-0 ring-1 ring-stone-200" /> : <div className="w-9 h-9 rounded-xl brand-bg flex items-center justify-center shrink-0"><Sparkles size={18} /></div>}
            <div className="min-w-0 hidden sm:block">
              <div className="font-semibold leading-tight truncate tracking-tight">{b.name}</div>
              {b.tagline ? <div className="text-xs text-stone-400 leading-tight truncate">{b.tagline}</div> : null}
            </div>
          </div>
          <nav className="flex items-center gap-0.5 shrink-0">
            {NAV.map((item) => { const k = item[0], label = item[1], Icon = item[2]; return (
              <button key={k} onClick={() => setView(k)} aria-current={view === k ? "page" : undefined} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition ${view === k ? "brand-soft brand-text" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"}`}>
                <Icon size={16} /><span className="hidden lg:inline">{label}</span>
              </button>
            ); })}
            {session.role === "reseller" ? <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium bg-stone-800 text-white px-2 py-1 rounded-lg ml-1"><ShieldCheck size={13} /> Rivenditore</span> : null}
            {isDemo ? <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-500 text-white px-2 py-1 rounded-lg ml-1"><Sparkles size={13} /> Demo</span> : null}
            <button onClick={onLogout} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-100 ml-1" title="Esci"><LogOut size={16} /><span className="hidden lg:inline">Esci</span></button>
          </nav>
        </div>
        {operatorWarn ? <div className="bg-amber-50 border-t border-amber-200 text-amber-700 text-xs text-center py-1.5 flex items-center justify-center gap-1.5"><AlertTriangle size={13} /> Licenza in scadenza tra {ls.days} giorn{ls.days === 1 ? "o" : "i"}. Contatta il rivenditore per il rinnovo.</div> : null}
      </header>

      <main key={view} className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 lc-fade-up">
        {view === "agenda" && <AgendaPage config={config} bookings={bookings} setBookings={setBookings} clients={clients} setClients={setClients} sales={sales} catalog={catalog} hidePartial={session.hidePartial} canAddBooking={canAddBooking} canAddClient={canAddClient} />}
        {view === "clienti" && <ClientsView config={config} bookings={bookings} clients={clients} setClients={setClients} sales={sales} catalog={catalog} vouchers={vouchers} setVouchers={setVouchers} />}
        {view === "buoni" && <GiftCardsView config={config} vouchers={vouchers} setVouchers={setVouchers} clients={clients} canAddVoucher={canAddVoucher} />}
        {view === "shop" && <ShopView catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} clients={clients} setClients={setClients} branding={b} loyalty={config.loyalty} hidePartial={session.hidePartial} canAddClient={canAddClient} demo={isDemo} />}
        {view === "stats" && <StatsView config={config} bookings={bookings} clients={clients} sales={sales} catalog={catalog} vouchers={vouchers} />}
        {view === "marketing" && <MarketingView config={config} saveConfig={saveConfig} bookings={bookings} clients={clients} sales={sales} catalog={catalog} />}
        {view === "settings" && (isDemo ? (
          <div>
            <div className="mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" /> In versione demo le impostazioni sono <b>visibili ma non modificabili</b>.</div>
            <fieldset disabled style={{ border: 0, margin: 0, padding: 0, minInlineSize: "auto" }}>
              <SettingsView config={config} saveConfig={saveConfig} bookings={bookings} setBookings={setBookings} clients={clients} setClients={setClients} catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} session={session} license={license} onSaveLicense={updateLicense} backupDirName={backupDirName} onPickBackupDir={pickBackupDir} onClearBackupDir={clearBackupDir} onBackupNow={backupNow} lastBackup={lastBackup} licenza={{ plan: planName(moduli), prezzo_finale: azienda && azienda.prezzo_finale, scadenza: azienda && azienda.licenza_scadenza }} />
            </fieldset>
          </div>
        ) : (
          <SettingsView config={config} saveConfig={saveConfig} bookings={bookings} setBookings={setBookings} clients={clients} setClients={setClients} catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} session={session} license={license} onSaveLicense={updateLicense} backupDirName={backupDirName} onPickBackupDir={pickBackupDir} onClearBackupDir={clearBackupDir} onBackupNow={backupNow} lastBackup={lastBackup} licenza={{ plan: planName(moduli), prezzo_finale: azienda && azienda.prezzo_finale, scadenza: azienda && azienda.licenza_scadenza }} />
        ))}
      </main>

      {isDemo && demoBanner ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 lc-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl lc-scale-in">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles size={18} className="brand-accent lc-float" /> Demo gratuita</h3>
            <p className="text-sm text-stone-600 mt-3">Stai provando Lucentia in versione dimostrativa per <b>10 giorni</b>. Cosa tenere presente:</p>
            <ul className="text-sm text-stone-600 mt-3 space-y-2">
              <li className="flex gap-2"><AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" /><span>I tuoi dati <b>vengono salvati</b> e li ritrovi a ogni accesso entro i 10 giorni.</span></li>
              <li className="flex gap-2"><AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" /><span>Puoi creare fino a <b>2 clienti</b>, <b>20 appuntamenti</b> e <b>5 buoni</b>.</span></li>
              <li className="flex gap-2"><AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" /><span>Puoi vendere i <b>prodotti già caricati</b>; le <b>Impostazioni</b> sono in sola lettura.</span></li>
            </ul>
            <button onClick={() => setDemoBanner(false)} className="mt-5 w-full brand-bg font-medium py-2.5 rounded-lg">Ho capito, inizia</button>
          </div>
        </div>
      ) : null}

      <footer className="bg-white border-t border-stone-200">
        <div className="max-w-5xl mx-auto px-4 py-5 text-sm text-stone-500 flex flex-wrap gap-x-6 gap-y-1.5 items-center">
          <span className="font-medium text-stone-700">{b.name}</span>
          {b.phone ? <span className="flex items-center gap-1.5"><Phone size={14} className="brand-accent" /> {b.phone}</span> : null}
          {b.email ? <span className="flex items-center gap-1.5"><Mail size={14} className="brand-accent" /> {b.email}</span> : null}
          {b.address ? <span className="flex items-center gap-1.5"><MapPin size={14} className="brand-accent" /> {b.address}</span> : null}
        </div>
      </footer>
    </div>
    </ModsCtx.Provider>
  );
}

// Logo dell'app Lucentia (marchio + nome) per la schermata di accesso.
const LUCENTIA_LOGO = "/lucentia-logo.png";

// Logo del produttore (Office Solution) usato come firma nella schermata di accesso.
const MAKER_LOGO = "data:image/png;base64,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";

function LoginGate({ branding, license, onUnlock }) {
  const [v, setV] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    const code = v.trim();
    if (!code) return;
    if (code === RESELLER_CODE) { onUnlock("reseller", false); return; }
    if (code === "1234") { onUnlock("demo", false); return; }
    if (license && license.code) {
      const isFull = code === license.code;
      const isReduced = code === license.code + "01"; // accesso ridotto: nasconde vendite e appuntamenti parziali
      if (isFull || isReduced) {
        if (licenseOk(license)) { onUnlock("operator", isReduced); return; }
        setErr("expired"); setV(""); return;
      }
    }
    setErr("wrong"); setV("");
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4 lc-fade-in">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden lc-scale-in">
        <div className="px-6 pt-8 pb-5 text-center border-b border-stone-100">
          <img src={LUCENTIA_LOGO} alt="Lucentia" className="h-11 w-auto mx-auto lc-pop-in" />
          <div className="text-xs text-stone-400 mt-2">Gestionale per centri estetici e parrucchieri</div>
          {branding.name ? <div className="text-xs text-stone-300 mt-0.5">per {branding.name}</div> : null}
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-600 mb-1"><Lock size={15} className="brand-accent" /> Accesso operatori</div>
          <p className="text-xs text-stone-400 mb-4">Inserisci il codice di accesso per usare il gestionale.</p>
          <input type="password" value={v} autoFocus onChange={(e) => { setV(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Codice di accesso" className={`w-full text-center tracking-widest text-lg px-3 py-2.5 rounded-lg border brand-ring ${err ? "border-red-400 bg-red-50" : "border-stone-300"}`} />
          {err === "wrong" ? <p className="text-xs text-red-500 mt-2 text-center">Codice non valido.</p> : null}
          {err === "expired" ? <p className="text-xs text-red-500 mt-2 text-center flex items-center justify-center gap-1"><AlertTriangle size={13} /> Licenza scaduta. Contatta il rivenditore per il rinnovo.</p> : null}
          <button onClick={submit} className="mt-4 w-full brand-bg font-medium py-2.5 rounded-lg transition">Entra</button>
        </div>
        <div className="px-6 pb-5 pt-1 text-center border-t border-stone-100">
          <div className="text-[10px] uppercase tracking-widest text-stone-300 mb-1.5 mt-3">Realizzato da</div>
          <img src={MAKER_LOGO} alt="Office Solution" className="h-7 w-auto mx-auto opacity-80" />
          <p className="text-[11px] text-stone-300 mt-3 select-none tracking-wide">V {APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
}

function FieldIcon({ icon: Icon, children }) { return <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 brand-ring"><Icon size={16} className="text-stone-400" />{children}</div>; }
function Row({ icon: Icon, label }) { return <div className="flex items-center gap-2"><Icon size={15} className="text-stone-400 shrink-0" /><span>{label}</span></div>; }
function StaffPick({ active, onClick, name, role }) { return <button onClick={onClick} className={`text-left p-3 rounded-xl border transition ${active ? "brand-soft brand-border" : "bg-white border-stone-200 brand-hover"}`}><div className="font-medium text-sm">{name}</div><div className="text-xs text-stone-400">{role}</div></button>; }
function Field({ label, children }) { return <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">{label}</div>{children}</div>; }

function LoyaltyCard({ stats }) {
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

function ApptItem({ b, staff, services, onCal, onCancel, onEdit, canCancel, cancelHours }) {
  const st = staff.find((s) => s.id === b.staffId);
  const names = b.serviceIds.map((id) => { const s = services.find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  const meta = b.status ? STATUS[b.status] : null;
  const showActions = onCancel || onEdit;
  return (
    <div className={`lc-card p-4 ${b.status && b.status !== "done" ? "opacity-70" : ""}`}>
      <div className="flex gap-4 items-start">
        <div className="text-center shrink-0 w-16"><div className="text-xs text-stone-400 capitalize">{WDAY_SHORT[parseDate(b.date).getDay()]} {parseDate(b.date).getDate()}/{parseDate(b.date).getMonth() + 1}</div><div className="font-semibold brand-accent">{minToStr(b.startMin)}</div></div>
        <div className="w-px self-stretch bg-stone-100" />
        <div className="flex-1 min-w-0">
          <div className="font-medium flex items-center gap-2 flex-wrap">{names}{meta ? <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${meta.cls}`}><meta.Icon size={11} /> {meta.label}</span> : null}</div>
          <div className="text-xs text-stone-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-1"><span className="flex items-center gap-1"><User size={12} /> {st ? st.name : "—"}</span><span className="flex items-center gap-1"><Clock size={12} /> {minToStr(b.startMin)}–{minToStr(b.endMin)}</span></div>
        </div>
        {onCal && !b.status ? <button onClick={() => onCal(b)} className="shrink-0 text-stone-400 hover:brand-accent p-1" title="Calendario"><CalendarPlus size={18} /></button> : null}
      </div>
      {showActions ? <div className="mt-3 pt-3 border-t border-stone-100">{canCancel ? (
        <div className="flex flex-wrap gap-2">
          {onEdit ? <button onClick={onEdit} className="flex items-center gap-1 text-xs font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50"><CalendarClock size={14} /> Modifica</button> : null}
          {onCancel ? <button onClick={onCancel} className="flex items-center gap-1 text-xs font-medium border border-red-300 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50"><Ban size={14} /> Annulla</button> : null}
        </div>
      ) : <span className="text-xs text-stone-400">Modifiche e annullamenti fino a {cancelHours} ore prima.</span>}</div> : null}
    </div>
  );
}

function AgendaPage({ config, bookings, setBookings, clients, setClients, sales, catalog, hidePartial, canAddBooking, canAddClient }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-stone-900 leading-none">Agenda</h2>
          <p className="text-[13px] text-stone-400 mt-1">Appuntamenti e disponibilità</p>
        </div>
        <button onClick={() => setAdding((a) => !a)} className="flex items-center gap-1.5 text-sm font-medium brand-bg px-3.5 py-2 rounded-lg shadow-[var(--lc-shadow-xs)] hover:shadow-[var(--lc-shadow-sm)]">{adding ? <X size={15} /> : <Plus size={15} />} {adding ? "Chiudi" : "Appuntamento"}</button>
      </div>
      {adding ? <ManualBooking config={config} bookings={bookings} setBookings={setBookings} clients={clients} setClients={setClients} canAddBooking={canAddBooking} canAddClient={canAddClient} onDone={() => setAdding(false)} /> : null}
      <AgendaView config={config} bookings={bookings} setBookings={setBookings} clients={clients} setClients={setClients} sales={sales} catalog={catalog} hidePartial={hidePartial} />
    </div>
  );
}

const VIEW_MODES = [["day", "Giorno", CalendarDays], ["3day", "3 giorni", CalendarRange], ["week", "Settimana", Calendar]];
function mondayOf(dateStr) { const d = parseDate(dateStr); const wd = (d.getDay() + 6) % 7; return addDays(dateStr, -wd); }

function AgendaView({ config, bookings, setBookings, clients, setClients, sales, catalog, hidePartial }) {
  const staff = config.staff, services = config.services;
  const [anchor, setAnchor] = useState(todayStr());
  const [mode, setMode] = useState("day");
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState(null);
  const [resch, setResch] = useState(null);

  const span = mode === "week" ? 7 : mode === "3day" ? 3 : 1;
  const days = useMemo(() => { const start = mode === "week" ? mondayOf(anchor) : anchor; return Array.from({ length: span }, (_, i) => addDays(start, i)); }, [anchor, mode, span]);
  const byDay = useMemo(() => { const m = {}; days.forEach((ds) => { m[ds] = bookings.filter((b) => b.date === ds && (filter === "all" || b.staffId === filter) && !(hidePartial && b.status === "partial")).sort((a, b) => a.startMin - b.startMin); }); return m; }, [bookings, days, filter, hidePartial]);
  const totalCount = days.reduce((a, ds) => a + byDay[ds].length, 0);

  const shift = (dir) => setAnchor((a) => addDays(mode === "week" ? mondayOf(a) : a, dir * span));
  const consumesStatus = (s) => s === "done" || s === "partial";
  const setStatus = (id, status, amount) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) { setSel(null); return; }
    const now = consumesStatus(status);
    let patch = { status };
    if (now) patch.amount = (amount === "" || amount == null) ? null : (Number(amount) || 0);
    else patch.amount = null;
    if (now && !b.packageUsed && b.clientCode) {
      const cl = clients.find((c) => c.code === b.clientCode);
      const pkg = matchPackage(cl, b.serviceIds);
      if (pkg) {
        setClients(clients.map((c) => (c.code === b.clientCode ? { ...c, packages: (c.packages || []).map((p) => (p.id === pkg.id ? { ...p, used: (Number(p.used) || 0) + 1 } : p)) } : c)));
        patch.packageUsed = { packageId: pkg.id, serviceId: pkg.serviceId };
      }
    } else if (!now && b.packageUsed) {
      const pu = b.packageUsed;
      setClients(clients.map((c) => (c.code === b.clientCode ? { ...c, packages: (c.packages || []).map((p) => (p.id === pu.packageId ? { ...p, used: Math.max(0, (Number(p.used) || 0) - 1) } : p)) } : c)));
      patch.packageUsed = null;
    }
    setBookings(bookings.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setSel(null);
  };
  const applyResch = (bk, d2, startMin) => { const dur = bk.endMin - bk.startMin; setBookings(bookings.map((x) => (x.id === bk.id ? { ...x, date: d2, startMin, endMin: startMin + dur } : x))); setResch(null); };

  const first = parseDate(days[0]), last = parseDate(days[days.length - 1]);
  const rangeLabel = mode === "day" ? fmtDate(anchor) : `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 bg-stone-100/80 rounded-xl p-1">
          {VIEW_MODES.map((m) => { const k = m[0], l = m[1], Icon = m[2]; return (
            <button key={k} onClick={() => setMode(k)} aria-current={mode === k ? "true" : undefined} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ${mode === k ? "bg-white shadow-[var(--lc-shadow-xs)] text-stone-900" : "text-stone-500 hover:text-stone-700"}`}><Icon size={15} /><span className="hidden sm:inline">{l}</span></button>
          ); })}
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring transition-colors hover:border-stone-400"><option value="all">Tutti gli operatori</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button onClick={() => shift(-1)} aria-label="Periodo precedente" className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:border-stone-300 hover:shadow-[var(--lc-shadow-xs)] transition"><ChevronLeft size={18} /></button>
        <div className="text-center min-w-0 px-2">
          <div className="font-semibold capitalize truncate tracking-tight text-stone-900">{rangeLabel}</div>
          <button onClick={() => setAnchor(todayStr())} className="text-xs brand-accent hover:underline">Oggi</button>
        </div>
        <button onClick={() => shift(1)} aria-label="Periodo successivo" className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:border-stone-300 hover:shadow-[var(--lc-shadow-xs)] transition"><ChevronRight size={18} /></button>
      </div>

      {mode === "day" ? (
        <div className="space-y-2">
          {byDay[days[0]].length === 0 ? (
            <div className="lc-fade-up flex flex-col items-center justify-center text-center py-14 rounded-2xl border border-dashed border-stone-200 bg-white/40">
              <div className="w-12 h-12 rounded-full brand-soft flex items-center justify-center mb-3"><CalendarDays size={22} className="brand-accent" /></div>
              <p className="text-sm font-medium text-stone-600">Nessun appuntamento</p>
              <p className="text-xs text-stone-400 mt-1">Tocca «Appuntamento» in alto per aggiungerne uno.</p>
            </div>
          ) : byDay[days[0]].map((b, i) => <ApptCard key={b.id} b={b} staff={staff} services={services} big index={i} onClick={() => setSel(b)} />)}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <div className="flex gap-2" style={{ minWidth: mode === "week" ? 980 : 540 }}>
            {days.map((ds) => { const list = byDay[ds]; const d = parseDate(ds); const isToday = ds === todayStr(); return (
              <div key={ds} className="flex-1" style={{ minWidth: 0 }}>
                <div className={`text-center rounded-lg py-1.5 mb-2 transition-colors ${isToday ? "brand-soft brand-text" : "text-stone-500"}`}>
                  <div className="text-[10px] uppercase tracking-wide font-medium">{WDAY_SHORT[d.getDay()]}</div>
                  <div className={`text-sm font-semibold leading-none mt-0.5 ${isToday ? "" : "text-stone-700"}`}>{d.getDate()}<span className="text-stone-400 font-normal">/{d.getMonth() + 1}</span></div>
                </div>
                <div className="space-y-1.5">
                  {list.length === 0 ? <div className="text-center text-xs text-stone-300 py-4 rounded-lg border border-dashed border-stone-200/70">—</div> : list.map((b, i) => <ApptCard key={b.id} b={b} staff={staff} services={services} index={i} onClick={() => setSel(b)} />)}
                </div>
              </div>
            ); })}
          </div>
        </div>
      )}

      {totalCount > 0 ? <p className="text-xs text-stone-400 text-center pt-1">{totalCount} appuntament{totalCount === 1 ? "o" : "i"} nel periodo · tocca una card per gestirla</p> : null}

      {sel ? <ApptActions booking={sel} config={config} clients={clients} setClients={setClients} bookings={bookings} sales={sales} catalog={catalog} hidePartial={hidePartial} onStatus={setStatus} onResch={(bk) => { setResch(bk); setSel(null); }} onClose={() => setSel(null)} /> : null}
      {resch ? <RescheduleModal booking={resch} config={config} bookings={bookings} onClose={() => setResch(null)} onSave={(d2, startMin) => applyResch(resch, d2, startMin)} /> : null}
    </div>
  );
}

const initials = (name) => (name || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "—";

function ApptCard({ b, staff, services, onClick, big, index = 0 }) {
  const st = staff.find((s) => s.id === b.staffId);
  const names = b.serviceIds.map((id) => { const s = services.find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  const meta = b.status ? STATUS[b.status] : null;
  const muted = b.status === "cancelled" || b.status === "noshow";
  const delay = `${Math.min(index * 40, 320)}ms`;

  if (big) {
    return (
      <button onClick={onClick} style={{ animationDelay: delay }} className={`lc-fade-up group w-full text-left flex items-stretch gap-3 rounded-xl border p-3 transition-[box-shadow,border-color,transform] duration-200 ${muted ? "bg-stone-50/70 border-stone-200/70" : "bg-white border-stone-200/80 hover:border-stone-300 hover:shadow-[var(--lc-shadow-md)]"}`}>
        <div className="flex flex-col items-center justify-center w-14 shrink-0 border-r border-stone-100 pr-3">
          <span className={`text-sm font-semibold tabular-nums leading-tight ${muted ? "text-stone-400" : "brand-accent"}`}>{minToStr(b.startMin)}</span>
          <span className="text-[11px] text-stone-400 tabular-nums">{minToStr(b.endMin)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[15px] font-semibold truncate leading-tight ${muted ? "text-stone-500" : "text-stone-900"}`}>{b.clientName}{b.clientCode ? <span className="text-xs text-stone-400 font-normal"> #{b.clientCode}</span> : null}</div>
          <div className="text-[13px] text-stone-500 truncate mt-0.5">{names || "—"}</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-400">
            <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-stone-100 text-[9px] font-semibold text-stone-500 shrink-0">{initials(st ? st.name : "")}</span>
            <span className="truncate">{st ? st.name : "—"}</span>
          </div>
        </div>
        <div className="flex flex-col items-end justify-between shrink-0">
          {meta ? <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${meta.cls}`}><meta.Icon size={10} /> {meta.label}</span> : <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full brand-soft brand-text">Da svolgere</span>}
          <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5 transition" />
        </div>
      </button>
    );
  }
  return (
    <button onClick={onClick} style={{ animationDelay: delay }} className={`lc-fade-up w-full text-left rounded-lg border p-2 transition-[box-shadow,border-color] duration-200 ${muted ? "bg-stone-50/70 border-stone-200/70" : "bg-white border-stone-200/80 hover:border-stone-300 hover:shadow-sm"}`}>
      <div className="flex items-center justify-between gap-1">
        <span className={`text-xs font-semibold tabular-nums ${muted ? "text-stone-400" : "brand-accent"}`}>{minToStr(b.startMin)}</span>
        {meta ? <meta.Icon size={11} className="text-stone-400 shrink-0" /> : null}
      </div>
      <div className={`text-[13px] font-medium truncate mt-0.5 ${muted ? "text-stone-500" : "text-stone-800"}`}>{b.clientName}</div>
      <div className="text-[11px] text-stone-500 truncate">{names}</div>
    </button>
  );
}

function ApptActions({ booking, config, clients, setClients, bookings, sales, catalog, hidePartial, onStatus, onResch, onClose }) {
  const F = useMods();
  const b = booking;
  const st = config.staff.find((s) => s.id === b.staffId);
  const cl = (clients || []).find((x) => x.code === b.clientCode);
  const names = b.serviceIds.map((id) => { const s = config.services.find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  const meta = b.status ? STATUS[b.status] : null;
  const L = loyaltyConfig(config);
  const balance = cl ? clientBalance(cl, bookings || [], sales, config, catalog) : 0;
  const reached = cl ? L.rewards.filter((r) => balance >= r.points).slice().sort((a, b) => a.points - b.points) : [];
  const pkgs = (cl && Array.isArray(cl.packages)) ? cl.packages.filter((p) => (b.serviceIds || []).includes(p.serviceId)) : [];
  const hasHealth = cl && (cl.allergies || cl.conditions || cl.notes);
  const [chosen, setChosen] = useState([]);
  const [askPrice, setAskPrice] = useState(null);
  const [price, setPrice] = useState("");
  const proposed = (b.serviceIds || []).reduce((a, id) => { const s = config.services.find((x) => x.id === id); return a + ((s && s.price) || 0); }, 0);
  const openPrice = (status) => { setAskPrice(status); setPrice(proposed > 0 ? String(proposed) : ""); };
  const toggleReward = (id) => setChosen((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const selSum = reached.filter((r) => chosen.includes(r.id)).reduce((a, r) => a + r.points, 0);
  const doRedeem = () => {
    const picks = reached.filter((r) => chosen.includes(r.id));
    if (!picks.length || selSum > balance || !cl) return;
    if (!confirm(`Riscattare ${picks.length} premio/i usando ${selSum} punti?`)) return;
    setClients((cs) => cs.map((x) => (x.code === cl.code ? { ...x, redeemedPoints: (Number(x.redeemedPoints) || 0) + selSum, redemptions: [...picks.map((r) => ({ label: r.label, points: r.points, at: Date.now() })), ...(x.redemptions || [])] } : x)));
    setChosen([]);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 overflow-auto" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-semibold text-lg leading-tight">{b.clientName}{b.clientCode ? <span className="text-sm text-stone-400 font-normal"> #{b.clientCode}</span> : null}</div>
            <div className="text-sm text-stone-500 capitalize">{fmtDate(b.date)} · {minToStr(b.startMin)}–{minToStr(b.endMin)}</div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>
        <div className="bg-stone-50 rounded-xl p-3 text-sm space-y-1 mb-4">
          <div className="flex items-center gap-2"><Sparkles size={14} className="text-stone-400" /> {names}</div>
          <div className="flex items-center gap-2"><User size={14} className="text-stone-400" /> {st ? st.name : "—"}</div>
          {cl && cl.phone ? <div className="flex items-center gap-2"><Phone size={14} className="text-stone-400" /> {cl.phone}</div> : null}
          {b.clientEmail ? <div className="flex items-center gap-2"><Mail size={14} className="text-stone-400" /> {b.clientEmail}</div> : null}
          {meta ? <div className="flex items-center gap-2"><meta.Icon size={14} className="text-stone-400" /> {meta.label}</div> : null}
        </div>
        {F.allergeni && hasHealth ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-1.5 text-sm font-medium text-red-800 mb-1"><AlertTriangle size={15} /> Note cliente</div>
            <ul className="text-sm text-red-700 space-y-0.5">
              {cl.allergies ? <li><b>Allergie:</b> {cl.allergies}</li> : null}
              {cl.conditions ? <li><b>Patologie:</b> {cl.conditions}</li> : null}
              {cl.notes ? <li><b>Note:</b> {cl.notes}</li> : null}
            </ul>
          </div>
        ) : null}
        {F.pacchetti && cl && pkgs.length > 0 ? (
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-1.5 text-sm font-medium text-sky-800 mb-1"><Layers size={15} /> Pacchetti sedute</div>
            <ul className="text-sm text-sky-700 space-y-0.5">{pkgs.map((p) => { const svc = config.services.find((x) => x.id === p.serviceId); const rem = p.total - (Number(p.used) || 0); return <li key={p.id}>{svc ? svc.name : "Servizio"}: <b>{rem}</b> di {p.total} rimaste</li>; })}</ul>
            {b.packageUsed ? <p className="text-[11px] text-sky-600 mt-1.5">Una seduta è già stata scalata da questo appuntamento.</p> : <p className="text-[11px] text-sky-600 mt-1.5">Segnando "Svolto" o "Parziale" verrà scalata 1 seduta dal pacchetto.</p>}
          </div>
        ) : null}
        {F.fidelity && cl && reached.length > 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-1.5 text-sm font-medium text-amber-800 mb-2"><Gift size={15} /> Premi fedeltà · {balance} punti disponibili</div>
            <div className="space-y-1.5">{reached.map((r) => { const on = chosen.includes(r.id); return (
              <button key={r.id} onClick={() => toggleReward(r.id)} className={`w-full flex items-center gap-2 text-left text-sm rounded-lg px-2.5 py-2 border transition ${on ? "bg-white border-amber-400" : "bg-white/60 border-amber-200"}`}>
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? "brand-bg border-transparent" : "border-stone-300 bg-white"}`}>{on ? <Check size={12} /> : null}</span>
                <span className="flex-1 min-w-0 truncate">{r.label}</span>
                <span className="text-amber-600 shrink-0">{r.points} pt</span>
              </button>
            ); })}</div>
            <button onClick={doRedeem} disabled={!chosen.length || selSum > balance} className="mt-2 w-full brand-bg disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-1.5"><Gift size={14} /> Riscatta selezionati{chosen.length ? ` · −${selSum} pt` : ""}</button>
          </div>
        ) : null}
        {askPrice ? (
          <div className="border border-stone-200 rounded-xl p-4 mb-2">
            <div className="text-sm font-medium mb-1 flex items-center gap-1.5"><Wallet size={15} className="brand-accent" /> Prezzo da incassare</div>
            <p className="text-xs text-stone-400 mb-3">{proposed > 0 ? "Prezzo proposto in base ai servizi. Puoi modificarlo per questo cliente." : "Nessun prezzo impostato sui servizi: inseriscilo qui se vuoi registrarlo."}</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 flex-1"><input type="number" min={0} step={0.5} value={price} onChange={(e) => setPrice(e.target.value)} autoFocus className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-sm text-stone-400">€</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => onStatus(b.id, askPrice, price)} className="flex items-center justify-center gap-1.5 text-sm font-medium bg-green-600 text-white px-3 py-2.5 rounded-lg hover:bg-green-700"><Check size={15} /> Conferma {askPrice === "partial" ? "parziale" : "svolto"}</button>
              <button onClick={() => setAskPrice(null)} className="flex items-center justify-center gap-1.5 text-sm font-medium border border-stone-300 text-stone-600 px-3 py-2.5 rounded-lg hover:bg-stone-50">Indietro</button>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-2">
          {!b.status ? (
            <>
              <button onClick={() => openPrice("done")} className="flex items-center justify-center gap-1.5 text-sm font-medium bg-green-600 text-white px-3 py-2.5 rounded-lg hover:bg-green-700"><Check size={15} /> Svolto</button>
              {!hidePartial ? <button onClick={() => openPrice("partial")} className="flex items-center justify-center gap-1.5 text-sm font-medium border border-sky-300 text-sky-700 px-3 py-2.5 rounded-lg hover:bg-sky-50"><Timer size={15} /> Parziale</button> : null}
              <button onClick={() => onStatus(b.id, "noshow")} className="flex items-center justify-center gap-1.5 text-sm font-medium border border-amber-300 text-amber-700 px-3 py-2.5 rounded-lg hover:bg-amber-50"><UserX size={15} /> Non presentato</button>
              <button onClick={() => onResch(b)} className="flex items-center justify-center gap-1.5 text-sm font-medium border border-stone-300 text-stone-700 px-3 py-2.5 rounded-lg hover:bg-stone-50"><CalendarClock size={15} /> Sposta</button>
              <button onClick={() => onStatus(b.id, "cancelled")} className="col-span-2 flex items-center justify-center gap-1.5 text-sm font-medium border border-stone-300 text-stone-500 px-3 py-2.5 rounded-lg hover:bg-stone-50"><Ban size={15} /> Annulla</button>
            </>
          ) : (
            <button onClick={() => onStatus(b.id, undefined)} className="col-span-2 flex items-center justify-center gap-1.5 text-sm font-medium border border-stone-300 text-stone-600 px-3 py-2.5 rounded-lg hover:bg-stone-50"><Undo2 size={15} /> Ripristina</button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

function ClientsView({ config, bookings, clients, setClients, sales, catalog, vouchers, setVouchers }) {
  const F = useMods();
  const staff = config.staff, services = config.services;
  const loyalty = loyaltyConfig(config);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [vc, setVc] = useState("");
  const redeemVoucher = (c) => {
    const code = vc.trim().toUpperCase();
    if (!code) return;
    const v = (vouchers || []).find((x) => String(x.code).toUpperCase() === code);
    if (!v) { alert("Codice non valido: nessun buono con questo codice."); return; }
    if (v.stato !== "attivo") { alert("Questo buono è già stato registrato o utilizzato e non è più valido."); return; }
    if (v.tipo === "pacchetto") {
      setClients((cs) => cs.map((x) => (x.code === c.code ? { ...x, packages: [...(x.packages || []), { id: uid(), serviceId: v.serviceId, total: v.sedute, used: 0, price: 0, createdAt: Date.now(), fromVoucher: v.code }] } : x)));
      setVouchers((vs) => vs.map((x) => (x.id === v.id ? { ...x, stato: "riscattato", clienteCode: c.code, clienteNome: c.name, riscattato: Date.now() } : x)));
      alert("Buono pacchetto registrato: le sedute sono state aggiunte ai pacchetti del cliente.");
    } else {
      setVouchers((vs) => vs.map((x) => (x.id === v.id ? { ...x, stato: "assegnato", clienteCode: c.code, clienteNome: c.name, riscattato: Date.now() } : x)));
      alert("Buono valore registrato sul cliente. Trovi il saldo qui sotto.");
    }
    setVc("");
  };
  const scalaVoucher = (v, amount) => {
    const max = Number(v.residuo) || 0; if (max <= 0) return;
    let amt = amount == null ? max : Number(amount);
    if (!(amt > 0)) { alert("Importo non valido."); return; }
    amt = Math.min(amt, max);
    const residuo = Math.round((max - amt) * 100) / 100;
    setVouchers((vs) => vs.map((x) => (x.id === v.id ? { ...x, residuo, stato: residuo <= 0 ? "esaurito" : "assegnato", usi: [{ at: Date.now(), importo: amt }, ...(x.usi || [])] } : x)));
  };
  const nq = q.replace(/\s/g, "");
  const filtered = clients.filter((c) => !q || (c.name || "").toLowerCase().includes(q.toLowerCase()) || c.code.includes(nq) || (c.phone || "").replace(/\s/g, "").includes(nq) || (c.card || "").replace(/\s/g, "").toLowerCase().includes(nq.toLowerCase())).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const patchClient = (code, patch) => setClients(clients.map((x) => (x.code === code ? { ...x, ...patch } : x)));
  const splitName = (c) => (c.firstName != null || c.lastName != null) ? { fn: c.firstName || "", ln: c.lastName || "" } : (function () { const p = (c.name || "").trim().split(/\s+/); return { fn: p[0] || "", ln: p.slice(1).join(" ") }; })();
  const setName = (code, fn, ln) => patchClient(code, { firstName: fn, lastName: ln, name: `${fn} ${ln}`.trim() });
  const [pkSvc, setPkSvc] = useState("");
  const [pkN, setPkN] = useState(5);
  const [pkPrice, setPkPrice] = useState("");
  const addPackage = (c) => { if (!pkSvc) return; patchClient(c.code, { packages: [...(c.packages || []), { id: uid(), serviceId: pkSvc, total: pkN, used: 0, price: pkPrice === "" ? 0 : pkPrice, createdAt: Date.now() }] }); setPkSvc(""); setPkN(5); setPkPrice(""); };
  const delPackage = (c, pid) => patchClient(c.code, { packages: (c.packages || []).filter((p) => p.id !== pid) });
  const adjPackage = (c, pid, d) => patchClient(c.code, { packages: (c.packages || []).map((p) => (p.id === pid ? { ...p, used: Math.max(0, Math.min(p.total, (Number(p.used) || 0) + d)) } : p)) });
  const redeem = (code, reward) => setClients(clients.map((x) => (x.code === code ? { ...x, redeemedPoints: (Number(x.redeemedPoints) || 0) + reward.points, redemptions: [{ label: reward.label, points: reward.points, at: Date.now() }, ...(x.redemptions || [])] } : x)));

  if (sel) {
    const c = clients.find((x) => x.code === sel);
    if (!c) return <button onClick={() => setSel(null)} className="text-sm text-stone-500">Indietro</button>;
    const stats = clientStats(c.code, bookings);
    const balance = clientBalance(c, bookings, sales, config, catalog);
    const nm = splitName(c);
    return (
      <div className="space-y-4">
        <button onClick={() => setSel(null)} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"><ChevronLeft size={16} /> Tutti i clienti</button>
        {F.fidelity && <FidelityCard branding={config.branding} name={c.name} code={c.code} />}
        {F.fidelity && <CardActions branding={config.branding} name={c.name} code={c.code} />}
        <div className="lc-card p-4">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><User size={13} /> Anagrafica cliente</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nome"><input value={nm.fn} onChange={(e) => setName(c.code, e.target.value, nm.ln)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            <Field label="Cognome"><input value={nm.ln} onChange={(e) => setName(c.code, nm.fn, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            <Field label="Telefono"><input value={c.phone || ""} onChange={(e) => patchClient(c.code, { phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            <Field label="Email"><input value={c.email || ""} onChange={(e) => patchClient(c.code, { email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            <Field label="Codice tessera (facoltativo)"><input value={c.card || ""} onChange={(e) => patchClient(c.code, { card: e.target.value })} placeholder="Tessera fisica del cliente" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          </div>
        </div>

        {F.allergeni && (
        <div className="lc-card p-4">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><AlertTriangle size={13} /> Allergie, patologie e note</div>
          <div className="space-y-3">
            <div><div className="text-[11px] text-stone-400 mb-1">Allergie</div><textarea value={c.allergies || ""} onChange={(e) => patchClient(c.code, { allergies: e.target.value })} rows={2} placeholder="Es. allergia a tinture, lattice…" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
            <div><div className="text-[11px] text-stone-400 mb-1">Patologie</div><textarea value={c.conditions || ""} onChange={(e) => patchClient(c.code, { conditions: e.target.value })} rows={2} placeholder="Es. cuoio capelluto sensibile, dermatiti…" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
            <div><div className="text-[11px] text-stone-400 mb-1">Note importanti</div><textarea value={c.notes || ""} onChange={(e) => patchClient(c.code, { notes: e.target.value })} rows={2} placeholder="Preferenze, indicazioni particolari…" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
          </div>
        </div>
        )}

        {F.fidelity && (
        <div className="lc-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Star size={16} className="brand-accent" /> Programma fedeltà</h3>
            <div className="text-right"><div className="text-2xl font-bold brand-accent leading-none">{balance}</div><div className="text-[11px] text-stone-400 uppercase tracking-wide">punti disponibili</div></div>
          </div>
          {loyalty.rewards.length === 0 ? <p className="text-sm text-stone-400">Nessun premio configurato. Aggiungili dalle Impostazioni → Programma fedeltà.</p> : (
            <div className="space-y-2">{loyalty.rewards.slice().sort((a, b) => a.points - b.points).map((r) => { const ok = balance >= r.points; return (
              <div key={r.id} className={`flex items-center gap-3 rounded-xl border p-3 ${ok ? "border-stone-200" : "border-stone-100 bg-stone-50"}`}>
                <Gift size={18} className={ok ? "brand-accent shrink-0" : "text-stone-300 shrink-0"} />
                <div className="flex-1 min-w-0"><div className={`font-medium truncate ${ok ? "" : "text-stone-400"}`}>{r.label}</div><div className="text-xs text-stone-400">{r.points} punti</div></div>
                <button onClick={() => { if (balance >= r.points && confirm(`Riscattare "${r.label}" usando ${r.points} punti?`)) redeem(c.code, r); }} disabled={!ok} className="text-sm font-medium px-3 py-1.5 rounded-lg brand-bg disabled:opacity-40 disabled:cursor-not-allowed shrink-0">Usa premio</button>
              </div>
            ); })}</div>
          )}
          {c.redemptions && c.redemptions.length > 0 ? (
            <div className="mt-4 pt-3 border-t border-stone-100">
              <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Premi riscattati</div>
              <div className="space-y-1">{c.redemptions.slice(0, 6).map((x, i) => <div key={i} className="flex justify-between text-sm text-stone-500"><span>{x.label}</span><span className="text-stone-400">−{x.points} pt · {fmtFullDate(x.at)}</span></div>)}</div>
            </div>
          ) : null}
        </div>
        )}

        {F.pacchetti && (
        <div className="lc-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Layers size={16} className="brand-accent" /> Pacchetti sedute</h3>
          {(c.packages && c.packages.length) ? (
            <div className="space-y-2 mb-4">{c.packages.map((p) => { const svc = services.find((x) => x.id === p.serviceId); const used = Number(p.used) || 0; const rem = p.total - used; return (
              <div key={p.id} className="border border-stone-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0"><div className="font-medium truncate">{svc ? svc.name : "Servizio"}</div><div className="text-xs text-stone-400">{rem > 0 ? `${rem} di ${p.total} sedute rimaste` : `Esaurito · ${p.total} sedute usate`}{p.price ? ` · ${eur(p.price)}` : ""}</div></div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => adjPackage(c, p.id, -1)} disabled={used <= 0} className="w-7 h-7 rounded-lg border border-stone-200 text-stone-500 disabled:opacity-30" title="Rimborsa 1 seduta">−</button>
                    <button onClick={() => adjPackage(c, p.id, 1)} disabled={used >= p.total} className="w-7 h-7 rounded-lg border border-stone-200 text-stone-500 disabled:opacity-30" title="Usa 1 seduta">+</button>
                    <button onClick={() => { if (confirm("Eliminare il pacchetto?")) delPackage(c, p.id); }} className="w-7 h-7 rounded-lg text-stone-400 hover:text-red-500 flex items-center justify-center"><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="mt-2 bg-stone-100 rounded-full h-2 overflow-hidden"><div className="h-2 rounded-full brand-bg" style={{ width: `${p.total ? (used / p.total) * 100 : 0}%` }} /></div>
              </div>
            ); })}</div>
          ) : <p className="text-sm text-stone-400 mb-4">Nessun pacchetto attivo.</p>}
          <div className="border-t border-stone-100 pt-3">
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Aggiungi pacchetto</div>
            <div className="flex flex-wrap items-end gap-2">
              <select value={pkSvc} onChange={(e) => setPkSvc(e.target.value)} className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring"><option value="">Servizio…</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <div className="flex items-center gap-1"><input type="number" min={1} step={1} value={pkN} onChange={(e) => setPkN(Math.max(1, Math.round(Number(e.target.value) || 1)))} className="w-16 px-2 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-xs text-stone-400">sedute</span></div>
              <div className="flex items-center gap-1"><input type="number" min={0} step={0.5} value={pkPrice} onChange={(e) => setPkPrice(e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0))} placeholder="prezzo" className="w-20 px-2 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-xs text-stone-400">€</span></div>
              <button onClick={() => addPackage(c)} disabled={!pkSvc} className="brand-bg text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-40">Aggiungi</button>
            </div>
          </div>
        </div>
        )}

        {(() => { const myV = (vouchers || []).filter((v) => v.clienteCode === c.code); const val = myV.filter((v) => v.tipo === "valore"); const pkgV = myV.filter((v) => v.tipo === "pacchetto"); return (
        <div className="lc-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Gift size={16} className="brand-accent" /> Buoni regalo</h3>
          <div className="flex flex-wrap items-end gap-2 mb-4">
            <div className="flex-1 min-w-[160px]"><div className="text-[11px] text-stone-400 mb-1">Registra un buono ricevuto</div>
              <input value={vc} onChange={(e) => setVc(e.target.value)} placeholder="Codice (es. BN-XXXXXX)" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring font-mono uppercase" /></div>
            <button onClick={() => redeemVoucher(c)} className="brand-bg text-sm font-medium px-3 py-2 rounded-lg">Registra</button>
          </div>
          {val.length ? (
            <div className="space-y-2">{val.map((v) => (
              <div key={v.id} className="border border-stone-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0"><div className="font-medium">Buono valore <span className="font-mono text-xs text-stone-400">{v.code}</span></div>
                    <div className="text-xs text-stone-400">Saldo <b className="brand-accent">{eur(v.residuo)}</b> di {eur(v.importo)}{v.stato === "esaurito" ? " · esaurito" : ""}</div></div>
                  {v.residuo > 0 ? <VoucherBalanceRow v={v} onScala={scalaVoucher} /> : <span className="text-[11px] px-2 py-1 rounded-full bg-stone-100 text-stone-500">Esaurito</span>}
                </div>
              </div>
            ))}</div>
          ) : null}
          {pkgV.length ? <p className="text-xs text-stone-400 mt-2">Buoni pacchetto registrati ({pkgV.length}): le sedute confluiscono nei <b>Pacchetti sedute</b>.</p> : null}
          {myV.length === 0 ? <p className="text-sm text-stone-400">Nessun buono registrato su questo cliente.</p> : null}
        </div>
        ); })()}

        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2"><History size={16} className="brand-accent" /> Storico servizi</h3>
          {stats.upcoming.length > 0 ? <div className="space-y-2 mb-3"><div className="text-xs text-stone-400 uppercase tracking-wide">In programma</div>{stats.upcoming.map((b) => <ApptItem key={b.id} b={b} staff={staff} services={services} onCal={(bk) => downloadICS(bk, staff, services, config.branding.name)} />)}</div> : null}
          {stats.past.length === 0 ? <p className="text-sm text-stone-400 bg-white border border-stone-200 rounded-xl p-4">Nessun servizio passato.</p> : <div className="space-y-2">{stats.past.map((b) => <ApptItem key={b.id} b={b} staff={staff} services={services} />)}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-stone-900 leading-none">Clienti</h2>
          <p className="text-[13px] text-stone-400 mt-1">{clients.length} sched{clients.length === 1 ? "a" : "e"}{q ? ` · ${filtered.length} risultat${filtered.length === 1 ? "o" : "i"}` : ""}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 bg-white brand-ring transition-colors hover:border-stone-400 focus-within:border-stone-400"><Search size={16} className="text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome, codice, cellulare o tessera" className="flex-1 text-sm focus:outline-none bg-transparent" /></div>
      {filtered.length === 0 ? (
        <div className="lc-card p-10 text-center">
          <div className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3"><Users size={20} className="text-stone-400" /></div>
          <p className="text-sm font-medium text-stone-600">{clients.length === 0 ? "Ancora nessun cliente" : "Nessun risultato"}</p>
          <p className="text-xs text-stone-400 mt-1">{clients.length === 0 ? "I clienti si creano da un appuntamento o dalla cassa." : "Prova con un altro nome, codice o numero."}</p>
        </div>
      ) : (
        <div className="space-y-2">{filtered.map((c, ci) => { const stats = clientStats(c.code, bookings); const bal = clientBalance(c, bookings, sales, config, catalog); return (
          <button key={c.code} onClick={() => setSel(c.code)} style={{ animationDelay: `${Math.min(ci * 30, 300)}ms` }} className="lc-fade-up group w-full text-left lc-card lc-card-hover p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full brand-soft brand-text flex items-center justify-center text-sm font-semibold shrink-0">{initials(c.name)}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-stone-900 truncate leading-tight">{c.name || "Senza nome"} <span className="text-xs text-stone-400 font-normal">#{c.code}</span></div>
              <div className="text-[13px] text-stone-500 truncate mt-0.5 flex items-center gap-1.5"><span>{stats.all.length} appuntament{stats.all.length === 1 ? "o" : "i"}</span><span className="text-stone-300">·</span><span>{stats.servicesUsed} servizi</span></div>
            </div>
            {F.fidelity ? <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium brand-soft brand-text px-2 py-1 rounded-full shrink-0"><Star size={12} className="brand-accent" /> {bal} pt</span> : null}
            <ChevronRight size={18} className="text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5 transition shrink-0" />
          </button>
        ); })}</div>
      )}
    </div>
  );
}

function voucherStatusLabel(v) {
  if (v.stato === "esaurito") return { txt: "Esaurito", cls: "bg-stone-100 text-stone-500" };
  if (v.stato === "riscattato" || v.stato === "assegnato") return { txt: v.clienteNome ? `Riscattato · ${v.clienteNome}` : "Riscattato", cls: "bg-green-100 text-green-700" };
  return { txt: "Attivo · da consegnare", cls: "bg-amber-100 text-amber-700" };
}
function VoucherBalanceRow({ v, onScala }) {
  const [amt, setAmt] = useState("");
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <input type="number" min={0} step={0.5} value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="importo" className="w-20 px-2 py-1.5 rounded-lg border border-stone-300 text-sm text-right brand-ring" />
      <button onClick={() => { const n = Number(amt); if (!(n > 0)) { alert("Inserisci un importo."); return; } onScala(v, n); setAmt(""); }} className="text-sm font-medium px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50">Scala</button>
      <button onClick={() => { if (confirm(`Usare tutto il saldo (${eur(v.residuo)})?`)) onScala(v, null); }} className="text-sm font-medium px-2.5 py-1.5 rounded-lg brand-bg">Tutto</button>
    </div>
  );
}
function GiftCardsView({ config, vouchers, setVouchers, clients, canAddVoucher }) {
  const services = config.services, b = config.branding;
  const [tipo, setTipo] = useState("valore");
  const [importo, setImporto] = useState("");
  const [prezzo, setPrezzo] = useState("");
  const [descr, setDescr] = useState("");
  const [svc, setSvc] = useState("");
  const [sedute, setSedute] = useState(5);
  const [created, setCreated] = useState(null);
  const limite = canAddVoucher === false;

  const reset = () => { setImporto(""); setPrezzo(""); setDescr(""); setSvc(""); setSedute(5); };
  const crea = () => {
    if (limite) return;
    if (tipo === "valore" && !(Number(importo) > 0)) { alert("Inserisci l'importo del buono."); return; }
    if (tipo === "pacchetto" && (!svc || !(Number(sedute) > 0))) { alert("Scegli servizio e numero di sedute."); return; }
    const prezzoNum = prezzo === "" ? (tipo === "valore" ? Number(importo) || 0 : 0) : Number(prezzo) || 0;
    const v = {
      id: uid(), code: genVoucherCode(vouchers), tipo, descrizione: descr.trim(),
      prezzo: prezzoNum, creato: Date.now(), stato: "attivo",
      clienteCode: null, clienteNome: null, riscattato: null, usi: [],
      ...(tipo === "valore" ? { importo: Number(importo) || 0, residuo: Number(importo) || 0 } : { serviceId: svc, sedute: Math.max(1, Math.round(Number(sedute) || 1)) }),
    };
    setVouchers([v, ...(vouchers || [])]);
    setCreated(v); reset();
  };
  const elimina = (id) => { if (confirm("Eliminare questo buono? Operazione non reversibile.")) setVouchers((vs) => vs.filter((x) => x.id !== id)); };

  const totIncasso = (vouchers || []).reduce((a, v) => a + (Number(v.prezzo) || 0), 0);
  const attivi = (vouchers || []).filter((v) => v.stato === "attivo").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold tracking-tight text-stone-900 flex items-center gap-2"><Gift size={18} className="brand-accent" /> Buoni regalo</h2>
        <div className="text-sm text-stone-500">{(vouchers || []).length} buoni · {attivi} da consegnare · incasso {eur(totIncasso)}</div>
      </div>

      {limite ? <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" /> Hai raggiunto il numero massimo di buoni della versione demo.</p> : null}

      <div className="lc-card p-5">
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Genera un nuovo buono</div>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTipo("valore")} className={`flex-1 text-sm border rounded-lg px-3 py-2 transition ${tipo === "valore" ? "brand-soft brand-border" : "bg-white border-stone-200"}`}><div className="font-medium">Buono valore</div><div className="text-xs text-stone-400">Un importo in euro</div></button>
          <button onClick={() => setTipo("pacchetto")} className={`flex-1 text-sm border rounded-lg px-3 py-2 transition ${tipo === "pacchetto" ? "brand-soft brand-border" : "bg-white border-stone-200"}`}><div className="font-medium">Buono pacchetto</div><div className="text-xs text-stone-400">Sedute di un servizio</div></button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {tipo === "valore" ? (
            <Field label="Importo del buono (€)"><input type="number" min={0} step={0.5} value={importo} onChange={(e) => setImporto(e.target.value)} placeholder="50" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          ) : (
            <>
              <Field label="Servizio"><select value={svc} onChange={(e) => setSvc(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring"><option value="">Scegli…</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
              <Field label="Numero di sedute"><input type="number" min={1} step={1} value={sedute} onChange={(e) => setSedute(Math.max(1, Math.round(Number(e.target.value) || 1)))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            </>
          )}
          <Field label="Prezzo pagato / incasso (€)"><input type="number" min={0} step={0.5} value={prezzo} onChange={(e) => setPrezzo(e.target.value)} placeholder={tipo === "valore" ? "come importo" : "0"} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          <Field label="Descrizione (facoltativa)"><input value={descr} onChange={(e) => setDescr(e.target.value)} placeholder={tipo === "valore" ? "Es. Buono compleanno" : "Es. Pacchetto benessere"} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
        </div>
        <button onClick={crea} disabled={limite} className="mt-4 brand-bg font-medium px-4 py-2.5 rounded-lg inline-flex items-center gap-2 disabled:opacity-40"><Plus size={16} /> Genera buono</button>
      </div>

      {created ? (
        <div className="lc-card p-5">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold flex items-center gap-2"><Check size={16} className="text-green-600" /> Buono creato</h3><button onClick={() => setCreated(null)} className="text-stone-400 hover:text-stone-600"><X size={18} /></button></div>
          <VoucherCard branding={b} v={created} services={services} />
          <div className="mt-3 flex flex-col items-center gap-1">
            <button onClick={() => downloadVoucherImage(b, created, services)} className="text-sm brand-bg px-4 py-2 rounded-lg inline-flex items-center gap-2"><Wallet size={16} /> Salva immagine del buono</button>
            <p className="text-xs text-stone-400 text-center">Consegnala al cliente. Il codice si registra dalla scheda del cliente che lo riceve.</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide">Buoni emessi</div>
        {(vouchers || []).length === 0 ? <div className="lc-card p-10 text-center text-stone-400">Ancora nessun buono.</div> : (vouchers || []).map((v) => { const lab = voucherStatusLabel(v); return (
          <div key={v.id} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl brand-soft brand-accent flex items-center justify-center shrink-0"><Gift size={18} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{v.tipo === "valore" ? eur(v.importo) : `${v.sedute} sedute · ${voucherServiceName(v, services)}`}{v.descrizione ? <span className="text-stone-400 font-normal"> · {v.descrizione}</span> : null}</div>
              <div className="text-xs text-stone-400">Codice <span className="font-mono">{v.code}</span> · {fmtFullDate(v.creato)}{v.tipo === "valore" && (v.stato === "assegnato" || v.stato === "esaurito") ? ` · residuo ${eur(v.residuo)}` : ""}</div>
            </div>
            <span className={`text-[11px] px-2 py-1 rounded-full shrink-0 ${lab.cls}`}>{lab.txt}</span>
            <button onClick={() => downloadVoucherImage(b, v, services)} className="p-2 text-stone-400 hover:text-stone-700 shrink-0" title="Salva immagine"><Wallet size={16} /></button>
            {v.stato === "attivo" ? <button onClick={() => elimina(v.id)} className="p-2 text-stone-400 hover:text-red-500 shrink-0" title="Elimina"><Trash2 size={16} /></button> : null}
          </div>
        ); })}
      </div>
    </div>
  );
}

function ManualBooking({ config, bookings, setBookings, clients, setClients, canAddBooking, canAddClient, onDone }) {
  const services = config.services, staff = config.staff;
  const [sel, setSel] = useState([]);
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [slot, setSlot] = useState(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lk, setLk] = useState("");
  const lkn = lk.replace(/\s/g, "");
  const lkMatches = lk ? clients.filter((c) => (c.name || "").toLowerCase().includes(lk.toLowerCase()) || c.code.includes(lkn) || (c.phone || "").replace(/\s/g, "").includes(lkn) || (c.card || "").replace(/\s/g, "").toLowerCase().includes(lkn.toLowerCase())).slice(0, 6) : [];
  const pickClient = (c) => { setCode(c.code); setName(c.name || ""); setEmail(c.email || ""); setPhone(c.phone || ""); setLk(""); };

  const selStaff = staffId ? staff.find((s) => s.id === staffId) : null;
  const duration = sel.reduce((a, id) => { const s = services.find((x) => x.id === id); return a + (s ? s.durationMin : 0); }, 0);
  const qualified = qualifiedStaff(staff, sel);
  const candidates = staffId ? qualified.filter((s) => s.id === staffId) : qualified;
  const closed = salonClosure(config, date);
  const opOff = selStaff ? staffOff(selStaff, date) : false;
  const slotMap = sel.length && candidates.length ? computeSlots(date, duration, candidates, bookings, config.closures) : {};
  const slotTimes = Object.keys(slotMap).map(Number).sort((a, b) => a - b);
  const maxDate = pd(new Date(Date.now() + ADVANCE_DAYS * 864e5));
  const onCode = (v) => { v = v.replace(/\D/g, "").slice(0, 6); setCode(v); const c = clients.find((x) => x.code === v); if (c) { setName(c.name || ""); setEmail(c.email || ""); setPhone(c.phone || ""); } };
  const toggle = (id) => { if (selStaff && !selStaff.serviceIds.includes(id)) return; setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); setSlot(null); };

  const save = () => {
    if (canAddBooking === false) { alert("Limite demo raggiunto: massimo 20 appuntamenti. Per usare il programma senza limiti contatta Office Solution."); return; }
    const map = computeSlots(date, duration, candidates, bookings, config.closures);
    const avail = map[slot];
    if (!avail || !avail.length) { alert("Orario non disponibile."); setSlot(null); return; }
    const cm = clients.find((c) => c.code === code);
    if (!cm && canAddClient === false) { alert("Limite demo raggiunto: massimo 3 clienti. Per usare il programma senza limiti contatta Office Solution."); return; }
    const assigned = staffId && avail.includes(staffId) ? staffId : avail[0];
    const r = upsertClient({ code: cm ? cm.code : null, name: name.trim(), email: email.trim(), phone: phone.trim() }, clients);
    const booking = { id: uid(), date, startMin: slot, endMin: slot + duration, serviceIds: sel, staffId: assigned, clientCode: r.code, clientName: name.trim(), clientEmail: email.trim(), createdAt: Date.now() };
    setBookings([...bookings, booking]);
    setClients(r.clients);
    onDone();
  };

  return (
    <div className="bg-white rounded-2xl border-2 brand-border p-5 shadow-sm space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><CalendarPlus size={16} className="brand-accent" /> Nuovo appuntamento</h3>
      <div>
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Servizi {selStaff ? <span className="normal-case text-stone-400">· solo quelli di {selStaff.name}</span> : <span className="normal-case text-stone-300">· puoi sceglierne più di uno</span>}</div>
        <div className="flex flex-wrap gap-1.5">{services.map((s) => { const on = sel.includes(s.id); const off = selStaff && !selStaff.serviceIds.includes(s.id); return <button key={s.id} disabled={off} onClick={() => toggle(s.id)} className={`px-2.5 py-1 rounded-lg text-xs border transition ${off ? "bg-stone-50 border-stone-100 text-stone-300 cursor-not-allowed" : on ? "brand-bg border-transparent" : "bg-white border-stone-200 text-stone-600 brand-hover"}`}>{s.name} · {s.durationMin}′</button>; })}</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Operatore</div>
          <select value={staffId} onChange={(e) => { const id = e.target.value; const ns = id ? staff.find((s) => s.id === id) : null; setStaffId(id); if (ns) setSel((p) => p.filter((x) => ns.serviceIds.includes(x))); setSlot(null); }} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring">
            <option value="">Primo disponibile</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Giorno</div>
          <input type="date" value={date} min={todayStr()} max={maxDate} onChange={(e) => { setDate(e.target.value); setSlot(null); }} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
        </div>
      </div>
      {sel.length > 0 ? (
        <div>
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Orario disponibile</div>
          {closed ? <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">Salone chiuso in questa data{closed.label ? ` (${closed.label})` : ""}.</p> : opOff ? <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">{selStaff.name} è assente in questa data (malattia/ferie).</p> : candidates.length === 0 ? <p className="text-sm text-amber-600">Nessun operatore può fare tutti questi servizi.</p> : slotTimes.length === 0 ? <p className="text-sm text-stone-400">Nessuno slot libero.</p> : <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">{slotTimes.map((t) => <button key={t} onClick={() => setSlot(t)} className={`py-1.5 rounded-lg border text-sm font-medium transition ${slot === t ? "brand-bg border-transparent" : "bg-white border-stone-200 brand-hover"}`}>{minToStr(t)}</button>)}</div>}
        </div>
      ) : null}
      <div>
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Cliente abituale (cerca per nome, codice, telefono o tessera)</div>
        <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 bg-white brand-ring"><Search size={15} className="text-stone-400" /><input value={lk} onChange={(e) => setLk(e.target.value)} placeholder="Cerca un cliente esistente" className="flex-1 text-sm focus:outline-none" />{lk ? <button onClick={() => setLk("")} className="text-stone-400"><X size={15} /></button> : null}</div>
        {lkMatches.length > 0 ? <div className="mt-1 border border-stone-200 rounded-lg divide-y divide-stone-100">{lkMatches.map((c) => <button key={c.code} onClick={() => pickClient(c)} className="w-full text-left px-3 py-2 hover:bg-stone-50 text-sm flex justify-between gap-2"><span className="truncate">{c.name || "Senza nome"} <span className="text-stone-400">#{c.code}</span>{c.card ? <span className="text-stone-300"> · tessera {c.card}</span> : null}</span>{c.phone ? <span className="text-stone-400 text-xs shrink-0">{c.phone}</span> : null}</button>)}</div> : null}
        {lk && lkMatches.length === 0 ? <p className="text-xs text-stone-400 mt-1">Nessun cliente trovato. Compila i campi sotto per crearne uno nuovo.</p> : null}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <FieldIcon icon={Hash}><input value={code} inputMode="numeric" onChange={(e) => onCode(e.target.value)} placeholder="Codice (se esiste)" className="flex-1 text-sm focus:outline-none" /></FieldIcon>
        <FieldIcon icon={User}><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome e cognome" className="flex-1 text-sm focus:outline-none" /></FieldIcon>
        <FieldIcon icon={Mail}><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="flex-1 text-sm focus:outline-none" /></FieldIcon>
        <FieldIcon icon={Phone}><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefono" className="flex-1 text-sm focus:outline-none" /></FieldIcon>
      </div>
      <button disabled={!sel.length || slot === null || !name.trim()} onClick={save} className="w-full brand-bg disabled:opacity-40 disabled:cursor-not-allowed font-medium py-2.5 rounded-lg transition">Salva appuntamento</button>
    </div>
  );
}

function LicensePanel({ license, onSave }) {
  const st = licenseState(license);
  const [code, setCode] = useState(license && license.code ? license.code : "");
  const [unlimited, setUnlimited] = useState(license ? !!license.code && license.expiry == null : false);
  const [months, setMonths] = useState(license && license.months ? license.months : 12);
  const [saved, setSaved] = useState(false);
  const gen = () => {
    const c = code.trim(); if (!c) return;
    onSave(makeLicense(c, unlimited ? 0 : months));
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  let banner = null;
  if (st.state === "none") banner = <div className="bg-stone-50 text-stone-500 rounded-lg px-3 py-2 text-sm">Nessuna licenza cliente configurata. Imposta un codice e una durata, poi consegna il codice al cliente.</div>;
  else if (st.state === "tampered") banner = <div className="bg-red-50 text-red-600 rounded-lg px-3 py-2 text-sm flex items-center gap-1.5"><AlertTriangle size={15} /> Licenza non valida o manomessa. Rigenerala.</div>;
  else if (st.state === "expired") banner = <div className="bg-red-50 text-red-600 rounded-lg px-3 py-2 text-sm flex items-center gap-1.5"><CalendarX2 size={15} /> Scaduta il {fmtFullDate(st.expiry)}. Genera una nuova licenza per riattivare l'accesso.</div>;
  else if (st.unlimited) banner = <div className="bg-green-50 text-green-700 rounded-lg px-3 py-2 text-sm flex items-center gap-1.5"><BadgeCheck size={15} /> Licenza attiva — senza scadenza.</div>;
  else banner = <div className={`rounded-lg px-3 py-2 text-sm flex items-center gap-1.5 ${st.days <= 30 ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}><BadgeCheck size={15} /> Attiva fino al {fmtFullDate(st.expiry)} · {st.days} giorni rimanenti.</div>;

  return (
    <section className="bg-white rounded-2xl border-2 brand-border p-5 shadow-sm">
      <h3 className="font-semibold flex items-center gap-2 mb-1"><KeyRound size={16} className="brand-accent" /> Licenza cliente <span className="text-xs font-normal text-stone-400">(solo rivenditore)</span></h3>
      <p className="text-xs text-stone-400 mb-3">Sezione visibile solo con il codice rivenditore <span className="font-semibold">{RESELLER_CODE}</span>. Il cliente non la vede e non può rinnovarsi da solo.</p>
      <div className="mb-4">{banner}</div>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <Field label="Codice cliente"><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="es. 1234" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm tracking-widest brand-ring" /></Field>
        <Field label="Durata (mesi)"><input type="number" min={1} step={1} value={months} disabled={unlimited} onChange={(e) => setMonths(Math.max(1, Number(e.target.value) || 1))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring disabled:opacity-50 disabled:cursor-not-allowed" /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-600 mb-4 cursor-pointer"><input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} /> Senza scadenza (licenza illimitata)</label>
      <div className="flex items-center gap-3 flex-wrap">
        <button disabled={!code.trim()} onClick={gen} className="brand-bg disabled:opacity-40 disabled:cursor-not-allowed font-medium px-4 py-2.5 rounded-lg transition inline-flex items-center gap-2"><KeyRound size={16} /> {st.state === "none" ? "Genera licenza" : "Rigenera / rinnova"}</button>
        {saved ? <span className="text-sm text-green-600 inline-flex items-center gap-1"><Check size={15} /> Salvata.</span> : null}
      </div>
      <p className="text-xs text-stone-400 mt-4 leading-relaxed">Alla scadenza il cliente non potrà più accedere finché non generi una nuova licenza da qui. Il rinnovo riparte da oggi.<br />Accesso ridotto: il cliente può entrare col proprio codice seguito da <span className="font-medium text-stone-500">01</span> (es. codice 1234 → 123401) per usare il gestionale senza vedere le vendite e gli appuntamenti segnati come "parziale".</p>
    </section>
  );
}

function StatBar({ rows, fmt }) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  if (rows.length === 0) return <p className="text-sm text-stone-400">Nessun dato nel periodo selezionato.</p>;
  return (
    <div className="space-y-3">{rows.map((r, i) => (
      <div key={i} className="flex items-center gap-3">
        <span className="w-24 sm:w-28 truncate text-[13px] text-stone-600 shrink-0" title={r.label}>{r.label}</span>
        <div className="flex-1 bg-stone-100 rounded-full h-2.5 overflow-hidden">
          <div className="h-2.5 rounded-full brand-bg origin-left" style={{ width: `${Math.max(4, (r.value / max) * 100)}%`, animation: "lc-grow-x .6s var(--lc-ease) both", animationDelay: `${Math.min(i * 45, 360)}ms` }} />
        </div>
        <span className="w-16 text-right text-[13px] font-semibold tabular-nums text-stone-800 shrink-0">{fmt ? fmt(r.value) : r.value}</span>
      </div>
    ))}</div>
  );
}

// Grafico a barre verticali per le serie temporali (andamento mensile).
function TrendChart({ rows, fmt }) {
  if (!rows || rows.length === 0) return <p className="text-sm text-stone-400">Nessun dato nel periodo selezionato.</p>;
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  return (
    <div>
      <div className="flex items-end gap-2 sm:gap-3 h-36">
        {rows.map((r, i) => { const h = Math.max(2, (r.value / max) * 88); return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
            <div className="text-[11px] font-semibold tabular-nums text-stone-700 mb-1.5 whitespace-nowrap">{fmt ? fmt(r.value) : r.value}</div>
            <div className="w-full rounded-t-md brand-bg origin-bottom hover:brightness-95 transition" style={{ height: `${h}%`, animation: "lc-grow-y .6s var(--lc-ease) both", animationDelay: `${Math.min(i * 60, 420)}ms` }} title={`${r.label}: ${fmt ? fmt(r.value) : r.value}`} />
          </div>
        ); })}
      </div>
      <div className="flex gap-2 sm:gap-3 mt-2">
        {rows.map((r, i) => <div key={i} className="flex-1 text-[11px] text-stone-400 truncate text-center">{r.label}</div>)}
      </div>
    </div>
  );
}

// Scheda KPI elegante (icona + etichetta + valore).
function Kpi({ icon: Icon, label, value, accent, index = 0 }) {
  return (
    <div className="lc-card lc-fade-up p-4" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-center gap-1.5 text-stone-400"><Icon size={15} /><span className="text-[11px] uppercase tracking-wide font-medium">{label}</span></div>
      <div className={`text-[26px] leading-none font-semibold tracking-tight tabular-nums mt-2 ${accent ? "brand-accent" : "text-stone-900"}`}>{value}</div>
    </div>
  );
}

function StatsView({ config, bookings, clients, sales, catalog, vouchers }) {
  const [days, setDays] = useState(90);
  const cutoff = days ? addDays(todayStr(), -days) : null;
  const bk = bookings.filter((b) => !cutoff || b.date >= cutoff);
  const counted = bk.filter((b) => b.status !== "cancelled" && b.status !== "noshow");
  const sl = (sales || []).filter((s) => s.type === "sale" && (!cutoff || pd(new Date(s.ts)) >= cutoff));

  const svcCount = {};
  counted.forEach((b) => (b.serviceIds || []).forEach((id) => { svcCount[id] = (svcCount[id] || 0) + 1; }));
  const svcRows = Object.keys(svcCount).map((id) => { const s = config.services.find((x) => x.id === id); return { label: s ? s.name : "—", value: svcCount[id] }; }).sort((a, b) => b.value - a.value).slice(0, 8);

  const hourCount = {};
  counted.forEach((b) => { const h = Math.floor(b.startMin / 60); hourCount[h] = (hourCount[h] || 0) + 1; });
  const hourRows = Object.keys(hourCount).map(Number).sort((a, b) => a - b).map((h) => ({ label: `${pad(h)}:00`, value: hourCount[h] }));

  const cliCount = {};
  counted.forEach((b) => { if (b.clientCode) cliCount[b.clientCode] = (cliCount[b.clientCode] || 0) + 1; });
  const cliRows = Object.keys(cliCount).map((code) => { const c = clients.find((x) => x.code === code); return { label: c ? (c.name || `#${code}`) : `#${code}`, value: cliCount[code] }; }).sort((a, b) => b.value - a.value).slice(0, 8);

  const prodQty = {};
  sl.forEach((s) => (s.items || []).forEach((it) => { prodQty[it.productId] = (prodQty[it.productId] || 0) + it.qty; }));
  const prodRows = Object.keys(prodQty).map((id) => { const p = catalog.products.find((x) => x.id === id); return { label: p ? p.name : "—", value: prodQty[id] }; }).sort((a, b) => b.value - a.value).slice(0, 8);

  const monthRev = {};
  sl.forEach((s) => { const d = new Date(s.ts); const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; monthRev[k] = (monthRev[k] || 0) + s.total; });
  const monthRows = Object.keys(monthRev).sort().slice(-6).map((k) => { const parts = k.split("-"); return { label: `${MONTHS[Number(parts[1]) - 1].slice(0, 3)} ${parts[0].slice(2)}`, value: Math.round(monthRev[k]) }; });

  const totRevenue = sl.reduce((a, s) => a + s.total, 0);

  const realized = bk.filter((b) => b.status === "done" || b.status === "partial");
  const svcPrice = (b) => (b.amount != null ? Number(b.amount) || 0 : (b.serviceIds || []).reduce((a, id) => { const s = config.services.find((x) => x.id === id); return a + ((s && s.price) || 0); }, 0));
  const svcRevTot = realized.reduce((a, b) => a + svcPrice(b), 0);
  const svcMonth = {};
  realized.forEach((b) => { const k = b.date.slice(0, 7); svcMonth[k] = (svcMonth[k] || 0) + svcPrice(b); });
  const svcMonthRows = Object.keys(svcMonth).sort().slice(-6).map((k) => { const parts = k.split("-"); return { label: `${MONTHS[Number(parts[1]) - 1].slice(0, 3)} ${parts[0].slice(2)}`, value: Math.round(svcMonth[k]) }; });

  const card = "lc-card p-5";

  const vch = (vouchers || []).filter((v) => !cutoff || pd(new Date(v.creato)) >= cutoff);
  const vchRevTot = vch.reduce((a, v) => a + (Number(v.prezzo) || 0), 0);
  const vchMonth = {};
  vch.forEach((v) => { const d = new Date(v.creato); const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; vchMonth[k] = (vchMonth[k] || 0) + (Number(v.prezzo) || 0); });
  const vchMonthRows = Object.keys(vchMonth).sort().slice(-6).map((k) => { const parts = k.split("-"); return { label: `${MONTHS[Number(parts[1]) - 1].slice(0, 3)} ${parts[0].slice(2)}`, value: Math.round(vchMonth[k]) }; });
  const vchValore = vch.filter((v) => v.tipo === "valore").length;
  const vchPacchetto = vch.filter((v) => v.tipo === "pacchetto").length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-stone-900 leading-none">Statistiche</h2>
          <p className="text-[13px] text-stone-400 mt-1">Andamento del salone {days ? `· ultimi ${days} giorni` : "· da sempre"}</p>
        </div>
        <div className="flex gap-1 bg-stone-100/80 rounded-xl p-1">
          {[[30, "30 giorni"], [90, "90 giorni"], [0, "Tutto"]].map((o) => <button key={o[0]} onClick={() => setDays(o[0])} aria-current={days === o[0] ? "true" : undefined} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ${days === o[0] ? "bg-white shadow-[var(--lc-shadow-xs)] text-stone-900" : "text-stone-500 hover:text-stone-700"}`}>{o[1]}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Calendar} label="Appuntamenti" value={counted.length} index={0} />
        <Kpi icon={Users} label="Clienti attivi" value={cliRows.length} index={1} />
        <Kpi icon={Sparkles} label="Incasso servizi" value={eur(svcRevTot)} accent index={2} />
        <Kpi icon={ShoppingBag} label="Incasso prodotti" value={eur(totRevenue)} accent index={3} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className={card}><h3 className="font-semibold flex items-center gap-2 mb-5 text-stone-900 tracking-tight"><TrendingUp size={16} className="brand-accent" /> Vendite servizi <span className="text-xs font-normal text-stone-400">· {eur(svcRevTot)}</span></h3><TrendChart rows={svcMonthRows} fmt={(v) => eur(v)} /></section>
        <section className={card}><h3 className="font-semibold flex items-center gap-2 mb-5 text-stone-900 tracking-tight"><TrendingUp size={16} className="brand-accent" /> Vendite prodotti <span className="text-xs font-normal text-stone-400">· {eur(totRevenue)}</span></h3><TrendChart rows={monthRows} fmt={(v) => eur(v)} /></section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className={card}><h3 className="font-semibold flex items-center gap-2 mb-4 text-stone-900 tracking-tight"><Sparkles size={16} className="brand-accent" /> Servizi più richiesti</h3><StatBar rows={svcRows} /></section>
        <section className={card}><h3 className="font-semibold flex items-center gap-2 mb-4 text-stone-900 tracking-tight"><Package size={16} className="brand-accent" /> Prodotti più venduti <span className="text-xs font-normal text-stone-400">· unità</span></h3><StatBar rows={prodRows} /></section>
        <section className={card}><h3 className="font-semibold flex items-center gap-2 mb-4 text-stone-900 tracking-tight"><Clock size={16} className="brand-accent" /> Fasce orarie più richieste</h3><StatBar rows={hourRows} /></section>
        <section className={card}><h3 className="font-semibold flex items-center gap-2 mb-4 text-stone-900 tracking-tight"><Users size={16} className="brand-accent" /> Clienti più attivi</h3><StatBar rows={cliRows} /></section>
      </div>

      <section className={card}>
        <h3 className="font-semibold flex items-center gap-2 mb-4 text-stone-900 tracking-tight"><Gift size={16} className="brand-accent" /> Buoni regalo</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl bg-stone-50 border border-stone-100 p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Totale incassato</div><div className="text-2xl font-semibold tracking-tight tabular-nums mt-1 brand-accent">{eur(vchRevTot)}</div></div>
          <div className="rounded-xl bg-stone-50 border border-stone-100 p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Buoni valore</div><div className="text-2xl font-semibold tracking-tight tabular-nums mt-1 text-stone-900">{vchValore}</div></div>
          <div className="rounded-xl bg-stone-50 border border-stone-100 p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Buoni pacchetto</div><div className="text-2xl font-semibold tracking-tight tabular-nums mt-1 text-stone-900">{vchPacchetto}</div></div>
        </div>
        {vchMonthRows.length ? <TrendChart rows={vchMonthRows} fmt={(v) => eur(v)} /> : <p className="text-sm text-stone-400">Nessun buono venduto nel periodo selezionato.</p>}
      </section>
    </div>
  );
}

function MarketingView({ config, saveConfig, bookings, clients, sales, catalog }) {
  const M = marketingConfig(config);
  const services = config.services || [];
  const products = (catalog && catalog.products) || [];
  const [svc, setSvc] = useState("");
  const [prod, setProd] = useState("");
  const [inact, setInact] = useState(0);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [mi, setMi] = useState(M.msgInactive);
  const [ms, setMs] = useState(M.msgServices);
  const [mp, setMp] = useState(M.msgProducts);

  const lastVisit = (code) => {
    let last = "";
    bookings.forEach((b) => { if (b.clientCode === code && b.date > last) last = b.date; });
    (sales || []).forEach((s) => { if (s.type === "sale" && s.clientCode === code) { const d = pd(new Date(s.ts)); if (d > last) last = d; } });
    return last;
  };
  const usedService = (code, sid) => bookings.some((b) => b.clientCode === code && (b.serviceIds || []).includes(sid));
  const boughtProduct = (code, pid) => (sales || []).some((s) => s.type === "sale" && s.clientCode === code && (s.items || []).some((it) => it.productId === pid));

  const cutoff = inact ? addDays(todayStr(), -inact) : null;
  const withPhone = clients.filter((c) => (c.phone || "").replace(/\D/g, "").length >= 6);
  const filtered = withPhone.filter((c) => {
    if (svc && !usedService(c.code, svc)) return false;
    if (prod && !boughtProduct(c.code, prod)) return false;
    if (cutoff) { const lv = lastVisit(c.code); if (lv && lv >= cutoff) return false; }
    return true;
  }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const activeMsg = inact ? M.msgInactive : (svc ? M.msgServices : (prod ? M.msgProducts : ""));
  const firstNameOf = (c) => (c.firstName != null && c.firstName.trim()) ? c.firstName.trim() : ((c.name || "").trim().split(/\s+/)[0] || "");
  const lastNameOf = (c) => (c.lastName != null) ? c.lastName.trim() : ((c.name || "").trim().split(/\s+/).slice(1).join(" "));
  const waHref = (c) => { const num = waNumber(c.phone); const txt = activeMsg ? activeMsg.replace(/\{nome_completo\}/g, (c.name || "").trim()).replace(/\{cognome\}/g, lastNameOf(c)).replace(/\{nome\}/g, firstNameOf(c)) : ""; return `https://wa.me/${num}${txt ? `?text=${encodeURIComponent(txt)}` : ""}`; };

  const openCfg = () => { setMi(M.msgInactive); setMs(M.msgServices); setMp(M.msgProducts); setCfgOpen(true); };
  const saveMsgs = () => { saveConfig({ ...config, marketing: { msgInactive: mi, msgServices: ms, msgProducts: mp } }); setCfgOpen(false); };
  const resetMsgs = () => { setMi(DEFAULT_MARKETING.msgInactive); setMs(DEFAULT_MARKETING.msgServices); setMp(DEFAULT_MARKETING.msgProducts); };
  const inactOpts = [[0, "Tutti"], [30, "Inattivi 1+ mese"], [90, "Inattivi 3+ mesi"], [180, "Inattivi 6+ mesi"]];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">Marketing</h2>
        <button onClick={openCfg} className="flex items-center gap-1.5 text-sm border border-stone-300 text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-50"><Settings size={15} /> Messaggi</button>
      </div>

      <div className="lc-card p-4 grid sm:grid-cols-3 gap-3">
        <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Servizio usato</div><select value={svc} onChange={(e) => setSvc(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring"><option value="">Tutti</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Prodotto acquistato</div><select value={prod} onChange={(e) => setProd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring"><option value="">Tutti</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Cliente inattivo</div><select value={inact} onChange={(e) => setInact(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring">{inactOpts.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></div>
      </div>

      {activeMsg ? <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2"><MessageCircle size={14} className="shrink-0 mt-0.5" /><span>Con il filtro attivo, WhatsApp si aprirà con un messaggio già pronto: potrai completarlo o modificarlo prima di inviarlo.</span></p> : null}

      {filtered.length === 0 ? <div className="lc-card p-10 text-center text-stone-400">{withPhone.length === 0 ? "Nessun cliente con numero di telefono." : "Nessun cliente corrisponde ai filtri."}</div> : (
        <div className="space-y-2">{filtered.map((c) => { const lv = lastVisit(c.code); return (
          <div key={c.code} className="bg-white rounded-xl border border-stone-200 p-3 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-full brand-soft brand-accent flex items-center justify-center font-semibold shrink-0">{(c.name || "?").slice(0, 1).toUpperCase()}</div>
            <div className="flex-1 min-w-0"><div className="font-medium truncate">{c.name || "Senza nome"} <span className="text-xs text-stone-400 font-normal">#{c.code}</span></div><div className="text-xs text-stone-400 truncate">{c.phone}{lv ? ` · ultima attività ${fmtDate(lv)}` : " · mai venuto"}</div></div>
            <a href={waHref(c)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-medium bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 shrink-0"><MessageCircle size={15} /> <span className="hidden sm:inline">WhatsApp</span></a>
          </div>
        ); })}</div>
      )}
      {filtered.length > 0 ? <p className="text-xs text-stone-400 text-center">{filtered.length} client{filtered.length === 1 ? "e" : "i"} con numero · tocca WhatsApp per scrivere</p> : null}

      {cfgOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setCfgOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl overflow-auto" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-lg flex items-center gap-2"><Settings size={18} className="brand-accent" /> Messaggi WhatsApp</h3><button onClick={() => setCfgOpen(false)} className="text-stone-400 hover:text-stone-600"><X size={20} /></button></div>
            <p className="text-sm text-stone-500 mb-3">Segnaposto disponibili: <code className="bg-stone-100 px-1 rounded">{"{nome}"}</code> (solo nome, più amichevole), <code className="bg-stone-100 px-1 rounded">{"{cognome}"}</code>, <code className="bg-stone-100 px-1 rounded">{"{nome_completo}"}</code>. Gli asterischi attorno a una parola (*testo*) la rendono in grassetto su WhatsApp.</p>
            <div className="space-y-3">
              <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Cliente inattivo</div><textarea value={mi} onChange={(e) => setMi(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
              <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Filtro servizio usato</div><textarea value={ms} onChange={(e) => setMs(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
              <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Filtro prodotto acquistato</div><textarea value={mp} onChange={(e) => setMp(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
            </div>
            <div className="flex gap-2 mt-4"><button onClick={saveMsgs} className="flex-1 brand-bg font-medium py-2.5 rounded-lg">Salva messaggi</button><button onClick={resetMsgs} className="text-sm text-stone-500 px-3 py-2.5 rounded-lg border border-stone-200">Ripristina default</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SettingsView({ config, saveConfig, bookings, setBookings, clients, setClients, catalog, setCatalog, sales, setSales, session, license, onSaveLicense, backupDirName, onPickBackupDir, onClearBackupDir, onBackupNow, lastBackup, licenza }) {
  const F = useMods();
  const services = config.services, staff = config.staff, branding = config.branding;
  const isReseller = session && session.role === "reseller";
  const updServices = (next) => saveConfig({ ...config, services: next });
  const updStaff = (next) => saveConfig({ ...config, staff: next });
  const updBranding = (patch) => saveConfig({ ...config, branding: { ...branding, ...patch } });
  const addService = () => updServices([...services, { id: uid(), name: "Nuovo servizio", durationMin: 30 }]);
  const editService = (id, patch) => updServices(services.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const delService = (id) => { updServices(services.filter((s) => s.id !== id)); updStaff(staff.map((st) => ({ ...st, serviceIds: st.serviceIds.filter((x) => x !== id) }))); };
  const addStaff = () => updStaff([...staff, { id: uid(), name: "Nuovo operatore", role: "", serviceIds: [], availability: {} }]);
  const editStaff = (id, patch) => updStaff(staff.map((st) => (st.id === id ? { ...st, ...patch } : st)));
  const delStaff = (id) => updStaff(staff.filter((st) => st.id !== id));
  const onLogo = async (e) => { const file = e.target.files && e.target.files[0]; if (!file) return; try { const url = await fileToResizedDataURL(file, 256); updBranding({ logo: url }); } catch (err) { alert("Impossibile caricare l'immagine."); } e.target.value = ""; };
  const reset = () => { if (confirm("Caricare i dati di esempio (clienti, appuntamenti e vendite di prova)? I dati attuali verranno sostituiti. La licenza non viene toccata.")) { const s = buildSampleData(); saveConfig(DEFAULT_CONFIG); setClients(s.clients); setBookings(s.bookings); setSales(s.sales); setCatalog(DEFAULT_CATALOG); alert("Dati di esempio caricati."); } };
  const azzeraGiacenze = () => { if (confirm("Azzerare TUTTE le giacenze a 0? Prodotti, formati e prezzi restano invariati: solo le quantità in magazzino verranno messe a zero. L'operazione non è reversibile.")) { setCatalog({ ...catalog, products: catalog.products.map((p) => ({ ...p, formats: p.formats.map((f) => ({ ...f, stock: 0 })) })) }); alert("Giacenze azzerate."); } };
  const importBackup = async (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    try { const text = await file.text(); const d = JSON.parse(text); if (d.config) saveConfig({ ...DEFAULT_CONFIG, ...d.config }); if (Array.isArray(d.bookings)) setBookings(d.bookings); if (Array.isArray(d.clients)) setClients(d.clients); if (d.catalog && Array.isArray(d.catalog.products)) setCatalog(d.catalog); if (Array.isArray(d.sales)) setSales(d.sales); alert("Backup importato."); } catch (err) { alert("File di backup non valido."); }
    e.target.value = "";
  };
  const azzeraTutto = () => { if (confirm("Azzerare COMPLETAMENTE la configurazione (servizi, operatori, clienti, appuntamenti, catalogo, vendite e dati dell'attività)? Da usare per preparare una nuova installazione cliente. Operazione non reversibile.")) { saveConfig({ ...DEFAULT_CONFIG, services: [], staff: [], branding: BLANK_BRANDING, loyalty: DEFAULT_LOYALTY }); setBookings([]); setClients([]); setCatalog({ categories: [], products: [] }); setSales([]); alert("Configurazione azzerata. Puoi impostare il salone da zero."); } };
  const loyalty = loyaltyConfig(config);
  const updLoyalty = (patch) => saveConfig({ ...config, loyalty: { ...loyalty, ...patch } });
  const addReward = () => updLoyalty({ rewards: [...loyalty.rewards, { id: uid(), points: 5, label: "Nuovo premio" }] });
  const editReward = (id, patch) => updLoyalty({ rewards: loyalty.rewards.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const delReward = (id) => updLoyalty({ rewards: loyalty.rewards.filter((r) => r.id !== id) });
  const [editAspect, setEditAspect] = useState(false);
  const closures = config.closures || [];
  const [clFrom, setClFrom] = useState("");
  const [clTo, setClTo] = useState("");
  const [clLabel, setClLabel] = useState("");
  const addClosure = () => { if (!clFrom) return; const to = clTo || clFrom; const from = clFrom; saveConfig({ ...config, closures: [...closures, { id: uid(), from: from <= to ? from : to, to: from <= to ? to : from, label: clLabel.trim() }] }); setClFrom(""); setClTo(""); setClLabel(""); };
  const delClosure = (id) => saveConfig({ ...config, closures: closures.filter((c) => c.id !== id) });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap"><h2 className="text-xl font-semibold tracking-tight text-stone-900">Impostazioni</h2>{isReseller ? <div className="flex items-center gap-2"><button onClick={reset} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"><RefreshCw size={14} /> Ripristina demo</button><button onClick={azzeraTutto} className="flex items-center gap-1.5 text-sm text-red-600 border border-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-50"><AlertTriangle size={14} /> Azzera tutto</button></div> : null}</div>

      {isReseller ? <LicensePanel license={license} onSave={onSaveLicense} /> : null}

      <section className="lc-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><BadgeCheck size={16} className="brand-accent" /> La tua licenza</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-stone-50 rounded-xl p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide">Piano</div><div className="font-semibold mt-0.5">{(licenza && licenza.plan) || "—"}</div></div>
          <div className="bg-stone-50 rounded-xl p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide">Canone</div><div className="font-semibold mt-0.5">{licenza && licenza.prezzo_finale ? `€ ${licenza.prezzo_finale}/mese` : "—"}</div></div>
          <div className="bg-stone-50 rounded-xl p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide">Scadenza</div><div className="font-semibold mt-0.5">{licenza && licenza.scadenza ? String(licenza.scadenza).split("-").reverse().join("/") : "Illimitata"}</div></div>
        </div>
        <p className="text-[11px] text-stone-400 mt-3">Per cambiare piano o rinnovare la licenza contatta il tuo fornitore.</p>
      </section>

{F.vendite && (
      <section className="lc-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><Boxes size={16} className="brand-accent" /> Magazzino</h3>
        <p className="text-sm text-stone-500 mb-3">Azzera la giacenza di tutti i prodotti (prodotti, formati e prezzi restano invariati). Utile prima di un nuovo inventario da ricaricare con la scheda Carico.</p>
        <button onClick={azzeraGiacenze} className="text-sm border border-red-300 text-red-600 px-3 py-2 rounded-lg inline-flex items-center gap-2 hover:bg-red-50"><AlertCircle size={15} /> Azzera giacenze</button>
      </section>
      )}

      <section className="lc-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><Download size={16} className="brand-accent" /> Backup dei dati</h3>
        <p className="text-sm text-stone-500 mb-3">I dati sono salvati su questo PC. Esporta regolarmente un backup per sicurezza. (La licenza non è inclusa nel backup.)</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportBackup(config, bookings, clients, catalog, sales)} className="text-sm brand-bg px-3 py-2 rounded-lg inline-flex items-center gap-2"><Download size={15} /> Esporta backup</button>
          <label className="text-sm border border-stone-300 text-stone-700 px-3 py-2 rounded-lg inline-flex items-center gap-2 cursor-pointer hover:bg-stone-50"><Upload size={15} /> Importa backup<input type="file" accept="application/json" onChange={importBackup} className="hidden" /></label>
        </div>
      </section>

      <section className="lc-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><RefreshCw size={16} className="brand-accent" /> Backup automatico</h3>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-3"><input type="checkbox" checked={!!(config.backup && config.backup.enabled)} onChange={(e) => saveConfig({ ...config, backup: { time: (config.backup && config.backup.time) || "20:00", enabled: e.target.checked } })} className="w-4 h-4" /> Salva automaticamente un backup ogni giorno</label>
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div><div className="text-[11px] text-stone-400 mb-1">Orario</div><input type="time" value={(config.backup && config.backup.time) || "20:00"} onChange={(e) => saveConfig({ ...config, backup: { enabled: !!(config.backup && config.backup.enabled), time: e.target.value } })} className="px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
          <div className="flex-1 min-w-[180px]"><div className="text-[11px] text-stone-400 mb-1">Cartella di destinazione</div><div className="flex items-center gap-2"><button onClick={onPickBackupDir} className="text-sm brand-bg px-3 py-2 rounded-lg inline-flex items-center gap-1.5"><FolderOpen size={15} /> Scegli cartella</button>{backupDirName ? <span className="text-sm text-stone-600 truncate">{backupDirName}</span> : <span className="text-sm text-stone-400">nessuna</span>}{backupDirName ? <button onClick={onClearBackupDir} className="text-stone-400 hover:text-red-500" title="Rimuovi"><X size={16} /></button> : null}</div></div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={onBackupNow} className="text-sm border border-stone-300 text-stone-700 px-3 py-2 rounded-lg inline-flex items-center gap-1.5 hover:bg-stone-50"><Download size={15} /> Backup ora</button>
          {lastBackup ? <span className="text-xs text-stone-400">Ultimo backup: {fmtFullDate(lastBackup.at)}</span> : <span className="text-xs text-stone-400">Nessun backup ancora.</span>}
        </div>
        <p className="text-xs text-stone-400 mt-3">Scegli una volta la cartella sul PC: l'app vi salverà il file <code className="bg-stone-100 px-1 rounded">lucentia-backup-AAAA-MM-GG.json</code> all'orario impostato (occorre che l'app sia aperta a quell'ora). Funziona su Windows; su Android usa "Esporta backup".</p>
      </section>

      <section className="lc-card p-5">
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold flex items-center gap-2"><Store size={16} className="brand-accent" /> Attività e aspetto</h3><button onClick={() => setEditAspect((e) => !e)} className="text-sm brand-accent border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50">{editAspect ? "Chiudi" : "Modifica"}</button></div>
        {!editAspect ? (
          <div className="flex items-center gap-3 text-sm text-stone-500">{branding.logo ? <img src={branding.logo} alt="logo" className="w-10 h-10 rounded-xl object-cover border border-stone-200" /> : <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-300"><ImageIcon size={18} /></div>}<span className="font-medium text-stone-700">{branding.name || "—"}</span>{branding.tagline ? <span className="text-stone-400">· {branding.tagline}</span> : null}</div>
        ) : (
        <>
        <div className="flex items-start gap-4 mb-5">
          <div className="shrink-0">{branding.logo ? <img src={branding.logo} alt="logo" className="w-20 h-20 rounded-2xl object-cover border border-stone-200" /> : <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-300"><ImageIcon size={26} /></div>}</div>
          <div className="flex-1">
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Logo</div>
            <div className="flex gap-2"><label className="cursor-pointer text-sm brand-bg px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"><ImageIcon size={15} /> Carica<input type="file" accept="image/*" onChange={onLogo} className="hidden" /></label>{branding.logo ? <button onClick={() => updBranding({ logo: null })} className="text-sm text-stone-500 hover:text-red-500 px-3 py-1.5 rounded-lg border border-stone-200">Rimuovi</button> : null}</div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <Field label="Nome attività"><input value={branding.name} onChange={(e) => updBranding({ name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          <Field label="Sottotitolo"><input value={branding.tagline} onChange={(e) => updBranding({ tagline: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          <Field label="Telefono"><input value={branding.phone} onChange={(e) => updBranding({ phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          <Field label="Email"><input value={branding.email} onChange={(e) => updBranding({ email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          <Field label="Indirizzo"><input value={branding.address} onChange={(e) => updBranding({ address: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
        </div>
        <div>
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Palette size={13} /> Colore principale</div>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESETS.map((c) => <button key={c} onClick={() => updBranding({ primary: c })} className={`w-9 h-9 rounded-full transition ${branding.primary.toLowerCase() === c ? "ring-2 ring-offset-2 ring-stone-400" : ""}`} style={{ background: c }} aria-label={c} />)}
            <label className="w-9 h-9 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center cursor-pointer overflow-hidden relative" title="Colore personalizzato"><Plus size={16} className="text-stone-400" /><input type="color" value={branding.primary} onChange={(e) => updBranding({ primary: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" /></label>
          </div>
        </div>
        </>
        )}
      </section>

      <section className="lc-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><CalendarRange size={16} className="brand-accent" /> Chiusure salone (ferie / festività)</h3>
        {closures.length > 0 ? (
          <div className="space-y-2 mb-4">{closures.slice().sort((a, b) => (a.from > b.from ? 1 : -1)).map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 border border-stone-200 rounded-xl p-3">
              <div className="min-w-0"><div className="font-medium text-sm truncate">{c.label || "Chiusura"}</div><div className="text-xs text-stone-400">{c.from === c.to ? fmtDate(c.from) : `${fmtDate(c.from)} → ${fmtDate(c.to)}`}</div></div>
              <button onClick={() => delClosure(c.id)} className="p-2 text-stone-400 hover:text-red-500 shrink-0"><Trash2 size={16} /></button>
            </div>
          ))}</div>
        ) : <p className="text-sm text-stone-400 mb-4">Nessuna chiusura programmata.</p>}
        <div className="border-t border-stone-100 pt-3">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Aggiungi chiusura</div>
          <div className="flex flex-wrap items-end gap-2">
            <div><div className="text-[11px] text-stone-400 mb-1">Dal</div><input type="date" value={clFrom} onChange={(e) => setClFrom(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
            <div><div className="text-[11px] text-stone-400 mb-1">Al (facoltativo)</div><input type="date" value={clTo} onChange={(e) => setClTo(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
            <input value={clLabel} onChange={(e) => setClLabel(e.target.value)} placeholder="Motivo (es. Ferie estive)" className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
            <button onClick={addClosure} disabled={!clFrom} className="brand-bg text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-40">Aggiungi</button>
          </div>
          <p className="text-xs text-stone-400 mt-2">Nei giorni di chiusura non sarà possibile prendere appuntamenti.</p>
        </div>
      </section>

{F.fidelity && (
      <section className="lc-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4"><Star size={16} className="brand-accent" /> Programma fedeltà</h3>
        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Come si guadagnano i punti</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => updLoyalty({ mode: "flat" })} className={`flex-1 text-left text-sm border rounded-lg px-3 py-2 transition ${loyalty.mode !== "perService" ? "brand-soft brand-border" : "bg-white border-stone-200"}`}><div className="font-medium">1 punto per servizio</div><div className="text-xs text-stone-400">Ogni servizio completato vale 1 punto.</div></button>
              <button onClick={() => updLoyalty({ mode: "perService" })} className={`flex-1 text-left text-sm border rounded-lg px-3 py-2 transition ${loyalty.mode === "perService" ? "brand-soft brand-border" : "bg-white border-stone-200"}`}><div className="font-medium">Punti per servizio</div><div className="text-xs text-stone-400">Imposti i punti di ogni servizio qui sotto.</div></button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={loyalty.fromSales} onChange={(e) => updLoyalty({ fromSales: e.target.checked })} className="w-4 h-4" /> Genera punti anche dalle vendite <span className="text-stone-400">(imposti i punti per prodotto nel Catalogo)</span></label>
          <div>
            <div className="flex items-center justify-between mb-2"><div className="text-xs font-medium text-stone-400 uppercase tracking-wide">Premi a punti</div><button onClick={addReward} className="text-sm brand-accent flex items-center gap-1"><Plus size={14} /> Aggiungi premio</button></div>
            <div className="space-y-2">{loyalty.rewards.length === 0 ? <p className="text-sm text-stone-400">Nessun premio. Aggiungine uno (es. 5 punti → omaggio, 10 punti → sconto 10%).</p> : loyalty.rewards.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <div className="flex items-center gap-1"><input type="number" min={1} step={1} value={r.points} onChange={(e) => editReward(r.id, { points: Math.max(1, Math.round(Number(e.target.value) || 1)) })} className="w-20 px-2 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-xs text-stone-400">pt</span></div>
                <input value={r.label} onChange={(e) => editReward(r.id, { label: e.target.value })} placeholder="Descrizione premio" className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
                <button onClick={() => delReward(r.id)} className="p-2 text-stone-400 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            ))}</div>
          </div>
          <p className="text-xs text-stone-400">I clienti accumulano punti senza limiti. Dalla scheda di ogni cliente puoi riscattare un premio: i punti usati vengono scalati automaticamente.</p>
        </div>
      </section>
      )}

      <section className="lc-card p-5">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap"><h3 className="font-semibold flex items-center gap-2"><Sparkles size={16} className="brand-accent" /> Servizi, durate e prezzi</h3><div className="flex items-center gap-2"><button onClick={() => printPriceList(config)} className="flex items-center gap-1 text-sm border border-stone-300 text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-50"><Printer size={15} /> Listino PDF</button><button onClick={addService} className="flex items-center gap-1 text-sm brand-bg px-3 py-1.5 rounded-lg"><Plus size={15} /> Aggiungi</button></div></div>
        <div className="space-y-2">{services.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2">
            <input value={s.name} onChange={(e) => editService(s.id, { name: e.target.value })} className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
            <div className="flex items-center gap-1"><input type="number" min={5} step={5} value={s.durationMin} onChange={(e) => editService(s.id, { durationMin: Math.max(5, Number(e.target.value) || 5) })} className="w-16 px-2 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" title="Durata" /><span className="text-xs text-stone-400">min</span></div>
            <div className="flex items-center gap-1"><input type="number" min={0} step={0.5} value={s.price != null ? s.price : ""} onChange={(e) => editService(s.id, { price: e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0) })} placeholder="—" className="w-20 px-2 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" title="Prezzo" /><span className="text-xs text-stone-400">€</span></div>
            {F.fidelity && loyalty.mode === "perService" ? <div className="flex items-center gap-1"><input type="number" min={0} step={1} value={s.points != null ? s.points : 1} onChange={(e) => editService(s.id, { points: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="w-14 px-2 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" title="Punti fedeltà" /><span className="text-xs text-stone-400">pt</span></div> : null}
            <button onClick={() => delService(s.id)} className="p-2 text-stone-400 hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        ))}</div>
      </section>

      <section className="lc-card p-5">
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold flex items-center gap-2"><Users size={16} className="brand-accent" /> Operatori {F.maxOperatori !== Infinity ? <span className="text-xs font-normal text-stone-400">· max {F.maxOperatori}</span> : null}</h3><button onClick={addStaff} disabled={staff.length >= F.maxOperatori} title={staff.length >= F.maxOperatori ? "Limite operatori raggiunto per questo piano" : ""} className="flex items-center gap-1 text-sm brand-bg px-3 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={15} /> Aggiungi</button></div>
        <div className="space-y-4">{staff.map((st) => <StaffEditor key={st.id} st={st} services={services} onEdit={(patch) => editStaff(st.id, patch)} onDelete={() => delStaff(st.id)} />)}</div>
      </section>

      {F.maxOperatori > 1 ? <OperatorAccounts staff={staff} /> : null}

      <ResetZone clients={clients} setClients={setClients} bookings={bookings} setBookings={setBookings} sales={sales} setSales={setSales} config={config} saveConfig={saveConfig} catalog={catalog} setCatalog={setCatalog} />

      <div className="text-center py-4 space-y-2">
        <img src={LUCENTIA_LOGO} alt="Lucentia" className="h-6 w-auto mx-auto opacity-70" />
        <div className="text-[11px] text-stone-300 flex items-center justify-center gap-1.5">Realizzato da <img src={MAKER_LOGO} alt="Office Solution" className="h-3.5 w-auto inline-block opacity-70" /></div>
      </div>
    </div>
  );
}

function ResetZone({ clients, setClients, bookings, setBookings, sales, setSales, config, saveConfig, catalog, setCatalog }) {
  const [sel, setSel] = useState(null);
  const [pw, setPw] = useState("");
  const [chk, setChk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const OPZ = {
    punti: { label: "Azzera punti fedeltà", desc: "Riporta a zero i punti fedeltà di tutti i clienti. Anagrafiche, appuntamenti e vendite restano invariati." },
    vendite: { label: "Azzera vendite e appuntamenti", desc: "Elimina tutti gli appuntamenti e le vendite. I clienti e i loro punti fedeltà attuali vengono mantenuti." },
    totale: { label: "Ripristino totale", desc: "Elimina clienti, operatori, appuntamenti, vendite, catalogo e fidelity. Restano solo i servizi e l'aspetto del salone." },
  };
  const apply = (tipo) => {
    if (tipo === "punti") {
      setClients((cs) => cs.map((c) => ({ ...c, bonusPoints: -clientPoints(c.code, bookings, sales, config, catalog), redeemedPoints: 0, redemptions: [] })));
    } else if (tipo === "vendite") {
      setClients((cs) => cs.map((c) => { const bal = clientPoints(c.code, bookings, sales, config, catalog) + (Number(c.bonusPoints) || 0) - (Number(c.redeemedPoints) || 0); return { ...c, bonusPoints: bal, redeemedPoints: 0, redemptions: [] }; }));
      setBookings([]); setSales([]);
    } else if (tipo === "totale") {
      saveConfig({ ...config, staff: [], loyalty: DEFAULT_LOYALTY });
      setClients([]); setBookings([]); setSales([]); setCatalog({ categories: [], products: [] });
    }
  };
  const esegui = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/verify-password", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) { setErr("Password non corretta."); setBusy(false); return; }
    } catch (e) { setErr("Errore di rete."); setBusy(false); return; }
    apply(sel); setBusy(false); setSel(null); setPw(""); setChk(false);
    alert("Ripristino eseguito.");
  };
  return (
    <section className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm">
      <h3 className="font-semibold flex items-center gap-2 mb-1 text-red-600"><AlertTriangle size={16} /> Zona ripristino</h3>
      <p className="text-sm text-stone-500 mb-3">Operazioni irreversibili. Richiedono la tua password.</p>
      <div className="space-y-2">
        {Object.keys(OPZ).map((k) => (
          <button key={k} onClick={() => { setSel(k); setPw(""); setChk(false); setErr(""); }} className={`w-full text-left border rounded-xl p-3 transition ${sel === k ? "border-red-300 bg-red-50" : "border-stone-200 hover:bg-stone-50"}`}>
            <div className="font-medium text-sm">{OPZ[k].label}</div>
            <div className="text-xs text-stone-400">{OPZ[k].desc}</div>
          </button>
        ))}
      </div>
      {sel ? (
        <div className="mt-3 border border-red-300 rounded-xl p-3 bg-red-50/40">
          <div className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1.5"><AlertTriangle size={14} /> "{OPZ[sel].label}" — operazione irreversibile</div>
          <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} placeholder="La tua password" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm mb-2 brand-ring" />
          <label className="flex items-start gap-2 text-sm text-stone-600 cursor-pointer mb-2"><input type="checkbox" checked={chk} onChange={(e) => setChk(e.target.checked)} className="w-4 h-4 mt-0.5" /> Confermo di voler procedere: l'operazione non è reversibile e i dati eliminati non potranno essere recuperati.</label>
          {err ? <p className="text-xs text-red-600 mb-2">{err}</p> : null}
          <div className="flex items-center gap-2">
            <button onClick={esegui} disabled={busy || !pw || !chk} className="text-sm font-medium text-white px-3 py-2 rounded-lg bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"><Trash2 size={14} /> {busy ? "Esecuzione…" : "Esegui ripristino"}</button>
            <button onClick={() => { setSel(null); setPw(""); setChk(false); setErr(""); }} className="text-sm text-stone-500 px-3 py-2">Annulla</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OperatorAccounts({ staff }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [resetFor, setResetFor] = useState(null);
  const [resetPw, setResetPw] = useState("");
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 3000); };

  const api = async (path, method, body) => {
    try {
      const r = await fetch("/api" + path, { method: method || "GET", credentials: "include", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const data = await r.json().catch(() => ({}));
      return { ok: r.ok, data };
    } catch (e) { return { ok: false, data: {} }; }
  };
  const load = async () => { setLoading(true); const r = await api("/operatori"); setItems(r.ok && r.data.items ? r.data.items : []); setLoading(false); };
  useEffect(() => { load(); }, []);

  const crea = async () => {
    if (!staffId) { flash("Scegli a quale operatore."); return; }
    if (!email.trim() || pw.length < 6) { flash("Email e password (min 6)."); return; }
    const r = await api("/operatori", "POST", { email: email.trim(), password: pw, staff_id: staffId });
    if (r.ok) { setEmail(""); setPw(""); setStaffId(""); flash("Accesso creato."); load(); }
    else flash(r.data.error || "Errore nella creazione.");
  };
  const reset = async (id) => { if (resetPw.length < 6) { flash("Password troppo corta."); return; } const r = await api(`/operatori/${id}`, "PATCH", { nuovaPassword: resetPw }); if (r.ok) { setResetFor(null); setResetPw(""); flash("Password aggiornata."); } else flash(r.data.error || "Errore."); };
  const elimina = async (o) => { if (!confirm(`Eliminare l'accesso ${o.email}?`)) return; const r = await api(`/operatori/${o.id}`, "DELETE"); if (r.ok) { flash("Accesso eliminato."); load(); } else flash(r.data.error || "Errore."); };
  const nameOf = (sid) => { const s = staff.find((x) => x.id === sid); return s ? s.name : "— (operatore rimosso)"; };

  return (
    <section className="lc-card p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-1"><KeyRound size={16} className="brand-accent" /> Accessi operatori</h3>
      <p className="text-sm text-stone-500 mb-3">Crea un accesso per ogni operatore: entrerà con le proprie credenziali e vedrà soltanto la propria agenda, in sola lettura.</p>
      {msg ? <div className="text-sm bg-stone-800 text-white rounded-lg px-3 py-2 inline-flex items-center gap-2 mb-3"><Check size={14} /> {msg}</div> : null}

      {loading ? <p className="text-sm text-stone-400">Caricamento…</p> : items.length === 0 ? <p className="text-sm text-stone-400 mb-3">Nessun accesso operatore creato.</p> : (
        <div className="space-y-2 mb-4">{items.map((o) => (
          <div key={o.id} className="border border-stone-200 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0"><div className="font-medium truncate">{nameOf(o.staff_id)}</div><div className="text-xs text-stone-400 truncate flex items-center gap-1"><Mail size={12} /> {o.email}</div></div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setResetFor(resetFor === o.id ? null : o.id); setResetPw(""); }} className="text-xs border border-stone-300 text-stone-600 px-2 py-1.5 rounded-lg inline-flex items-center gap-1 hover:bg-stone-50"><KeyRound size={13} /> Password</button>
                <button onClick={() => elimina(o)} className="text-xs border border-red-300 text-red-600 px-2 py-1.5 rounded-lg inline-flex items-center gap-1 hover:bg-red-50"><Trash2 size={13} /> Elimina</button>
              </div>
            </div>
            {resetFor === o.id ? (
              <div className="mt-2 flex items-center gap-2">
                <input value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder="Nuova password (min 6)" className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-sm brand-ring" />
                <button onClick={() => reset(o.id)} className="text-sm font-medium brand-bg px-3 py-1.5 rounded-lg">Salva</button>
                <button onClick={() => { setResetFor(null); setResetPw(""); }} className="text-stone-400"><X size={16} /></button>
              </div>
            ) : null}
          </div>
        ))}</div>
      )}

      <div className="border-t border-stone-100 pt-3">
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Nuovo accesso</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring"><option value="">Operatore…</option>{staff.map((s) => { const used = items.some((o) => o.staff_id === s.id); return <option key={s.id} value={s.id} disabled={used}>{s.name}{used ? " (già attivo)" : ""}</option>; })}</select>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email accesso" className="px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
          <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password (min 6)" className="px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
          <button onClick={crea} className="brand-bg text-sm font-medium px-3 py-2 rounded-lg inline-flex items-center justify-center gap-1.5"><Plus size={15} /> Crea accesso</button>
        </div>
      </div>
    </section>
  );
}

function StaffEditor({ st, services, onEdit, onDelete }) {
  const F = useMods();
  const toggleSvc = (id) => onEdit({ serviceIds: st.serviceIds.includes(id) ? st.serviceIds.filter((x) => x !== id) : [...st.serviceIds, id] });
  const setRanges = (day, ranges) => onEdit({ availability: { ...st.availability, [day]: ranges } });
  const addRange = (day) => setRanges(day, [...(st.availability[day] || []), [540, 780]]);
  const editRange = (day, i, idx, val) => { const r = (st.availability[day] || []).map((x) => x.slice()); r[i][idx] = strToMin(val); setRanges(day, r); };
  const delRange = (day, i) => setRanges(day, (st.availability[day] || []).filter((_, j) => j !== i));
  const off = st.off || [];
  const addOff = () => onEdit({ off: [...off, { id: uid(), from: todayStr(), to: todayStr() }] });
  const editOff = (id, patch) => onEdit({ off: off.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  const delOff = (id) => onEdit({ off: off.filter((o) => o.id !== id) });
  return (
    <div className="border border-stone-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3"><input value={st.name} onChange={(e) => onEdit({ name: e.target.value })} className="font-medium px-2 py-1.5 rounded-lg border border-stone-300 text-sm brand-ring" /><input value={st.role} onChange={(e) => onEdit({ role: e.target.value })} placeholder="Ruolo" className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-stone-300 text-stone-500 brand-ring" /><button onClick={onDelete} className="p-2 text-stone-400 hover:text-red-500"><Trash2 size={16} /></button></div>
      <div className="mb-3">
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Servizi eseguiti</div>
        <div className="flex flex-wrap gap-1.5">{services.map((s) => { const on = st.serviceIds.includes(s.id); return <button key={s.id} onClick={() => toggleSvc(s.id)} className={`px-2.5 py-1 rounded-lg text-xs border transition ${on ? "brand-bg border-transparent" : "bg-white border-stone-200 text-stone-500 brand-hover"}`}>{s.name}</button>; })}</div>
      </div>
      <div>
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Orari di disponibilità</div>
        <div className="space-y-1.5">{DAYS.map((dd) => { const k = dd.k, l = dd.l; const ranges = st.availability[k] || []; return (
          <div key={k} className="flex items-start gap-2 text-sm">
            <span className="w-9 pt-1.5 text-stone-500 font-medium">{l}</span>
            <div className="flex-1 flex flex-wrap items-center gap-2">
              {ranges.length === 0 ? <span className="text-xs text-stone-300 pt-1.5">Chiuso</span> : null}
              {ranges.map((r, i) => (
                <div key={i} className="flex items-center gap-1 bg-stone-50 rounded-lg px-1.5 py-1">
                  <input type="time" value={minToStr(r[0])} step={900} onChange={(e) => editRange(k, i, 0, e.target.value)} className="text-xs bg-transparent focus:outline-none" />
                  <span className="text-stone-300">–</span>
                  <input type="time" value={minToStr(r[1])} step={900} onChange={(e) => editRange(k, i, 1, e.target.value)} className="text-xs bg-transparent focus:outline-none" />
                  <button onClick={() => delRange(k, i)} className="text-stone-300 hover:text-red-500"><X size={13} /></button>
                </div>
              ))}
              <button onClick={() => addRange(k)} className="text-xs brand-accent hover:opacity-70 flex items-center gap-0.5 pt-1"><Plus size={13} /> fascia</button>
            </div>
          </div>
        ); })}</div>
      </div>
      <div className="mt-3">
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Assenze (malattia / ferie)</div>
        <div className="space-y-1.5">
          {off.length === 0 ? <span className="text-xs text-stone-300">Nessuna assenza programmata.</span> : null}
          {off.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-1.5 text-sm bg-stone-50 rounded-lg px-2 py-1.5">
              <span className="text-xs text-stone-400">dal</span><input type="date" value={o.from} onChange={(e) => editOff(o.id, { from: e.target.value })} className="text-xs bg-transparent focus:outline-none" />
              <span className="text-xs text-stone-400">al</span><input type="date" value={o.to} onChange={(e) => editOff(o.id, { to: e.target.value })} className="text-xs bg-transparent focus:outline-none" />
              <button onClick={() => delOff(o.id)} className="text-stone-300 hover:text-red-500 ml-auto"><X size={14} /></button>
            </div>
          ))}
        </div>
        <button onClick={addOff} className="text-xs brand-accent hover:opacity-70 flex items-center gap-0.5 mt-1.5"><Plus size={13} /> aggiungi assenza</button>
      </div>
    </div>
  );
}

function ShopView({ catalog, setCatalog, sales, setSales, clients, setClients, branding, loyalty, hidePartial, canAddClient, demo }) {
  const [tab, setTab] = useState("pos");
  const TABS = [["pos", "Cassa", ShoppingCart], ["load", "Carico", PackagePlus], ["catalog", "Catalogo", Boxes], ["history", "Storico", Receipt]];
  const lock = (node) => (
    <div>
      <div className="mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" /> In demo puoi vendere i prodotti già caricati, ma non modificare il magazzino.</div>
      <fieldset disabled style={{ border: 0, margin: 0, padding: 0, minInlineSize: "auto" }}>{node}</fieldset>
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 bg-stone-100/80 rounded-xl p-1 w-fit">
        {TABS.map((t) => { const k = t[0], l = t[1], Icon = t[2]; return (
          <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? "true" : undefined} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ${tab === k ? "bg-white shadow-[var(--lc-shadow-xs)] text-stone-900" : "text-stone-500 hover:text-stone-700"}`}><Icon size={15} /> {l}</button>
        ); })}
      </div>
      {tab === "pos" ? <PosTab catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} clients={clients} setClients={setClients} branding={branding} loyalty={loyalty} hidePartial={hidePartial} canAddClient={canAddClient} /> : null}
      {tab === "load" ? (demo ? lock(<LoadTab catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} />) : <LoadTab catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} />) : null}
      {tab === "catalog" ? (demo ? lock(<CatalogTab catalog={catalog} setCatalog={setCatalog} loyalty={loyalty} />) : <CatalogTab catalog={catalog} setCatalog={setCatalog} loyalty={loyalty} />) : null}
      {tab === "history" ? <SalesHistoryTab sales={sales} branding={branding} hidePartial={hidePartial} /> : null}
    </div>
  );
}

function PosTab({ catalog, setCatalog, sales, setSales, clients, setClients, branding, loyalty, hidePartial, canAddClient }) {
  const F = useMods();
  const cats = catalog.categories;
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState([]);
  const [client, setClient] = useState(null);
  const [lastSale, setLastSale] = useState(null);

  const products = catalog.products.filter((p) => (cat === "all" || (p.categoryId || "") === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const inCart = (pid, fid) => { const it = cart.find((x) => x.productId === pid && x.formatId === fid); return it ? it.qty : 0; };
  const add = (p, f) => {
    const remaining = (Number(f.stock) || 0) - inCart(p.id, f.id);
    if (remaining <= 0) return;
    setLastSale(null);
    setCart((c) => { const ex = c.find((x) => x.productId === p.id && x.formatId === f.id); if (ex) return c.map((x) => (x === ex ? { ...x, qty: x.qty + 1 } : x)); return [...c, { productId: p.id, formatId: f.id, name: p.name, label: f.label, price: Number(f.price) || 0, qty: 1 }]; });
  };
  const changeQty = (idx, delta) => setCart((c) => c.map((it, i) => { if (i !== idx) return it; const prod = catalog.products.find((p) => p.id === it.productId); const fmt = prod && prod.formats.find((f) => f.id === it.formatId); const max = fmt ? (Number(fmt.stock) || 0) : it.qty; return { ...it, qty: Math.min(max, Math.max(0, it.qty + delta)) }; }).filter((it) => it.qty > 0));
  const removeItem = (idx) => setCart((c) => c.filter((_, i) => i !== idx));
  const total = cartTotal(cart);
  const count = cart.reduce((a, it) => a + it.qty, 0);
  const salePoints = (loyalty && loyalty.fromSales) ? cart.reduce((a, it) => { const p = catalog.products.find((x) => x.id === it.productId); return a + ((p && p.points) || 0) * it.qty; }, 0) : 0;

  const confirm = (partial) => {
    if (!cart.length) return;
    for (const it of cart) { const prod = catalog.products.find((p) => p.id === it.productId); const fmt = prod && prod.formats.find((f) => f.id === it.formatId); if (!fmt || (Number(fmt.stock) || 0) < it.qty) { alert(`Giacenza insufficiente per ${it.name}.`); return; } }
    const sale = { id: uid(), ts: Date.now(), type: "sale", partial: !!partial, clientCode: client ? client.code : null, clientName: client ? (client.name || "") : "", items: cart.map((it) => ({ productId: it.productId, formatId: it.formatId, name: it.name, label: it.label, price: it.price, qty: it.qty })), total };
    setCatalog(applySaleToCatalog(catalog, cart));
    setSales([sale, ...sales]);
    setCart([]); setClient(null); setLastSale(sale);
  };

  const chip = (on) => `px-3 py-1.5 rounded-lg text-sm border transition ${on ? "brand-bg border-transparent" : "bg-white border-stone-200 text-stone-600 brand-hover"}`;

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      <div className="w-full sm:flex-1 sm:min-w-0 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setCat("all")} className={chip(cat === "all")}>Tutti</button>
          {cats.map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={chip(cat === c.id)}>{c.name}</button>)}
        </div>
        <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 bg-white brand-ring transition-colors hover:border-stone-400 focus-within:border-stone-400"><Search size={16} className="text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca prodotto" className="flex-1 text-sm focus:outline-none bg-transparent" /></div>
        {products.length === 0 ? (
          <div className="lc-card p-10 text-center">
            <div className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3"><Boxes size={20} className="text-stone-400" /></div>
            <p className="text-sm font-medium text-stone-600">Nessun prodotto</p>
            <p className="text-xs text-stone-400 mt-1">Aggiungilo dalla scheda Catalogo.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">{products.map((p, pi) => (
            <div key={p.id} className="lc-card lc-card-hover lc-fade-up p-3.5 flex flex-col" style={{ animationDelay: `${Math.min(pi * 35, 280)}ms` }}>
              <div className="font-semibold leading-tight text-stone-900">{p.name}</div>
              {p.description ? <div className="text-xs text-stone-400 mb-2.5 mt-0.5 leading-relaxed">{p.description}</div> : <div className="mb-2.5" />}
              <div className="space-y-1.5 mt-auto">{p.formats.map((f) => { const remaining = (Number(f.stock) || 0) - inCart(p.id, f.id); const out = remaining <= 0; return (
                <button key={f.id} onClick={() => add(p, f)} disabled={out} className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-sm transition ${out ? "border-stone-200 bg-stone-50 text-stone-300 cursor-not-allowed" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50 active:scale-[0.99]"}`}>
                  <span className="flex items-center gap-1.5 min-w-0"><Tag size={13} className={out ? "text-stone-300 shrink-0" : "brand-accent shrink-0"} /> <span className="truncate">{f.label}</span></span>
                  <span className="flex items-center gap-2 shrink-0"><span className="font-semibold text-stone-800">{eur(f.price)}</span><span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${out ? "bg-red-50 text-red-500" : "bg-stone-100 text-stone-500"}`}>{out ? "esaurito" : `${remaining} pz`}</span></span>
                </button>
              ); })}</div>
            </div>
          ))}</div>
        )}
      </div>

      <div className="w-full sm:w-80 sm:shrink-0 sm:sticky sm:top-20">
        <div className="lc-card p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3 text-stone-900 tracking-tight"><ShoppingCart size={16} className="brand-accent" /> Carrello {count ? <span className="text-xs font-normal text-stone-400">· {count} pz</span> : null}</h3>
          {lastSale && cart.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 mb-3">
              <div className="flex items-center gap-1.5 font-medium"><Check size={15} /> Vendita {lastSale.partial ? "parziale " : ""}registrata · {eur(lastSale.total)}</div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => printSale(lastSale, branding)} className="text-xs font-medium border border-green-300 text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-100 inline-flex items-center gap-1"><Printer size={13} /> Scontrino</button>
                <button onClick={() => setLastSale(null)} className="text-xs font-medium text-green-700 px-2.5 py-1.5 hover:underline">Nuova vendita</button>
              </div>
            </div>
          ) : null}
          {cart.length === 0 ? <div className="text-center py-8"><ShoppingCart size={26} className="mx-auto text-stone-300 mb-2" /><p className="text-sm text-stone-400">Tocca un prodotto per aggiungerlo.</p></div> : (
            <>
              <div>{cart.map((it, i) => (
                <div key={i} className="flex items-center gap-2 py-2 border-b border-stone-100 last:border-0">
                  <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{it.name}</div><div className="text-xs text-stone-400 truncate">{it.label} · {eur(it.price)}</div></div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => changeQty(i, -1)} className="w-7 h-7 rounded-lg border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 active:scale-90 transition"><Minus size={13} /></button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">{it.qty}</span>
                    <button onClick={() => changeQty(i, 1)} className="w-7 h-7 rounded-lg border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 active:scale-90 transition"><Plus size={13} /></button>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold tabular-nums">{eur(it.price * it.qty)}</div>
                  <button onClick={() => removeItem(i)} aria-label="Rimuovi" className="text-stone-300 hover:text-red-500 transition-colors"><X size={15} /></button>
                </div>
              ))}</div>
              <div className="border-t border-stone-200 pt-3 mt-2 space-y-3">
                <ClientAssign clients={clients} setClients={setClients} client={client} setClient={setClient} canAddClient={canAddClient} />
                <div className="flex items-baseline justify-between"><span className="text-sm font-medium text-stone-500">Importo</span><span className="text-2xl font-semibold tracking-tight tabular-nums text-stone-900">{eur(total)}</span></div>
                {F.fidelity && loyalty && loyalty.fromSales ? <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-1.5 text-stone-500"><Star size={14} className="brand-accent" /> Punti generati</span><span className="font-medium brand-accent">+{salePoints}{client ? "" : " (assegna un cliente)"}</span></div> : null}
                <div className={hidePartial ? "" : "grid grid-cols-2 gap-2"}>
                  <button onClick={() => confirm(false)} className="w-full brand-bg font-medium py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-[var(--lc-shadow-xs)] hover:shadow-[var(--lc-shadow-sm)]"><Check size={16} /> {hidePartial ? "Conferma vendita" : "Totale"}</button>
                  {!hidePartial ? <button onClick={() => confirm(true)} className="font-medium py-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-amber-300 text-amber-700 hover:bg-amber-50 transition"><Timer size={16} /> Parziale</button> : null}
                </div>
                {!hidePartial ? <p className="text-xs text-stone-400 leading-relaxed">"Totale" registra la vendita completa. "Parziale" la registra comunque (scaricando le giacenze) ma la segna come parziale nello storico.</p> : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientAssign({ clients, setClients, client, setClient, canAddClient }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [nn, setNn] = useState("");
  const [np, setNp] = useState("");
  const nq = q.replace(/\s/g, "");
  const matches = q ? clients.filter((c) => (c.name || "").toLowerCase().includes(q.toLowerCase()) || c.code.includes(nq) || (c.phone || "").replace(/\s/g, "").includes(nq) || (c.card || "").replace(/\s/g, "").toLowerCase().includes(nq.toLowerCase())).slice(0, 6) : [];
  const reset = () => { setOpen(false); setQ(""); setCreating(false); setNn(""); setNp(""); };
  const createClient = () => {
    if (!nn.trim()) return;
    if (canAddClient === false) { alert("Limite demo raggiunto: massimo 3 clienti."); return; }
    const code = generateCode(clients);
    const nc = { code, name: nn.trim(), email: "", phone: np.trim(), card: "", createdAt: Date.now() };
    setClients([...clients, nc]); setClient(nc); reset();
  };
  if (client) return (
    <div className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2 text-sm">
      <span className="flex items-center gap-1.5 min-w-0"><User size={14} className="text-stone-400 shrink-0" /> <span className="truncate">{client.name || "Cliente"} <span className="text-stone-400">#{client.code}</span></span></span>
      <button onClick={() => setClient(null)} className="text-stone-400 hover:text-red-500 shrink-0"><X size={16} /></button>
    </div>
  );
  return (
    <div>
      {!open ? <button onClick={() => setOpen(true)} className="w-full text-sm border border-dashed border-stone-300 text-stone-500 rounded-lg py-2 hover:bg-stone-50 flex items-center justify-center gap-1.5"><Plus size={14} /> Assegna cliente (facoltativo)</button> : (
        <div className="border border-stone-200 rounded-lg p-2">
          {!creating ? (
            <>
              <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-2 py-1.5 brand-ring mb-1"><Search size={14} className="text-stone-400" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, codice, cellulare o tessera" className="flex-1 text-sm focus:outline-none" /><button onClick={reset} className="text-stone-400"><X size={15} /></button></div>
              {matches.map((c) => <button key={c.code} onClick={() => { setClient(c); reset(); }} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-stone-50 text-sm flex justify-between gap-2"><span className="truncate">{c.name || "Senza nome"} <span className="text-stone-400">#{c.code}</span></span>{c.phone ? <span className="text-stone-400 text-xs shrink-0">{c.phone}</span> : null}</button>)}
              {q && matches.length === 0 ? <p className="text-xs text-stone-400 px-2 py-1.5">Nessun cliente trovato.</p> : null}
              <button onClick={() => { setCreating(true); setNn(q); }} className="w-full mt-1 text-sm brand-accent flex items-center justify-center gap-1.5 py-1.5 hover:bg-stone-50 rounded-md"><Plus size={14} /> Nuovo cliente</button>
            </>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-medium text-stone-400 uppercase tracking-wide">Nuovo cliente</div>
              <input autoFocus value={nn} onChange={(e) => setNn(e.target.value)} placeholder="Nome e cognome" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
              <input value={np} onChange={(e) => setNp(e.target.value)} placeholder="Telefono (facoltativo)" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
              <div className="flex gap-2"><button onClick={createClient} disabled={!nn.trim()} className="flex-1 brand-bg text-sm font-medium py-2 rounded-lg disabled:opacity-40">Crea e assegna</button><button onClick={() => setCreating(false)} className="text-sm text-stone-500 px-3 py-2 rounded-lg border border-stone-200">Indietro</button></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CatalogTab({ catalog, setCatalog, loyalty }) {
  const cats = catalog.categories;
  const setCats = (categories) => setCatalog({ ...catalog, categories });
  const setProds = (products) => setCatalog({ ...catalog, products });
  const [newCat, setNewCat] = useState("");
  const addCat = () => { const n = newCat.trim(); if (!n) return; setCats([...cats, { id: uid(), name: n }]); setNewCat(""); };
  const renameCat = (id, name) => setCats(cats.map((c) => (c.id === id ? { ...c, name } : c)));
  const delCat = (id) => { if (!confirm("Eliminare la categoria? I prodotti resteranno senza categoria.")) return; setCatalog({ ...catalog, categories: cats.filter((c) => c.id !== id), products: catalog.products.map((p) => (p.categoryId === id ? { ...p, categoryId: "" } : p)) }); };
  const addProduct = () => setProds([...catalog.products, { id: uid(), name: "Nuovo prodotto", description: "", categoryId: cats[0] ? cats[0].id : "", formats: [{ id: uid(), label: "Standard", price: 0, stock: 0 }] }]);
  const editProduct = (id, patch) => setProds(catalog.products.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const delProduct = (id) => { if (confirm("Eliminare questo prodotto?")) setProds(catalog.products.filter((p) => p.id !== id)); };

  const groups = [...cats, { id: "", name: "Senza categoria" }].map((c) => ({ cat: c, items: catalog.products.filter((p) => (p.categoryId || "") === c.id) })).filter((g) => g.items.length || g.cat.id);

  return (
    <div className="space-y-6">
      <section className="lc-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><Layers size={16} className="brand-accent" /> Categorie</h3>
        <div className="space-y-2">{cats.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <input value={c.name} onChange={(e) => renameCat(c.id, e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
            <span className="text-xs text-stone-400 w-16 text-right">{catalog.products.filter((p) => p.categoryId === c.id).length} prod.</span>
            <button onClick={() => delCat(c.id)} className="p-2 text-stone-400 hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        ))}</div>
        <div className="flex gap-2 mt-3"><input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCat()} placeholder="Nuova categoria" className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /><button onClick={addCat} className="brand-bg px-3 py-2 rounded-lg text-sm inline-flex items-center gap-1"><Plus size={15} /> Aggiungi</button></div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3"><h3 className="font-semibold flex items-center gap-2"><Package size={16} className="brand-accent" /> Prodotti e giacenze</h3><button onClick={addProduct} className="flex items-center gap-1 text-sm brand-bg px-3 py-1.5 rounded-lg"><Plus size={15} /> Aggiungi prodotto</button></div>
        {catalog.products.length === 0 ? <div className="lc-card p-10 text-center text-stone-400">Nessun prodotto. Aggiungine uno.</div> : groups.map((g) => (
          <div key={g.cat.id || "none"} className="mb-4">
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">{g.cat.name}</div>
            <div className="space-y-2">{g.items.map((p) => <ProductEditor key={p.id} product={p} categories={cats} loyalty={loyalty} onChange={(patch) => editProduct(p.id, patch)} onDelete={() => delProduct(p.id)} />)}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

function ProductEditor({ product, categories, loyalty, onChange, onDelete }) {
  const F = useMods();
  const [open, setOpen] = useState(false);
  const p = product;
  const setFormat = (fid, patch) => onChange({ formats: p.formats.map((f) => (f.id === fid ? { ...f, ...patch } : f)) });
  const addFormat = () => onChange({ formats: [...p.formats, { id: uid(), label: "Nuovo formato", price: 0, stock: 0 }] });
  const delFormat = (fid) => { if (p.formats.length <= 1) return; onChange({ formats: p.formats.filter((f) => f.id !== fid) }); };
  const totalStock = p.formats.reduce((a, f) => a + (Number(f.stock) || 0), 0);
  const prices = p.formats.map((f) => Number(f.price) || 0);
  const priceLabel = prices.length ? (Math.min(...prices) === Math.max(...prices) ? eur(prices[0]) : `${eur(Math.min(...prices))} – ${eur(Math.max(...prices))}`) : "";
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-3 text-left">
        <Package size={18} className="text-stone-400 shrink-0" />
        <div className="flex-1 min-w-0"><div className="font-medium truncate">{p.name}</div><div className="text-xs text-stone-400">{priceLabel} · {p.formats.length} format{p.formats.length === 1 ? "o" : "i"} · giacenza {totalStock} pz</div></div>
        <ChevronRight size={18} className={`text-stone-300 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open ? (
        <div className="px-3 pb-3 border-t border-stone-100 pt-3 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nome"><input value={p.name} onChange={(e) => onChange({ name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            <Field label="Categoria"><select value={p.categoryId || ""} onChange={(e) => onChange({ categoryId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring"><option value="">Senza categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          </div>
          <Field label="Descrizione"><input value={p.description || ""} onChange={(e) => onChange({ description: e.target.value })} placeholder="Breve descrizione" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          {F.fidelity && loyalty && loyalty.fromSales ? <Field label="Punti fedeltà per pezzo venduto"><div className="flex items-center gap-1"><input type="number" min={0} step={1} value={p.points != null ? p.points : 0} onChange={(e) => onChange({ points: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="w-24 px-3 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-xs text-stone-400">punti</span></div></Field> : null}
          <div>
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Formati · prezzo · giacenza</div>
            <div className="space-y-2">{p.formats.map((f) => (
              <div key={f.id} className="flex items-center gap-2">
                <input value={f.label} onChange={(e) => setFormat(f.id, { label: e.target.value })} placeholder="es. 300 ml" className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-stone-300 text-sm brand-ring" />
                <div className="flex items-center gap-1"><input type="number" min={0} step={0.5} value={f.price} onChange={(e) => setFormat(f.id, { price: Math.max(0, Number(e.target.value) || 0) })} className="w-20 px-2 py-1.5 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-xs text-stone-400">€</span></div>
                <div className="flex items-center gap-1"><input type="number" min={0} step={1} value={f.stock} onChange={(e) => setFormat(f.id, { stock: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="w-16 px-2 py-1.5 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-xs text-stone-400">pz</span></div>
                <button onClick={() => delFormat(f.id)} disabled={p.formats.length <= 1} className="p-1.5 text-stone-400 hover:text-red-500 disabled:opacity-30"><Trash2 size={15} /></button>
              </div>
            ))}</div>
            <button onClick={addFormat} className="text-xs brand-accent hover:opacity-70 flex items-center gap-0.5 mt-2"><Plus size={13} /> formato</button>
          </div>
          <button onClick={onDelete} className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 size={13} /> Elimina prodotto</button>
        </div>
      ) : null}
    </div>
  );
}

function SalesHistoryTab({ sales, branding, hidePartial }) {
  const [openId, setOpenId] = useState(null);
  const [flt, setFlt] = useState("all");
  const isLoad = (r) => r.type === "load";
  const visible = hidePartial ? sales.filter((r) => !r.partial) : sales;
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const onlySales = visible.filter((s) => !isLoad(s));
  const todaySales = onlySales.filter((s) => s.ts >= startToday.getTime());
  const todayTot = todaySales.reduce((a, s) => a + (s.total || 0), 0);
  const allTot = onlySales.reduce((a, s) => a + (s.total || 0), 0);
  const loadCount = visible.filter(isLoad).length;
  const records = visible.filter((r) => flt === "all" || (flt === "sales" && !isLoad(r)) || (flt === "loads" && isLoad(r)));
  const chip = (on) => `px-3 py-1.5 rounded-lg text-sm border transition ${on ? "brand-bg border-transparent" : "bg-white border-stone-200 text-stone-600 brand-hover"}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="lc-card p-4"><div className="text-xs text-stone-400 uppercase tracking-wide">Incasso oggi</div><div className="text-xl font-semibold">{eur(todayTot)}</div><div className="text-xs text-stone-400">{todaySales.length} vendite</div></div>
        <div className="lc-card p-4"><div className="text-xs text-stone-400 uppercase tracking-wide">Incasso totale</div><div className="text-xl font-semibold">{eur(allTot)}</div><div className="text-xs text-stone-400">{onlySales.length} vendite · {loadCount} carichi</div></div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFlt("all")} className={chip(flt === "all")}>Tutti</button>
        <button onClick={() => setFlt("sales")} className={chip(flt === "sales")}>Vendite</button>
        <button onClick={() => setFlt("loads")} className={chip(flt === "loads")}>Carichi</button>
      </div>
      {records.length === 0 ? <div className="lc-card p-10 text-center text-stone-400">Nessun movimento.</div> : (
        <div className="space-y-2">{records.map((s) => { const open = openId === s.id; const load = isLoad(s); const pieces = s.items.reduce((a, it) => a + it.qty, 0); return (
          <div key={s.id} className="bg-white rounded-xl border border-stone-200 shadow-sm">
            <button onClick={() => setOpenId(open ? null : s.id)} className="w-full flex items-center gap-3 p-3 text-left">
              {load ? <PackagePlus size={18} className="text-emerald-500 shrink-0" /> : <Receipt size={18} className="text-stone-400 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2">{load ? <span>Carico magazzino</span> : <span>{eur(s.total)}</span>}<span className="text-xs text-stone-400 font-normal">· {pieces} pz</span>{s.partial ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 inline-flex items-center gap-0.5"><Timer size={10} /> Parziale</span> : null}{load ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Carico</span> : null}</div>
                <div className="text-xs text-stone-400 truncate">{fmtDateTime(s.ts)}{load ? "" : (s.clientName ? ` · ${s.clientName}` : " · Cliente occasionale")}</div>
              </div>
              <ChevronRight size={18} className={`text-stone-300 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
            </button>
            {open ? (
              <div className="px-3 pb-3 border-t border-stone-100 pt-2">
                <div className="space-y-1 text-sm">{s.items.map((it, i) => (<div key={i} className="flex justify-between gap-2"><span className="text-stone-600">{load ? `+${it.qty}` : `${it.qty}×`} {it.name}{it.label ? ` (${it.label})` : ""}</span>{load ? <span className="text-emerald-600 shrink-0">+{it.qty} pz</span> : <span className="text-stone-500 shrink-0">{eur(it.price * it.qty)}</span>}</div>))}</div>
                {!load ? <button onClick={() => printSale(s, branding)} className="mt-3 text-xs font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Printer size={14} /> Stampa scontrino</button> : null}
              </div>
            ) : null}
          </div>
        ); })}</div>
      )}
    </div>
  );
}

function LoadTab({ catalog, setCatalog, sales, setSales }) {
  const cats = catalog.categories;
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [done, setDone] = useState(null);

  const products = catalog.products.filter((p) => (cat === "all" || (p.categoryId || "") === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const inList = (pid, fid) => { const it = list.find((x) => x.productId === pid && x.formatId === fid); return it ? it.qty : 0; };
  const add = (p, f) => {
    setDone(null);
    setList((c) => { const ex = c.find((x) => x.productId === p.id && x.formatId === f.id); if (ex) return c.map((x) => (x === ex ? { ...x, qty: x.qty + 1 } : x)); return [...c, { productId: p.id, formatId: f.id, name: p.name, label: f.label, qty: 1 }]; });
  };
  const changeQty = (idx, delta) => setList((c) => c.map((it, i) => (i === idx ? { ...it, qty: Math.max(0, it.qty + delta) } : it)).filter((it) => it.qty > 0));
  const setQtyDirect = (idx, val) => setList((c) => c.map((it, i) => (i === idx ? { ...it, qty: Math.max(0, Math.round(Number(val) || 0)) } : it)).filter((it) => it.qty > 0));
  const removeItem = (idx) => setList((c) => c.filter((_, i) => i !== idx));
  const totalPieces = list.reduce((a, it) => a + it.qty, 0);

  const confirm = () => {
    if (!list.length) return;
    const rec = { id: uid(), ts: Date.now(), type: "load", items: list.map((it) => ({ productId: it.productId, formatId: it.formatId, name: it.name, label: it.label, qty: it.qty })), total: 0 };
    setCatalog(applyLoadToCatalog(catalog, list));
    setSales([rec, ...sales]);
    setList([]); setDone(rec);
  };

  const chip = (on) => `px-3 py-1.5 rounded-lg text-sm border transition ${on ? "brand-bg border-transparent" : "bg-white border-stone-200 text-stone-600 brand-hover"}`;

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      <div className="w-full sm:flex-1 sm:min-w-0 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setCat("all")} className={chip(cat === "all")}>Tutti</button>
          {cats.map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={chip(cat === c.id)}>{c.name}</button>)}
        </div>
        <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 bg-white brand-ring"><Search size={16} className="text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca prodotto da rifornire" className="flex-1 text-sm focus:outline-none" /></div>
        {products.length === 0 ? <div className="lc-card p-10 text-center text-stone-400">Nessun prodotto. Aggiungilo dalla scheda Catalogo.</div> : (
          <div className="grid sm:grid-cols-2 gap-3">{products.map((p) => (
            <div key={p.id} className="lc-card p-3">
              <div className="font-medium leading-tight">{p.name}</div>
              {p.description ? <div className="text-xs text-stone-400 mb-2 mt-0.5">{p.description}</div> : <div className="mb-2" />}
              <div className="space-y-1.5">{p.formats.map((f) => { const added = inList(p.id, f.id); return (
                <button key={f.id} onClick={() => add(p, f)} className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-stone-200 text-sm transition brand-hover">
                  <span className="flex items-center gap-1.5 min-w-0"><Tag size={13} className="brand-accent shrink-0" /> <span className="truncate">{f.label}</span></span>
                  <span className="flex items-center gap-2 shrink-0"><span className="text-xs text-stone-400">giac. {Number(f.stock) || 0}{added ? ` +${added}` : ""}</span><PackagePlus size={15} className="brand-accent" /></span>
                </button>
              ); })}</div>
            </div>
          ))}</div>
        )}
      </div>

      <div className="w-full sm:w-80 sm:shrink-0 sm:sticky sm:top-20">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><PackagePlus size={16} className="brand-accent" /> Carico magazzino {totalPieces ? <span className="text-xs font-normal text-stone-400">· {totalPieces} pz</span> : null}</h3>
          {done && list.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 mb-3">
              <div className="flex items-center gap-1.5 font-medium"><Check size={15} /> Carico registrato · {done.items.reduce((a, it) => a + it.qty, 0)} pz</div>
              <button onClick={() => setDone(null)} className="text-xs font-medium text-green-700 mt-1 hover:underline">Nuovo carico</button>
            </div>
          ) : null}
          {list.length === 0 ? <p className="text-sm text-stone-400 text-center py-6">Tocca un prodotto per aggiungerlo al carico.</p> : (
            <>
              <div>{list.map((it, i) => (
                <div key={i} className="flex items-center gap-2 py-2 border-b border-stone-100 last:border-0">
                  <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{it.name}</div><div className="text-xs text-stone-400">{it.label}</div></div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => changeQty(i, -1)} className="w-6 h-6 rounded-md border border-stone-300 flex items-center justify-center text-stone-500 hover:bg-stone-50"><Minus size={13} /></button>
                    <input value={it.qty} onChange={(e) => setQtyDirect(i, e.target.value)} className="w-10 text-center text-sm font-medium border border-stone-200 rounded-md py-0.5 brand-ring" />
                    <button onClick={() => changeQty(i, 1)} className="w-6 h-6 rounded-md border border-stone-300 flex items-center justify-center text-stone-500 hover:bg-stone-50"><Plus size={13} /></button>
                  </div>
                  <button onClick={() => removeItem(i)} className="text-stone-300 hover:text-red-500"><X size={15} /></button>
                </div>
              ))}</div>
              <div className="border-t border-stone-200 pt-3 mt-2 space-y-3">
                <div className="flex items-center justify-between font-semibold"><span>Pezzi totali</span><span className="text-lg">{totalPieces}</span></div>
                <button onClick={confirm} className="w-full brand-bg font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"><PackagePlus size={16} /> Registra carico</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
