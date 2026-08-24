// ============================================================================
// Modello delle risorse e assegnazione degli impegni.
//
// Un servizio non è più "una durata su un operatore": è una sequenza di
// impegni di risorse. Con questa forma si descrivono tutti i casi del salone:
//
//   Colore (90')      operatore posto 1: 0→10 e 50→90
//                     (tra i 10 e i 50 minuti la ragazza è libera: posa)
//   Lampada (60')     solo cabina lampada 0→60, nessun operatore
//   Spa (180')        operatore posto 1: 0→60, operatore posto 2: 170→180,
//                     cabina spa 0→180
//
// Questo modulo è condiviso fra l'app del salone (prenotazione in negozio) e
// l'API (prenotazione online): la logica degli orari deve essere una sola.
// Sono funzioni pure, senza React e senza accesso al database.
// ============================================================================

export const PASSO_MIN = 15;

// ---- Utilità di base -------------------------------------------------------
export function inRange(date, from, to) {
  const lo = from || to, hi = to || from;
  if (!lo) return false;
  return date >= lo && date <= hi;
}
export function weekdayOf(dateStr) {
  const p = String(dateStr).split("-").map(Number);
  return new Date(p[0], (p[1] || 1) - 1, p[2] || 1).getDay();
}
// Ferie / assenze di un operatore (vale anche per le cabine: stessa forma).
export function risorsaAssente(r, date) {
  return Array.isArray(r && r.off) && r.off.some((x) => inRange(date, x.from, x.to));
}
export function salonechiuso(config, dateStr) {
  return ((config && config.closures) || []).some((r) => inRange(dateStr, r.from, r.to));
}
const sovrappone = (a1, a2, b1, b2) => a1 < b2 && a2 > b1;

// ---- Servizi: dalla configurazione alla sequenza di impegni ----------------
// Un servizio senza `impegni` si comporta esattamente come prima: un solo
// operatore occupato per tutta la durata. Così i saloni già attivi non
// cambiano di una virgola finché non toccano nulla.
export function impegniServizio(svc) {
  if (!svc) return [];
  const durata = Math.max(0, Number(svc.durationMin) || 0);
  const grezzi = Array.isArray(svc.impegni) ? svc.impegni : null;
  if (!grezzi || !grezzi.length) {
    const base = durata > 0 ? [{ tipo: "operatore", posto: 1, da: 0, durata }] : [];
    // Una cabina indicata sul servizio (senza sequenza dettagliata) resta
    // occupata per tutto il servizio.
    if (svc.cabinaId && durata > 0) base.push({ tipo: "cabina", cabinaId: svc.cabinaId, da: 0, durata });
    return base;
  }
  return grezzi
    .map((s) => ({
      tipo: s.tipo === "cabina" ? "cabina" : "operatore",
      posto: s.tipo === "cabina" ? null : Math.max(1, Number(s.posto) || 1),
      cabinaId: s.tipo === "cabina" ? (s.cabinaId || svc.cabinaId || null) : null,
      da: Math.max(0, Number(s.da) || 0),
      durata: Math.max(0, Number(s.durata) || 0),
    }))
    .filter((s) => s.durata > 0);
}

// Durata complessiva di un servizio: il campo `durationMin` resta la verità
// (è quello che il salone imposta e che finisce su listini e statistiche), ma
// se la sequenza sfora si allunga di conseguenza.
export function durataServizio(svc) {
  const dichiarata = Math.max(0, Number(svc && svc.durationMin) || 0);
  const fine = impegniServizio(svc).reduce((m, s) => Math.max(m, s.da + s.durata), 0);
  return Math.max(dichiarata, fine);
}

// Più servizi nello stesso appuntamento si incolonnano uno dopo l'altro.
// Il posto 1 resta lo stesso operatore per tutti, com'è sempre stato.
export function impegniServizi(serviceIds, services) {
  const out = [];
  let offset = 0;
  for (const id of serviceIds || []) {
    const svc = (services || []).find((s) => s.id === id);
    if (!svc) continue;
    for (const s of impegniServizio(svc)) out.push({ ...s, da: s.da + offset, servizioId: id });
    offset += durataServizio(svc);
  }
  return { impegni: out, durata: offset };
}

// Quanti operatori distinti servono (posti) e quali sono.
export function postiDi(impegni) {
  return [...new Set(impegni.filter((s) => s.tipo === "operatore").map((s) => s.posto))].sort((a, b) => a - b);
}
// Un servizio a sola cabina non impegna nessun operatore.
export function senzaOperatore(impegni) {
  return !impegni.some((s) => s.tipo === "operatore");
}

