// ============================================================================
// CRUSCOTTO SETTIMANALE e COSTO DEL VENDUTO: modulo puro (niente React),
// usato dalle Statistiche e provato dai test.
//
// · cruscottoSettimana(config, bookings, sales, clients, lunedi): per ogni
//   giorno della settimana appuntamenti, incassi, no-show; per ogni operatore
//   ore occupate su ore disponibili (occupazione %), appuntamenti e incasso
//   dei servizi; clienti nuovi (prima visita in settimana) contro abituali;
//   e il confronto con la settimana prima.
// · costoDelVenduto(sales, catalog, da, a): ricavo, costo e margine dei
//   prodotti venduti nel periodo, per prodotto. Il costo è quello scritto
//   sulla riga di vendita (fissato al momento della vendita) o, per le
//   vendite più vecchie, il costo attuale del formato.
// ============================================================================
import { impegniBooking, risorsaAssente, salonechiuso, weekdayOf } from "../../orari.js";

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const spostaGiorni = (s, n) => { const [y, m, d] = String(s).split("-").map(Number); const x = new Date(y, m - 1, d + n); return iso(x); };
// Il lunedì della settimana che contiene `data`.
export function lunediDi(data) { const wd = weekdayOf(data); return spostaGiorni(data, wd === 0 ? -6 : 1 - wd); }
export const giorniSettimana = (lunedi) => Array.from({ length: 7 }, (_, i) => spostaGiorni(lunedi, i));
const n2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const dataDiTs = (ts) => iso(new Date(ts));

export const prezzoServizi = (b, config) => (b.amount != null && b.amount !== "" ? n2(b.amount) : n2((b.serviceIds || []).reduce((a, id) => { const s = ((config && config.services) || []).find((x) => x.id === id); return a + ((s && Number(s.price)) || 0); }, 0)));
const attivo = (b) => b && b.status !== "cancelled";
const svolto = (b) => b && (b.status === "done" || b.status === "partial");

// Minuti di lavoro previsti per un operatore in un giorno (orari, ferie, chiusure).
export function minutiDisponibili(config, st, data) {
  if (!st || salonechiuso(config, data) || risorsaAssente(st, data)) return 0;
  const fasce = (st.availability && st.availability[weekdayOf(data)]) || [];
  return fasce.reduce((a, f) => a + Math.max(0, (Number(f[1]) || 0) - (Number(f[0]) || 0)), 0);
}
// Minuti in cui un operatore è impegnato in un elenco di appuntamenti (fasi contate, pose escluse, sovrapposizioni fuse).
export function minutiOccupati(bookings, staffId) {
  const per = {};
  for (const b of bookings) for (const i of impegniBooking(b)) if (i.tipo === "operatore" && i.risorsaId === staffId) (per[b.date] || (per[b.date] = [])).push([i.from, i.to]);
  let tot = 0;
  for (const d of Object.keys(per)) {
    const int = per[d].sort((x, y) => x[0] - y[0]); let cur = null;
    for (const [f, t] of int) { if (!cur || f > cur[1]) { if (cur) tot += cur[1] - cur[0]; cur = [f, t]; } else cur[1] = Math.max(cur[1], t); }
    if (cur) tot += cur[1] - cur[0];
  }
  return tot;
}

