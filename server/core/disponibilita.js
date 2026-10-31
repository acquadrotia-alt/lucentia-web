// ============================================================================
// Disponibilità per le prenotazioni online: le tre modalità (anti-vuoto,
// griglia, ottimizzata) sopra il motore condiviso src/orari.js, più le
// letture tolleranti del database (colonna impegni facoltativa).
// ============================================================================
import { orariPossibili, durataServizio, occupazioneDelGiorno, spaziAttorno } from "../../src/orari.js";
import { pad2 } from "./util.js";

// ---- Prenotazioni online: utilità (slot anti-vuoto) ----
export const STEP_MIN = 15;
export function inRange(date, from, to) { const lo = from || to, hi = to || from; if (!lo) return false; return date >= lo && date <= hi; }
export function weekdayOf(dateStr) { const p = String(dateStr).split("-").map(Number); return new Date(p[0], (p[1] || 1) - 1, p[2] || 1).getDay(); }
export async function getCollezione(env, aziendaId, coll) {
  const row = await env.DB.prepare("SELECT dati FROM dati_app WHERE azienda_id = ? AND collezione = ?").bind(aziendaId, coll).first();
  try { return row ? JSON.parse(row.dati) : null; } catch (e) { return null; }
}
// Gli eventi occupano uno o più operatori: per il calcolo degli slot vengono
// espansi in pseudo-appuntamenti, uno per ciascun operatore coinvolto.
export function eventiComeImpegni(eventi, dateStr) {
  if (!Array.isArray(eventi)) return [];
  const out = [];
  for (const ev of eventi) {
    if (!ev || ev.date !== dateStr || ev.cancellato) continue;
    for (const sid of (ev.staffIds || [])) out.push({ id: `ev-${ev.id}-${sid}`, staffId: sid, date: ev.date, startMin: ev.startMin, endMin: ev.endMin, status: undefined });
  }
  return out;
}
// Scrittura che nomina `impegni`: se il database non ha ancora la colonna si
// ripiega sulla forma di prima. L'appuntamento resta prenotabile — occuperà
// l'operatore principale per tutta la durata invece che fase per fase, finché
// la migrazione non viene eseguita.
export async function senzaColonnaImpegni(conColonna, ripiego) {
  try { return await conColonna(); }
  catch (e) {
    if (!/impegni/i.test(String((e && e.message) || e))) throw e;
    console.warn("prenotazioni_online.impegni assente: esegui migrazione-risorse.sql");
    return await ripiego();
  }
}

// La colonna `impegni` arriva con migrazione-risorse.sql: su un database che
// non l'ha ancora nominarla farebbe fallire la query (e con essa tutta la
// disponibilità online). Si legge con SELECT *, che non la pretende.
export async function onlineBookingsOf(env, aziendaId, dateStr) {
  const res = await env.DB.prepare("SELECT * FROM prenotazioni_online WHERE azienda_id = ? AND data = ? AND stato = 'attiva'").bind(aziendaId, dateStr).all();
  return (res.results || []).map((r) => {
    let impegni = null;
    try { const a = JSON.parse(r.impegni || "null"); if (Array.isArray(a) && a.length) impegni = a; } catch (e) {}
    return { id: r.id, staffId: r.staff_id, date: dateStr, startMin: r.start_min, endMin: r.end_min, status: undefined, ...(impegni ? { impegni } : {}) };
  });
}
// ---- Le tre modalità di disponibilità online -------------------------------
// Tutte e tre poggiano sul motore condiviso src/orari.js, che conosce le
// risorse (operatori multipli, cabine, servizi a segmenti) e fa rispettare le
// regole rigide: chiusure, orari, ferie, servizi dell'operatore, preavviso,
// sovrapposizioni.