// ---- Appuntamenti già in agenda: che cosa occupano davvero -----------------
// Gli appuntamenti salvati prima di questa funzione non hanno `impegni`:
// valgono come un operatore occupato per tutto il blocco, come prima.
export function impegniBooking(b) {
  if (!b) return [];
  if (Array.isArray(b.impegni) && b.impegni.length) {
    return b.impegni.map((i) => ({ tipo: i.tipo === "cabina" ? "cabina" : "operatore", risorsaId: i.risorsaId, from: i.from, to: i.to }));
  }
  if (!b.staffId) return [];
  return [{ tipo: "operatore", risorsaId: b.staffId, from: b.startMin, to: b.endMin }];
}

// Impegni di una data, appiattiti per risorsa. Si calcola una volta sola e si
// riusa per tutti gli slot da valutare.
export function occupazioneDelGiorno(bookings, dateStr, escludiId) {
  const mappa = new Map(); // risorsaId -> [{from,to}]
  for (const b of bookings || []) {
    if (!b || b.date !== dateStr) continue;
    if (b.status === "cancelled" || b.status === "noshow") continue;
    if (escludiId && b.id === escludiId) continue;
    for (const i of impegniBooking(b)) {
      if (!i.risorsaId) continue;
      if (!mappa.has(i.risorsaId)) mappa.set(i.risorsaId, []);
      mappa.get(i.risorsaId).push({ from: i.from, to: i.to });
    }
  }
  for (const v of mappa.values()) v.sort((a, b) => a.from - b.from);
  return mappa;
}

const risorsaLibera = (occ, risorsaId, intervalli) => {
  const busy = occ.get(risorsaId);
  if (!busy || !busy.length) return true;
  return !intervalli.some((iv) => busy.some((b) => sovrappone(iv.from, iv.to, b.from, b.to)));
};

// Finestre di lavoro di una risorsa in un giorno della settimana. Una cabina
// senza orari propri è considerata disponibile quando lo è il salone.
function finestreDi(risorsa, wd, fallback) {
  const a = risorsa && risorsa.availability;
  if (a && Array.isArray(a[wd]) && a[wd].length) return a[wd];
  return fallback || [];
}
const dentroLeFinestre = (finestre, intervalli) =>
  intervalli.every((iv) => finestre.some((w) => iv.from >= w[0] && iv.to <= w[1]));

// Orario di apertura complessivo del salone in un giorno: unione delle
// finestre di tutti gli operatori. Serve alle cabine che non hanno orari propri.
export function finestreSalone(config, wd) {
  const tutte = [];
  for (const st of (config && config.staff) || []) for (const w of finestreDi(st, wd, [])) tutte.push([w[0], w[1]]);
  if (!tutte.length) return [];
  tutte.sort((a, b) => a[0] - b[0]);
  const out = [tutte[0].slice()];
  for (const w of tutte.slice(1)) {
    const u = out[out.length - 1];
    if (w[0] <= u[1]) u[1] = Math.max(u[1], w[1]);
    else out.push(w.slice());
  }
  return out;
}