function sintesi(config, bookings, sales, clients, giorni) {
  const da = giorni[0], a = giorni[giorni.length - 1];
  const inSett = bookings.filter((b) => b && b.date >= da && b.date <= a);
  const attivi = inSett.filter(attivo);
  const vendite = (sales || []).filter((s) => s && s.type === "sale" && s.ts && dataDiTs(s.ts) >= da && dataDiTs(s.ts) <= a);
  // prima visita di ogni cliente = la data del suo primo appuntamento non annullato (o la sua scheda)
  const prima = {};
  for (const b of bookings) if (attivo(b) && b.clientCode && (!prima[b.clientCode] || b.date < prima[b.clientCode])) prima[b.clientCode] = b.date;
  const codici = [...new Set(attivi.map((b) => b.clientCode).filter(Boolean))];
  const nuovi = codici.filter((c) => prima[c] >= da && prima[c] <= a);
  const perGiorno = giorni.map((g) => {
    const bg = attivi.filter((b) => b.date === g);
    const vg = vendite.filter((s) => dataDiTs(s.ts) === g);
    return { data: g, appuntamenti: bg.length, svolti: bg.filter(svolto).length, noshow: bg.filter((b) => b.status === "noshow").length, annullati: inSett.filter((b) => b.date === g && b.status === "cancelled").length, incassoServizi: n2(bg.filter(svolto).reduce((x, b) => x + prezzoServizi(b, config), 0)), incassoProdotti: n2(vg.reduce((x, s) => x + (Number(s.total) || 0), 0)), chiuso: salonechiuso(config, g) };
  });
  const perOperatore = ((config && config.staff) || []).map((st) => {
    const miei = attivi.filter((b) => impegniBooking(b).some((i) => i.tipo === "operatore" && i.risorsaId === st.id));
    const disp = giorni.reduce((x, g) => x + minutiDisponibili(config, st, g), 0);
    const occ = minutiOccupati(miei.filter((b) => b.status !== "noshow"), st.id);
    return { id: st.id, nome: st.name, appuntamenti: miei.length, svolti: miei.filter(svolto).length, noshow: miei.filter((b) => b.status === "noshow").length, minutiOccupati: occ, minutiDisponibili: disp, occupazione: disp ? Math.min(100, Math.round((occ / disp) * 100)) : null, incassoServizi: n2(miei.filter(svolto).filter((b) => b.staffId === st.id).reduce((x, b) => x + prezzoServizi(b, config), 0)) };
  });
  const tot = {
    appuntamenti: attivi.length, svolti: attivi.filter(svolto).length, noshow: attivi.filter((b) => b.status === "noshow").length, annullati: inSett.filter((b) => b.status === "cancelled").length,
    online: attivi.filter((b) => b.fromOnline).length,
    incassoServizi: n2(perGiorno.reduce((x, g) => x + g.incassoServizi, 0)), incassoProdotti: n2(perGiorno.reduce((x, g) => x + g.incassoProdotti, 0)),
    clienti: codici.length, nuovi: nuovi.length, abituali: codici.length - nuovi.length,
    minutiOccupati: perOperatore.reduce((x, o) => x + o.minutiOccupati, 0), minutiDisponibili: perOperatore.reduce((x, o) => x + o.minutiDisponibili, 0),
  };
  tot.incasso = n2(tot.incassoServizi + tot.incassoProdotti);
  tot.occupazione = tot.minutiDisponibili ? Math.min(100, Math.round((tot.minutiOccupati / tot.minutiDisponibili) * 100)) : null;
  tot.tassoNoshow = tot.appuntamenti ? Math.round((tot.noshow / tot.appuntamenti) * 100) : 0;
  return { da, a, perGiorno, perOperatore, tot };
}

export function cruscottoSettimana(config, bookings, sales, clients, lunedi) {
  const l = lunediDi(lunedi || iso(new Date()));
  const questa = sintesi(config, bookings || [], sales || [], clients || [], giorniSettimana(l));
  const prima = sintesi(config, bookings || [], sales || [], clients || [], giorniSettimana(spostaGiorni(l, -7)));
  const delta = {};
  for (const k of ["appuntamenti", "svolti", "noshow", "incasso", "incassoServizi", "incassoProdotti", "clienti", "nuovi", "occupazione"]) delta[k] = questa.tot[k] != null && prima.tot[k] != null ? n2(questa.tot[k] - prima.tot[k]) : null;
  return { lunedi: l, ...questa, precedente: prima.tot, delta };
}

// ---- costo del venduto ---------------------------------------------------------
export function costoDelVenduto(sales, catalog, da, a) {
  const prodotti = (catalog && catalog.products) || [];
  const per = {};
  let senzaCosto = 0;
  for (const s of sales || []) {
    if (!s || s.type !== "sale" || !s.ts) continue;
    const d = dataDiTs(s.ts); if ((da && d < da) || (a && d > a)) continue;
    for (const it of s.items || []) {
      if (!it.productId) continue;
      const p = prodotti.find((x) => x.id === it.productId); const f = p && (p.formats || []).find((x) => x.id === it.formatId);
      const costoU = it.costo != null && it.costo !== "" ? Number(it.costo) : (f && f.costo != null && f.costo !== "" ? Number(f.costo) : null);
      const qty = Number(it.qty) || 0, ricavo = n2((Number(it.price) || 0) * qty);
      const k = it.productId;
      if (!per[k]) per[k] = { productId: k, nome: (p && p.name) || it.name || "—", qta: 0, ricavo: 0, costo: 0, senzaCosto: 0 };
      per[k].qta += qty; per[k].ricavo = n2(per[k].ricavo + ricavo);
      if (costoU == null) { per[k].senzaCosto += qty; senzaCosto += qty; } else per[k].costo = n2(per[k].costo + costoU * qty);
    }
  }
  const righe = Object.values(per).map((r) => ({ ...r, margine: n2(r.ricavo - r.costo), marginePct: r.ricavo ? Math.round(((r.ricavo - r.costo) / r.ricavo) * 100) : null })).sort((x, y) => y.ricavo - x.ricavo);
  const ricavo = n2(righe.reduce((x, r) => x + r.ricavo, 0)), costo = n2(righe.reduce((x, r) => x + r.costo, 0));
  return { righe, ricavo, costo, margine: n2(ricavo - costo), marginePct: ricavo ? Math.round(((ricavo - costo) / ricavo) * 100) : null, senzaCosto };
}
