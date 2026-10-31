// ============================================================================
// Dati di esempio: il seme della demo pubblica e il contenuto di un salone
// appena azzerato. Spostati qui tali e quali dalla vecchia API monolitica.
// ============================================================================
import { pad2 } from "./util.js";

export function demoSeed() {
  const W = { 1: [[540, 780], [840, 1080]], 2: [[540, 780], [840, 1080]], 3: [[540, 780], [840, 1080]], 4: [[540, 780], [840, 1080]], 5: [[540, 780], [840, 1080]], 6: [[540, 780]] };
  const services = [
    { id: "s1", name: "Taglio donna", durationMin: 45, price: 25 },
    { id: "s2", name: "Piega", durationMin: 30, price: 18 },
    { id: "s3", name: "Colore", durationMin: 90, price: 45 },
    { id: "s4", name: "Taglio uomo", durationMin: 30, price: 18 },
    { id: "s5", name: "Manicure", durationMin: 45, price: 20 },
    { id: "s6", name: "Pulizia viso", durationMin: 50, price: 35 },
  ];
  const staff = [
    { id: "a1", name: "Giulia", role: "Parrucchiera", serviceIds: ["s1", "s2", "s3", "s4"], availability: W },
    { id: "a2", name: "Sara", role: "Estetista", serviceIds: ["s5", "s6"], availability: W },
  ];
  const branding = { name: "Salone Demo", tagline: "Versione dimostrativa", logo: null, primary: "#e11d48", phone: "", email: "", address: "" };
  const config = { services, staff, branding, cancelHours: 6, closures: [] };
  const catalog = { categories: [{ id: "c-cap", name: "Capelli" }, { id: "c-viso", name: "Viso" }, { id: "c-corpo", name: "Corpo" }], products: [
    { id: "p1", name: "Shampoo idratante", description: "Per capelli secchi", categoryId: "c-cap", formats: [{ id: "f1", label: "300 ml", price: 12.5, stock: 8 }] },
    { id: "p2", name: "Maschera nutriente", description: "Trattamento settimanale", categoryId: "c-cap", formats: [{ id: "f1", label: "250 ml", price: 18, stock: 5 }] },
    { id: "p3", name: "Crema viso anti-age", description: "Uso quotidiano", categoryId: "c-viso", formats: [{ id: "f1", label: "50 ml", price: 34, stock: 6 }] },
    { id: "p4", name: "Olio corpo", description: "Mandorle dolci", categoryId: "c-corpo", formats: [{ id: "f1", label: "100 ml", price: 15, stock: 4 }] },
  ] };

  const now = Date.now(); const DAY = 864e5;
  const d = (off) => { const x = new Date(); x.setDate(x.getDate() + off); return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`; };
  const clients = [
    { seed: true, code: "10001", name: "Maria Bianchi", firstName: "Maria", lastName: "Bianchi", phone: "340 111 2233", email: "maria.bianchi@email.it", card: "TS1001", allergies: "Allergia all'ammoniaca presente in alcune tinte", conditions: "Cuoio capelluto sensibile", notes: "Preferisce toni freddi", bonusPoints: 20, packages: [{ id: "pk1", serviceId: "s3", total: 5, used: 2, price: 200, createdAt: now - 70 * DAY }], createdAt: now - 120 * DAY },
    { seed: true, code: "10002", name: "Giulia Verdi", firstName: "Giulia", lastName: "Verdi", phone: "347 222 3344", email: "", allergies: "Lattice", conditions: "", notes: "", createdAt: now - 90 * DAY },
    { seed: true, code: "10003", name: "Anna Russo", firstName: "Anna", lastName: "Russo", phone: "333 444 5566", email: "", allergies: "", conditions: "", notes: "Preferisce il sabato mattina", packages: [{ id: "pk2", serviceId: "s5", total: 5, used: 1, price: 90, createdAt: now - 40 * DAY }], createdAt: now - 60 * DAY },
    { seed: true, code: "10004", name: "Laura Costa", firstName: "Laura", lastName: "Costa", phone: "320 555 6677", email: "laura.costa@email.it", createdAt: now - 30 * DAY },
  ];
  const bk = (off, startMin, dur, svc, staffId, clientCode, clientName, status, amount) => ({ seed: true, id: "bk-" + svc + "-" + off + "-" + startMin, date: d(off), startMin, endMin: startMin + dur, serviceIds: [svc], staffId, clientCode, clientName, status, amount: amount == null ? undefined : amount, createdAt: now });
  const bookings = [
    bk(-28, 540, 90, "s3", "a1", "10001", "Maria Bianchi", "done", 45),
    bk(-14, 600, 45, "s1", "a1", "10001", "Maria Bianchi", "done", 25),
    bk(-10, 660, 30, "s2", "a1", "10002", "Giulia Verdi", "done", 18),
    bk(-7, 900, 45, "s5", "a2", "10003", "Anna Russo", "done", 20),
    bk(-4, 990, 30, "s4", "a1", "10004", "Laura Costa", "done", 18),
    bk(-3, 930, 50, "s6", "a2", "10002", "Giulia Verdi", "done", 35),
    bk(0, 570, 30, "s2", "a1", "10001", "Maria Bianchi", undefined, null),
    bk(1, 600, 45, "s5", "a2", "10003", "Anna Russo", undefined, null),
    bk(2, 960, 45, "s1", "a1", "10004", "Laura Costa", undefined, null),
    bk(3, 900, 50, "s6", "a2", "10002", "Giulia Verdi", undefined, null),
    bk(5, 540, 90, "s3", "a1", "10001", "Maria Bianchi", undefined, null),
  ];
  const vouchers = [
    { seed: true, id: "v1", code: "BN-DEMO01", tipo: "valore", descrizione: "Buono compleanno", prezzo: 50, creato: now - 20 * DAY, stato: "assegnato", clienteCode: "10002", clienteNome: "Giulia Verdi", riscattato: now - 18 * DAY, usi: [{ at: now - 12 * DAY, importo: 20 }], importo: 50, residuo: 30 },
    { seed: true, id: "v2", code: "BN-DEMO02", tipo: "valore", descrizione: "Buono regalo", prezzo: 30, creato: now - 3 * DAY, stato: "attivo", clienteCode: null, clienteNome: null, riscattato: null, usi: [], importo: 30, residuo: 30 },
    { seed: true, id: "v3", code: "BN-DEMO03", tipo: "pacchetto", descrizione: "Pacchetto colore", prezzo: 180, creato: now - 1 * DAY, stato: "attivo", clienteCode: null, clienteNome: null, riscattato: null, usi: [], serviceId: "s3", sedute: 5 },
  ];
  const sales = [
    { seed: true, id: "sl1", ts: now - 9 * DAY, type: "sale", partial: false, clientCode: "10001", clientName: "Maria Bianchi", items: [{ productId: "p1", formatId: "f1", name: "Shampoo idratante", label: "300 ml", price: 12.5, qty: 1 }], total: 12.5 },
    { seed: true, id: "sl2", ts: now - 5 * DAY, type: "sale", partial: false, clientCode: null, clientName: "", items: [{ productId: "p3", formatId: "f1", name: "Crema viso anti-age", label: "50 ml", price: 34, qty: 1 }], total: 34 },
    { seed: true, id: "sl3", ts: now - 2 * DAY, type: "sale", partial: false, clientCode: "10003", clientName: "Anna Russo", items: [{ productId: "p4", formatId: "f1", name: "Olio corpo", label: "100 ml", price: 15, qty: 2 }], total: 30 },
  ];
  return { config, catalog, clients, bookings, vouchers, sales };
}
// Contenuto delle collezioni di un salone appena azzerato: nessun servizio,
// nessun operatore, nessun dato di esempio. Le chiavi di "config" vanno scritte
// tutte esplicitamente, perché quelle mancanti verrebbero riempite lato app dai
// valori di esempio di DEFAULT_CONFIG.
export function saloneVuoto(denominazione) {
  return {
    config: {
      services: [],
      staff: [],
      branding: { name: String(denominazione || ""), tagline: "Gestionale salone", logo: null, primary: "var(--lc-accent)", phone: "", email: "", address: "" },
      cancelHours: 6,
      loyalty: { mode: "flat", fromSales: false, rewards: [] },
      closures: [],
    },
    bookings: [],
    clients: [],
    catalog: { categories: [], products: [] },
    sales: [],
    vouchers: [],
    eventi: [],
  };
}