// ---- Assegnazione delle risorse a un orario --------------------------------
// Prova a collocare l'appuntamento che inizia a `start`: sceglie un operatore
// per ogni posto (sempre in automatico, il primo utile nell'ordine delle
// impostazioni) e verifica le cabine. Restituisce gli impegni risolti, oppure
// null se le risorse non bastano.
//
// opts.staffFilter  vincola il posto 1 a un operatore preciso
// opts.sovrapponi   ignora le occupazioni (solo prenotazione in negozio)
export function assegnaRisorse(config, impegni, serviceIds, dateStr, start, occ, opts) {
  const o = opts || {};
  if (!impegni.length) return null;
  const wd = weekdayOf(dateStr);
  const apertura = finestreSalone(config, wd);
  const staff = (config && config.staff) || [];
  const cabine = (config && config.cabine) || [];

  // Intervalli assoluti richiesti da ogni posto operatore.
  const posti = postiDi(impegni);
  const intervalliPosto = new Map();
  for (const p of posti) {
    intervalliPosto.set(p, impegni.filter((s) => s.tipo === "operatore" && s.posto === p)
      .map((s) => ({ from: start + s.da, to: start + s.da + s.durata })));
  }

  // Candidati per ciascun posto, nell'ordine in cui gli operatori sono elencati.
  const candidati = new Map();
  for (const p of posti) {
    const iv = intervalliPosto.get(p);
    const ok = staff.filter((st) => {
      if (p === 1 && o.staffFilter && st.id !== o.staffFilter) return false;
      if (!(serviceIds || []).every((id) => (st.serviceIds || []).includes(id))) return false;
      if (risorsaAssente(st, dateStr)) return false;
      if (!dentroLeFinestre(finestreDi(st, wd, []), iv)) return false;
      if (!o.sovrapponi && !risorsaLibera(occ, st.id, iv)) return false;
      return true;
    });
    if (!ok.length) return null;
    candidati.set(p, ok);
  }

  // Cabine richieste esplicitamente dal servizio (non dipendono dall'operatore).
  const cabinaDelServizio = new Map(); // cabinaId -> intervalli
  const cabineDaOperatore = []; // segmenti senza cabina indicata: la eredita dall'operatore
  for (const s of impegni.filter((x) => x.tipo === "cabina")) {
    const iv = { from: start + s.da, to: start + s.da + s.durata };
    if (s.cabinaId) {
      if (!cabinaDelServizio.has(s.cabinaId)) cabinaDelServizio.set(s.cabinaId, []);
      cabinaDelServizio.get(s.cabinaId).push(iv);
    } else cabineDaOperatore.push(iv);
  }

  const cabinaUtilizzabile = (cabinaId, iv) => {
    const cab = cabine.find((c) => c.id === cabinaId);
    if (!cab) return false;
    if (risorsaAssente(cab, dateStr)) return false;
    if (!dentroLeFinestre(finestreDi(cab, wd, apertura), iv)) return false;
    return o.sovrapponi || risorsaLibera(occ, cabinaId, iv);
  };

  for (const [cid, iv] of cabinaDelServizio) if (!cabinaUtilizzabile(cid, iv)) return null;

  // Operatori distinti per posti distinti: pochi posti e pochi operatori,
  // basta provare le combinazioni in ordine.
  const scelta = new Map();
  const risolvi = (i) => {
    if (i >= posti.length) return verificaCabine();
    const p = posti[i];
    for (const st of candidati.get(p)) {
      if ([...scelta.values()].includes(st.id)) continue; // già impegnato su un altro posto
      scelta.set(p, st.id);
      if (risolvi(i + 1)) return true;
      scelta.delete(p);
    }
    return false;
  };

  let cabineRisolte = [];
  function verificaCabine() {
    cabineRisolte = [];
    // Cabina di default dell'operatore del posto 1, quando il servizio non ne
    // indica una: "la cabina si può associare a un servizio o a un operatore".
    const principale = scelta.get(posti[0]);
    const stPrincipale = staff.find((s) => s.id === principale);
    const ereditata = stPrincipale && stPrincipale.cabinaId;
    for (const iv of cabineDaOperatore) {
      if (!ereditata || !cabinaUtilizzabile(ereditata, [iv])) return false;
      cabineRisolte.push({ tipo: "cabina", risorsaId: ereditata, from: iv.from, to: iv.to });
    }
    return true;
  }

  if (posti.length) { if (!risolvi(0)) return null; }
  else if (!verificaCabine()) return null;

  const risolti = [];
  for (const s of impegni) {
    const from = start + s.da, to = start + s.da + s.durata;
    if (s.tipo === "operatore") risolti.push({ tipo: "operatore", risorsaId: scelta.get(s.posto), from, to });
    else if (s.cabinaId) risolti.push({ tipo: "cabina", risorsaId: s.cabinaId, from, to });
  }
  risolti.push(...cabineRisolte);
  risolti.sort((a, b) => a.from - b.from);

  return {
    impegni: risolti,
    staffId: posti.length ? scelta.get(posti[0]) : "",   // operatore "principale": compatibilità
    operatori: posti.map((p) => scelta.get(p)).filter(Boolean),
    cabine: [...new Set(risolti.filter((r) => r.tipo === "cabina").map((r) => r.risorsaId))],
  };
}

// ---- Orari candidati -------------------------------------------------------
// Tutti gli inizi a passo fisso in cui l'appuntamento sta in piedi con tutte le
// sue risorse. È la base comune di ogni modalità di disponibilità.
export function orariPossibili(config, serviceIds, dateStr, bookings, opts) {
  const o = opts || {};
  if (salonechiuso(config, dateStr)) return [];
  const { impegni, durata } = impegniServizi(serviceIds, (config && config.services) || []);
  if (!impegni.length || durata <= 0) return [];
  const occ = occupazioneDelGiorno(bookings, dateStr, o.escludiId);
  const wd = weekdayOf(dateStr);
  // Estremi entro cui ha senso cercare: apertura del salone e finestre cabine.
  const finestre = finestreSalone(config, wd).slice();
  for (const c of (config && config.cabine) || []) {
    for (const w of (c.availability && c.availability[wd]) || []) finestre.push([w[0], w[1]]);
  }
  if (!finestre.length) return [];
  const primo = Math.min(...finestre.map((w) => w[0]));
  const ultimo = Math.max(...finestre.map((w) => w[1]));
  const minimo = o.earliest == null ? -1 : o.earliest;

  const out = [];
  for (let t = Math.ceil(primo / PASSO_MIN) * PASSO_MIN; t + durata <= ultimo; t += PASSO_MIN) {
    if (t < minimo) continue;
    const a = assegnaRisorse(config, impegni, serviceIds, dateStr, t, occ, o);
    if (a) out.push({ start: t, durata, ...a });
  }
  return out;
}