// Primo minuto prenotabile: -1 (nessun vincolo) se la data non è oggi.
function primaOraUtile(dateStr, leadMin, arrotonda) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  if (dateStr !== todayStr) return -1;
  const m = now.getHours() * 60 + now.getMinutes() + (leadMin || 0);
  return arrotonda ? Math.ceil(m / STEP_MIN) * STEP_MIN : m;
}
function nelPassato(dateStr) {
  const now = new Date();
  return dateStr < `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}
// Riduce l'esito del motore alla forma attesa dalle rotte.
const soloOrari = (arr) => arr.map((s) => ({ start: s.start, staffId: s.staffId, impegni: s.impegni, durata: s.durata }));

// Modalità "anti-vuoto": orari consecutivi, che partono dall'apertura e si
// accodano a ciò che finisce. Niente buchi in agenda.
function gapFreeStarts(config, bookingsAll, dateStr, serviceId, leadMin, staffFilter) {
  if (nelPassato(dateStr)) return [];
  return soloOrari(orariPossibili(config, [serviceId], dateStr, bookingsAll, {
    soloBordi: true, earliest: primaOraUtile(dateStr, leadMin, true), staffFilter,
  }));
}
// Modalità "a griglia": tutti gli orari liberi a passo fisso.
function gridStarts(config, bookingsAll, dateStr, serviceId, leadMin, staffFilter) {
  if (nelPassato(dateStr)) return [];
  return soloOrari(orariPossibili(config, [serviceId], dateStr, bookingsAll, {
    earliest: primaOraUtile(dateStr, leadMin, false), staffFilter,
  }));
}

// ---- Modalità "ottimizzata": simula ogni inserimento e scarta i buchi morti ----
// Punteggi. "Pieno" deve battere qualsiasi somma raggiungibile dagli altri casi
// (al massimo ATTACCATO + UTILIZZABILE + AMPIO = 180), così resta la priorità 1.
export const PUNTI = { PIENO: 200, ATTACCATO: 80, UTILIZZABILE: 60, AMPIO: 40, FRAMMENTA: -50, INUTILIZZABILE: -100 };

// Durate dei servizi prenotabili online, crescenti. La soglia di "buco
// utilizzabile" non è fissa: è la durata del servizio online più corto.
export function durateOnline(services) {
  return (services || []).map((s) => durataServizio(s)).filter((d) => d > 0).sort((a, b) => a - b);
}

// Uno slot è "pulito" quando non lascia buchi morti e resta attaccato a
// qualcosa da almeno un lato: sono le priorità 1 (riempie il buco), 2 (si
// accoda a un appuntamento) e 3 (lascia uno spazio comunque utilizzabile).
// Uno slot che lascia spazio libero da entrambi i lati spezza in due un buco
// che era intero: è proprio la frammentazione che questa modalità evita.
export function slotPulito(gapPrima, gapDopo, durate) {
  const minD = durate[0];
  const morto = (g) => g > 0 && g < minD;
  if (morto(gapPrima) || morto(gapDopo)) return false;
  return gapPrima === 0 || gapDopo === 0;
}

// Qualità di uno slot dati gli spazi che lascia prima e dopo di sé. Il
// punteggio non decide da solo cosa mostrare (a quello pensa slotPulito):
// serve a ordinare i ripieghi e a scegliere l'operatore migliore a parità di orario.
export function valutaSlot(gapPrima, gapDopo, durate) {
  if (gapPrima === 0 && gapDopo === 0) return PUNTI.PIENO; // riempie esattamente il buco
  const minD = durate[0];
  let p = 0;
  if (gapPrima === 0) p += PUNTI.ATTACCATO; // si accoda a ciò che c'è prima
  if (gapDopo === 0) p += PUNTI.ATTACCATO;  // combacia con ciò che viene dopo
  for (const g of [gapPrima, gapDopo]) {
    if (g === 0) continue;
    if (g < minD) p += PUNTI.INUTILIZZABILE; // nessun servizio online ci sta
    else { p += PUNTI.UTILIZZABILE; if (g >= minD * 2) p += PUNTI.AMPIO; }
  }
  if (gapPrima > 0 && gapDopo > 0) p += PUNTI.FRAMMENTA; // spezza il segmento in due
  return p;
}

// Modalità "ottimizzata": parte dagli stessi orari della griglia, simula
// l'inserimento di ognuno e tiene solo quelli che non spezzettano la giornata.
// La simulazione è puramente virtuale: nulla viene scritto in agenda.
// Con più risorse impegnate (due operatori, una cabina) il giudizio è quello
// della risorsa messa peggio: un buco morto nella cabina pesa quanto uno in agenda.
function optimizedStarts(config, bookingsAll, dateStr, serviceId, leadMin, staffFilter, opts) {
  if (nelPassato(dateStr)) return [];
  const earliest = primaOraUtile(dateStr, leadMin, false);
  const cand = orariPossibili(config, [serviceId], dateStr, bookingsAll, { earliest, staffFilter, modo: "ottimizzata" });
  if (!cand.length) return [];
  const durate = durateOnline(opts && opts.servizionline);
  // In conferma conta solo se lo slot è davvero libero: filtrare anche lì
  // rifiuterebbe prenotazioni valide diventate "meno ottimali" nel frattempo.
  if (opts && opts.confirm) return soloOrari(cand);
  // Senza servizi online noti non c'è metro per giudicare i buchi: nessun filtro.
  if (!durate.length) return soloOrari(cand);

  const occ = occupazioneDelGiorno(bookingsAll, dateStr);
  const valutati = cand.map((c) => {
    const spazi = spaziAttorno(config, dateStr, c.impegni, occ, earliest);
    if (!spazi.length) return { c, punteggio: 0, pulito: true, segKey: "-" };
    let punteggio = Infinity, pulito = true;
    for (const s of spazi) {
      punteggio = Math.min(punteggio, valutaSlot(s.gapPrima, s.gapDopo, durate));
      if (!slotPulito(s.gapPrima, s.gapDopo, durate)) pulito = false;
    }
    return { c, punteggio, pulito, segKey: spazi.map((s) => s.segKey).join("+") };
  });

  // Filtro per singolo spazio libero, non per giornata: se dentro uno spazio
  // esiste almeno una collocazione pulita si mostrano solo quelle, altrimenti
  // si tengono le meno peggio — così nessuno spazio sparisce dalla disponibilità.
  const perSegmento = new Map();
  for (const v of valutati) {
    if (!perSegmento.has(v.segKey)) perSegmento.set(v.segKey, []);
    perSegmento.get(v.segKey).push(v);
  }
  const tenuti = [];
  for (const gruppo of perSegmento.values()) {
    const buoni = gruppo.filter((v) => v.pulito);
    if (buoni.length) { tenuti.push(...buoni); continue; }
    const max = Math.max(...gruppo.map((v) => v.punteggio)); // ripiego: i meno peggio
    tenuti.push(...gruppo.filter((v) => v.punteggio === max));
  }

  // A parità di orario tiene l'assegnazione col punteggio migliore.
  const best = new Map();
  for (const v of tenuti) { const p = best.get(v.c.start); if (!p || v.punteggio > p.punteggio) best.set(v.c.start, v); }
  return soloOrari([...best.values()].sort((a, b) => a.c.start - b.c.start).map((v) => v.c));
}

// Sceglie l'algoritmo in base alla modalità configurata dal salone.
// `opts` è usato solo dalla modalità ottimizzata: le altre due restano identiche.
export function computeStarts(config, bookingsAll, dateStr, serviceId, leadMin, mode, staffFilter, opts) {
  if (mode === "griglia") return gridStarts(config, bookingsAll, dateStr, serviceId, leadMin, staffFilter);
  if (mode === "ottimizzata") return optimizedStarts(config, bookingsAll, dateStr, serviceId, leadMin, staffFilter, opts);
  return gapFreeStarts(config, bookingsAll, dateStr, serviceId, leadMin, staffFilter);
}
