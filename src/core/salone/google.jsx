// ============================================================================
// GOOGLE — Gmail e Google Calendar, lato gestionale (modulo "google").
//
// · Gmail: le email ai clienti partono dalla casella del titolare e restano
//   fra le sue «Inviate». Qui c'è solo ciò che non è segreto: i testi delle
//   email, la firma e le opzioni stanno in `config.google`; ID client, client
//   secret e il permesso di Google restano sul server (server/core/gmail.js).
// · Google Calendar a due vie (`useGcal`): ogni operatore è abbinato a un
//   calendario che esiste già su Google. Gli appuntamenti dell'agenda vanno
//   lì (da 7 giorni fa in avanti, solo quelli cambiati); quello che si sposta
//   o si cancella su Google si aggiorna anche qui, ogni 2 minuti e quando si
//   apre l'agenda. Su ogni appuntamento resta `gcal: { id, cal, agg, firma }`.
//   Gli eventi nati su Google compaiono come «Da Google Calendar» (solo in
//   memoria, mai copiati nell'archivio) e occupano l'operatore del loro
//   calendario, così non ci si prenota sopra.
// · Feed iCalendar in sola lettura per telefono e Outlook, con codice segreto.
// ============================================================================
import { useState, useEffect, useRef, useMemo } from "react";
import { Mail, Calendar, Check, X, ExternalLink, Trash2, Copy, RefreshCw, ChevronRight, AlertTriangle, Send, Rss, Clock, MapPin, User, CalendarCheck, Link2, AlertCircle } from "lucide-react";
import { minToStr, strToMin, todayStr, addDays, fmtDate, Field } from "./comuni.jsx";

async function googleApi(rotta, action, body) {
  try {
    const r = await fetch(`/api/${rotta}?action=${action}`, body === undefined
      ? { credentials: "include", headers: { Accept: "application/json" } }
      : { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, ...j } : { ok: false, error: j.error || `Errore ${r.status}` };
  } catch (e) { return { ok: false, error: "Rete assente: riprova fra poco." }; }
}
export const gmailApi = (action, body) => googleApi("gmail", action, body);
export const gcalApi = (action, body) => googleApi("gcal", action, body);
export const icsApi = (action, body) => googleApi("agenda-ics", action, body);

// Cosa dice il gestionale quando si torna da Google (?gmail=<esito>).
export const GOOGLE_ESITI = {
  collegato: { ok: true, testo: "Account Google collegato. Da adesso le email partono dalla tua casella; scegli i calendari qui sotto per attivare anche Google Calendar." },
  scaduto: { ok: false, testo: "Il collegamento è scaduto (sono passati più di 15 minuti): premi di nuovo «Collega account Google»." },
  negato: { ok: false, testo: "Su Google hai negato il permesso. Per usare Gmail e Calendar serve accettare: riprova con «Collega account Google»." },
  "senza-refresh": { ok: false, testo: "Google non ha dato il permesso permanente. Vai su myaccount.google.com/permissions, togli l'accesso a questa app e ricollega." },
  "permesso-mancante": { ok: false, testo: "Manca il permesso di inviare email: ricollega l'account lasciando tutte le spunte su Google." },
  errore: { ok: false, testo: "Collegamento non riuscito: controlla ID client e client secret (e l'URI di reindirizzamento su Google) e riprova." },
};

// ---- Email ai clienti: testi, segnaposto, firma -------------------------
export const DEFAULT_GOOGLE = {
  firma: "", copiaAMe: false, conferma: true,
  modelli: {
    conferma: { oggetto: "Conferma appuntamento {data} alle {ora} · {salone}", testo: "Gentile {cliente},\n\nle confermiamo l'appuntamento di {data} alle {ora} per {servizi}{conOperatore}.\n\nSe avesse un imprevisto la preghiamo di avvisarci con anticipo{telefonoFrase}.\n\nA presto,\n{salone}" },
    promemoria: { oggetto: "Promemoria appuntamento {data} alle {ora} · {salone}", testo: "Gentile {cliente},\n\nle ricordiamo l'appuntamento di {data} alle {ora} per {servizi}{conOperatore}.\n\nLa aspettiamo{indirizzoFrase}.\n\n{salone}" },
  },
};
export function googleConfig(config) {
  const g = (config && config.google) || {};
  return { ...DEFAULT_GOOGLE, ...g, modelli: { conferma: { ...DEFAULT_GOOGLE.modelli.conferma, ...((g.modelli || {}).conferma || {}) }, promemoria: { ...DEFAULT_GOOGLE.modelli.promemoria, ...((g.modelli || {}).promemoria || {}) } } };
}
export const compila = (t, v) => String(t || "").replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m));
export const emailValida = (s) => /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/.test(String(s || "").trim());
export function valoriPrenotazione(b, config) {
  const br = (config && config.branding) || {};
  const servizi = (b.serviceIds || []).map((id) => { const s = (config.services || []).find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  const op = (config.staff || []).find((s) => s.id === b.staffId);
  return {
    cliente: b.clientName || "cliente", data: fmtDate(b.date), ora: minToStr(b.startMin), fine: minToStr(b.endMin), servizi: servizi || "il servizio prenotato",
    operatore: op ? op.name : "", conOperatore: op ? ` con ${op.name}` : "",
    salone: br.name || "", telefono: br.phone || "", telefonoFrase: br.phone ? ` al numero ${br.phone}` : "", indirizzo: br.address || "", indirizzoFrase: br.address ? ` in ${br.address}` : "",
  };
}
// L'indirizzo a cui scrivere: quello preso alla prenotazione, altrimenti quello in anagrafica.
export const emailDi = (b, clients) => { if (b.clientEmail && emailValida(b.clientEmail)) return b.clientEmail.trim(); const c = (clients || []).find((x) => x.code === b.clientCode); return c && emailValida(c.email) ? c.email.trim() : ""; };

// ---- Google Calendar: il motore -----------------------------------------
// il calendario di Google dove va un appuntamento ("" = nessuno abbinato)
export function calendarioDi(b, mappa) {
  if (!mappa || !b) return "";
  return (b.staffId && (mappa.op || {})[b.staffId]) || mappa.altro || "";
}
// al contrario: da un calendario di Google all'operatore (tiene quello di prima se va bene)
export function staffDaCal(cal, mappa, attuale) {
  const op = (mappa && mappa.op) || {};
  if (attuale && op[attuale] === cal) return attuale;
  const k = Object.keys(op).find((x) => op[x] === cal);
  return k || attuale || null;
}
function descrizioneDi(b, config, clients) {
  const v = valoriPrenotazione(b, config);
  const cl = (clients || []).find((x) => x.code === b.clientCode);
  return [
    "Servizi: " + v.servizi,
    v.operatore ? "Operatore: " + v.operatore : "",
    [cl && cl.phone ? "Tel. " + cl.phone : "", emailDi(b, clients) ? "Email: " + emailDi(b, clients) : ""].filter(Boolean).join(" · "),
    b.note || "",
    "Dal gestionale" + (v.salone ? " di " + v.salone : ""),
  ].filter(Boolean).join("\n");
}
const titoloDi = (b, config) => { const v = valoriPrenotazione(b, config); return (b.clientName || "Appuntamento") + " · " + v.servizi; };
export const gcalFirma = (b, cal, config, clients) => JSON.stringify([cal, b.date, b.startMin, b.endMin, titoloDi(b, config), descrizioneDi(b, config, clients)]);
const gcalCorpo = (b, cal, config, clients) => ({ cal, title: titoloDi(b, config), date: b.date, start: minToStr(b.startMin), end: minToStr(Math.min(b.endMin, 1439)), allDay: false, place: "", descrizione: descrizioneDi(b, config, clients) });
// l'appuntamento va su Google se non è annullato e ha una data
const vaSuGoogle = (b) => !!(b && b.date && b.status !== "cancelled");

// un evento creato su Google, nella forma di un appuntamento dell'agenda
export function eventoEsterno(g, stato) {
  const n = ((stato && stato.nomi) || {})[g.cal] || {};
  const staffId = staffDaCal(g.cal, stato && stato.mappa, "") || null;
  const startMin = g.allDay || !g.start ? 0 : strToMin(g.start);
  const endMin = g.allDay || !g.start ? 0 : (g.end ? Math.max(strToMin(g.end), startMin + 5) : startMin + 60);
  return { id: "g_" + g.gid, gid: g.gid, esterno: true, _google: true, gcal: { id: g.gid, cal: g.cal }, clientName: g.title || "(senza titolo)", serviceIds: [], staffId, date: g.date, startMin, endMin, allDay: !!g.allDay, note: g.note || "", place: g.place || "", link: g.link || "", calNome: n.nome || "", colore: n.colore || "", ricorrente: !!g.ricorrente, multiGiorno: !!g.multiGiorno };
}

// Spostato da Google: cambiano data, orario e forse operatore. Gli impegni
// (fasi del servizio) si traslano se la durata e l'operatore sono gli stessi,
// altrimenti si lasciano cadere e vale "operatore occupato per tutta la durata".
function applicaDaGoogle(b, g, mappa) {
  if (g.allDay || !g.start) return null; // tutto il giorno: non ha senso per un appuntamento, non si tocca
  const startMin = strToMin(g.start), endMin = g.end ? Math.max(strToMin(g.end), startMin + 5) : b.endMin - b.startMin + startMin;
  const staffId = staffDaCal(g.cal, mappa, b.staffId);
  const delta = startMin - b.startMin, stessaDurata = endMin - startMin === b.endMin - b.startMin;
  const n = { ...b, date: g.date, startMin, endMin, staffId };
  if (Array.isArray(b.impegni) && b.impegni.length) {
    n.impegni = stessaDurata && staffId === b.staffId ? b.impegni.map((i) => ({ ...i, from: i.from + delta, to: i.to + delta })) : undefined;
    if (n.impegni === undefined) delete n.impegni;
  }
  return n;
}

/* Il motore: montato una volta in SalonApp. `leggi()` dà l'elenco attuale
   degli appuntamenti, `salva(lista)` lo sostituisce (setBookings). */
export function useGcal({ attiva, leggi, salva, config, clients }) {
  const [stato, setStato] = useState(null);
  const [esterni, setEsterni] = useState([]);
  const [info, setInfo] = useState({ inCorso: false, errore: "", ultimo: "" });
  const R = useRef({ stato: null, centro: todayStr(), finestra: null, ultimoPull: 0, lavoro: false, ancora: false, forza: false, timer: null, falliti: {}, saltaProssimo: false });
  const opz = useRef({}); opz.current = { leggi, salva, config, clients };

  const programma = (ms, forza) => {
    const r = R.current;
    if (forza) r.forza = true;
    clearTimeout(r.timer);
    r.timer = setTimeout(() => { const f = r.forza; r.forza = false; sincronizza(f); }, ms || 0);
  };
  const caricaStato = async () => {
    const s = await gcalApi("stato");
    if (!s.ok) { setStato({ attivo: false, errore: s.error }); R.current.stato = null; setEsterni([]); return null; }
    R.current.stato = s; setStato(s);
    if (!s.attivo) setEsterni([]);
    return s;
  };
  const fuoriFinestra = (giorno, fin) => !fin || addDays(giorno, -15) < fin.da || addDays(giorno, 40) > fin.a;

  async function sincronizza(forza) {
    const r = R.current, s = r.stato;
    if (!s || !s.attivo) return;
    if (r.lavoro) { r.ancora = true; if (forza) r.forza = true; return; }
    r.lavoro = true;
    setInfo((i) => ({ ...i, inCorso: true }));
    let errore = "";
    try {
      const { config: cfg, clients: cls } = opz.current;
      const mappa = s.mappa || { op: {} };
      const firma = (b, cal) => gcalFirma(b, cal, cfg, cls);
      // finestra di giorni letta da Google, intorno al giorno guardato
      const fuori = fuoriFinestra(r.centro, r.finestra);
      if (fuori) r.finestra = { da: addDays(r.centro, -45), a: addDays(r.centro, 150) };
      const { da, a } = r.finestra;
      let lista = (opz.current.leggi() || []).filter(Boolean);
      const cambi = {};     // id → nuovo appuntamento (già aggiornato da Google)
      const soloGcal = {};  // id → gcal  (dopo l'invio)
      if (forza || fuori || Date.now() - r.ultimoPull > 60000) {
        const noti = lista.filter((b) => b.gcal && b.gcal.id && b.gcal.cal && b.date >= da && b.date <= a && vaSuGoogle(b)).map((b) => ({ gid: b.gcal.id, cal: b.gcal.cal }));
        const res = await gcalApi("eventi", { da, a, noti });
        if (!res.ok) throw new Error(res.error);
        r.ultimoPull = Date.now();
        const perLocale = {};
        (res.eventi || []).forEach((g) => { if (g.locale) perLocale[g.locale] = g; });
        const ids = {}; lista.forEach((b) => { ids[b.id] = true; });
        lista.forEach((b) => {
          if (!b.gcal || !b.gcal.id || !(b.date >= da && b.date <= a) || !vaSuGoogle(b)) return;
          if ((res.calendari || {})[b.gcal.cal] === false) return;   // quel calendario non si è letto: non si tocca niente
          const g = perLocale[b.id] || (res.noti || {})[b.gcal.id];
          if (!g) return;
          const sporco = firma(b, calendarioDi(b, mappa)) !== b.gcal.firma; // cambiato qui dopo l'ultimo invio: vince il gestionale
          if (g.cancellato) { if (!sporco) cambi[b.id] = { ...b, status: "cancelled", gcal: null, annullatoDaGoogle: new Date().toISOString() }; return; }
          if (g.updated && g.updated > (b.gcal.agg || "") && !sporco) {
            const n = applicaDaGoogle(b, g, mappa);
            if (!n) return;
            n.gcal = { ...b.gcal, cal: g.cal, agg: g.updated, firma: firma(n, calendarioDi(n, mappa)) };
            cambi[b.id] = n;
          }
        });
        setEsterni((res.eventi || []).filter((g) => !(g.locale && ids[g.locale])).map((g) => eventoEsterno(g, s)));
        lista = lista.map((b) => (cambi[b.id] ? cambi[b.id] : b));
      }
      // dal gestionale a Google: i nuovi e i cambiati, da 7 giorni fa in avanti
      const daQuando = addDays(todayStr(), -7);
      const coda = lista.filter((b) => vaSuGoogle(b) && (b.gcal || b.date >= daQuando)).map((b) => ({ b, cal: calendarioDi(b, mappa) }))
        .filter((x) => x.cal && (!x.b.gcal || !x.b.gcal.id || x.b.gcal.cal !== x.cal || x.b.gcal.firma !== firma(x.b, x.cal)))
        .filter((x) => r.falliti[x.b.id] !== firma(x.b, x.cal));
      for (let i = 0; i < Math.min(coda.length, 100); i += 20) {
        const pezzo = coda.slice(i, i + 20);
        const res = await gcalApi("spingi", { eventi: pezzo.map((x) => ({ locale: x.b.id, primaCal: (x.b.gcal && x.b.gcal.id && x.b.gcal.cal) || "", ...gcalCorpo(x.b, x.cal, cfg, cls) })) });
        if (!res.ok) throw new Error(res.error);
        pezzo.forEach((x) => {
          const k = (res.esiti || {})[x.b.id];
          if (k && k.ok) soloGcal[x.b.id] = { id: k.gid, cal: k.cal, agg: k.agg || "", firma: firma(x.b, x.cal) };
          else if (k) { r.falliti[x.b.id] = firma(x.b, x.cal); errore = k.errore || "Un appuntamento non è andato su Google."; }
        });
      }
      if (coda.length > 100) r.ancora = true;
      // si salva sull'elenco di ADESSO (nel frattempo si può essere cambiato qualcosa)
      if (Object.keys(cambi).length || Object.keys(soloGcal).length) {
        const ora = (opz.current.leggi() || []).filter(Boolean);
        let toccati = 0;
        const nuova = ora.map((b) => {
          if (cambi[b.id]) { toccati++; return cambi[b.id]; }
          if (soloGcal[b.id]) { toccati++; const g = soloGcal[b.id]; return { ...b, gcal: g.firma === firma(b, g.cal) ? g : { ...g, firma: "" } }; }
          return b;
        });
        if (toccati) { r.saltaProssimo = true; opz.current.salva(nuova); }
      }
    } catch (e) { errore = (e && e.message) || String(e); }
    r.lavoro = false;
    setInfo({ inCorso: false, errore, ultimo: errore ? "" : new Date().toISOString() });
    if (r.ancora) { r.ancora = false; programma(800, r.forza); }
  }

  useEffect(() => {
    if (!attiva) { setStato(null); setEsterni([]); R.current.stato = null; return; }
    caricaStato().then((s) => { if (s && s.attivo) programma(300, true); });
    const t = setInterval(() => { if (document.visibilityState !== "hidden") programma(0, true); }, 120000);
    const vis = () => { if (document.visibilityState === "visible") programma(300, true); };
    const cambiato = () => { caricaStato().then((s) => { R.current.finestra = null; if (s && s.attivo) programma(0, true); }); };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("gcal-cambiato", cambiato);
    return () => { clearInterval(t); clearTimeout(R.current.timer); document.removeEventListener("visibilitychange", vis); window.removeEventListener("gcal-cambiato", cambiato); };
  }, [attiva]);

  const s = stato && stato.attivo ? stato : null;
  const occupanti = useMemo(() => (s ? esterni.filter((e) => !e.allDay && e.staffId) : []), [s, esterni]);
  return {
    attivo: !!s, stato, esterni: s ? esterni : [], occupanti, info,
    // l'agenda guarda un giorno: se esce dalla finestra letta si rilegge
    vedi: (giorno) => { R.current.centro = giorno; if (s && fuoriFinestra(giorno, R.current.finestra)) programma(150, true); },
    aggiorna: () => programma(0, true),
    // dopo ogni cambiamento dell'agenda: i tolti e gli annullati si cancellano anche su Google, i cambiati si mandano
    dopoSalvataggio: (prima, dopo) => {
      const r = R.current;
      if (r.saltaProssimo) { r.saltaProssimo = false; return; }
      if (!s) return;
      const adesso = {}; (dopo || []).forEach((b) => { if (b) adesso[b.id] = b; });
      const tolti = (prima || []).filter((b) => b && b.gcal && b.gcal.id && b.gcal.cal && (!adesso[b.id] || (adesso[b.id].status === "cancelled" && b.status !== "cancelled")));
      if (tolti.length) {
        gcalApi("elimina", { eventi: tolti.slice(0, 25).map((b) => ({ gid: b.gcal.id, cal: b.gcal.cal })) }).then(() => {
          // l'annullato perde il legame: se viene ripristinato, torna su Google come nuovo
          const ids = new Set(tolti.map((b) => b.id));
          const ora = opz.current.leggi() || [];
          if (ora.some((b) => b && ids.has(b.id) && b.gcal)) { r.saltaProssimo = true; opz.current.salva(ora.map((b) => (b && ids.has(b.id) && b.gcal ? { ...b, gcal: null } : b))); }
        });
      }
      programma(1200, false);
    },
    // un evento nato su Google si cancella direttamente là
    eliminaEsterno: async (ev) => {
      const res = await gcalApi("elimina", { eventi: [{ gid: ev.gid, cal: ev.gcal.cal }] });
      const k = res.ok && (res.esiti || {})[ev.gid];
      if (!k || !k.ok) { alert("Google non ha cancellato l'evento: " + ((k && k.errore) || res.error || "errore")); return false; }
      setEsterni((l) => l.filter((x) => x.id !== ev.id));
      return true;
    },
    ricarica: () => { caricaStato().then((x) => { R.current.finestra = null; if (x && x.attivo) programma(0, true); }); },
  };
}

// ---- Agenda: la card e la scheda di un evento nato su Google -------------
export function GoogleCard({ ev, big, onClick, index = 0 }) {
  const delay = `${Math.min(index * 40, 320)}ms`;
  const ora = ev.allDay ? "Tutto il giorno" : `${minToStr(ev.startMin)}–${minToStr(ev.endMin)}`;
  if (big) return (
    <button onClick={onClick} style={{ animationDelay: delay }} className="lc-fade-up group w-full text-left flex items-stretch gap-3 rounded-xl border border-dashed border-stone-300 bg-stone-50/60 p-3 transition hover:border-stone-400 hover:bg-white">
      <div className="flex flex-col items-center justify-center w-14 shrink-0 border-r border-stone-200/70 pr-3">
        {ev.allDay ? <Calendar size={16} className="text-stone-400" /> : <><span className="text-sm font-semibold tabular-nums leading-tight text-stone-600">{minToStr(ev.startMin)}</span><span className="text-[11px] text-stone-400 tabular-nums">{minToStr(ev.endMin)}</span></>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold truncate leading-tight text-stone-800">{ev.clientName}</div>
        <div className="text-[13px] text-stone-500 truncate mt-0.5">{ev.calNome ? `Calendario «${ev.calNome}»` : "Google Calendar"}{ev.place ? ` · ${ev.place}` : ""}</div>
        <div className="mt-1.5 text-[11px] text-stone-400">{ora}</div>
      </div>
      <div className="flex flex-col items-end justify-between shrink-0">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white border border-stone-200 text-stone-500 inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: ev.colore || "#78716c" }} /> Da Google</span>
        <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-500 transition" />
      </div>
    </button>
  );
  return (
    <button onClick={onClick} style={{ animationDelay: delay }} className="lc-fade-up w-full text-left rounded-lg border border-dashed border-stone-300 bg-stone-50/60 p-2 transition hover:border-stone-400">
      <div className="flex items-center justify-between gap-1"><span className="text-xs font-semibold tabular-nums text-stone-500">{ev.allDay ? "Giorno" : minToStr(ev.startMin)}</span><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ev.colore || "#78716c" }} /></div>
      <div className="text-[13px] font-medium truncate mt-0.5 text-stone-700">{ev.clientName}</div>
      <div className="text-[11px] text-stone-400 truncate">Da Google</div>
    </button>
  );
}

export function GoogleEventoModal({ ev, staff, onClose, onElimina }) {
  const [busy, setBusy] = useState(false);
  const op = (staff || []).find((s) => s.id === ev.staffId);
  const elimina = async () => {
    if (!confirm("Cancellare questo evento anche su Google Calendar? L'operazione non si annulla.")) return;
    setBusy(true); const ok = await onElimina(ev); setBusy(false); if (ok) onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 lc-fade-in" onClick={onClose}>
      <div className="lc-card lc-scale-in w-full max-w-sm p-5 overflow-auto" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: ev.colore || "#78716c" }} /> Da Google Calendar</span>
            <h3 className="font-semibold text-lg text-stone-900 mt-2 tracking-tight">{ev.clientName}</h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><Calendar size={15} className="text-stone-400 shrink-0" /><span className="capitalize">{fmtDate(ev.date)}</span></div>
          <div className="flex items-center gap-2"><Clock size={15} className="text-stone-400 shrink-0" />{ev.allDay ? "Tutto il giorno" : `${minToStr(ev.startMin)}–${minToStr(ev.endMin)}`}{ev.multiGiorno ? " (continua nei giorni seguenti)" : ""}</div>
          {op ? <div className="flex items-center gap-2"><User size={15} className="text-stone-400 shrink-0" />{op.name} <span className="text-stone-400 text-xs">· il suo calendario</span></div> : <div className="flex items-center gap-2 text-stone-500"><User size={15} className="text-stone-400 shrink-0" />Nessun operatore: calendario «{ev.calNome || "altro"}»</div>}
          {ev.place ? <div className="flex items-center gap-2"><MapPin size={15} className="text-stone-400 shrink-0" />{ev.place}</div> : null}
          {ev.note ? <div className="flex items-start gap-2 text-stone-600"><AlertCircle size={15} className="text-stone-400 shrink-0 mt-0.5" /><span className="whitespace-pre-wrap">{ev.note}</span></div> : null}
        </div>
        <p className="text-[11px] text-stone-400 mt-3 leading-relaxed">{ev.allDay ? "Gli eventi di tutto il giorno si vedono soltanto: non bloccano l'agenda." : op ? `Occupa ${op.name} in agenda: in quell'ora non si può prenotare altro con ${op.name}.` : "Si vede soltanto: non blocca nessun operatore."} Per spostarlo o cambiarlo aprilo su Google.</p>
        <div className="mt-4 space-y-2">
          {ev.link ? <a href={ev.link} target="_blank" rel="noreferrer" className="w-full brand-bg font-medium py-2.5 rounded-xl flex items-center justify-center gap-1.5"><ExternalLink size={15} /> Apri su Google Calendar</a> : null}
          <button onClick={elimina} disabled={busy} className="w-full font-medium py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition flex items-center justify-center gap-1.5 disabled:opacity-50"><Trash2 size={15} /> {busy ? "Cancello…" : "Cancella anche su Google"}</button>
        </div>
      </div>
    </div>
  );
}

// ---- Agenda: scrivere al cliente (conferma / promemoria) ----------------
export function EmailModal({ booking, config, clients, onClose, onInviato }) {
  const g = googleConfig(config);
  const v = valoriPrenotazione(booking, config);
  const [tipo, setTipo] = useState("conferma");
  const [a, setA] = useState(emailDi(booking, clients));
  const [oggetto, setOggetto] = useState(compila(g.modelli.conferma.oggetto, v));
  const [testo, setTesto] = useState(compila(g.modelli.conferma.testo, v) + (g.firma ? "\n\n" + g.firma : ""));
  const [busy, setBusy] = useState(false);
  const [esito, setEsito] = useState(null);
  const cambiaTipo = (t) => { setTipo(t); setOggetto(compila(g.modelli[t].oggetto, v)); setTesto(compila(g.modelli[t].testo, v) + (g.firma ? "\n\n" + g.firma : "")); };
  const invia = async () => {
    if (!emailValida(a)) { setEsito({ ok: false, testo: "Indirizzo email non valido." }); return; }
    if (!oggetto.trim()) { setEsito({ ok: false, testo: "Manca l'oggetto." }); return; }
    setBusy(true); setEsito(null);
    const r = await gmailApi("invia", { a: a.trim(), copiaAMe: !!g.copiaAMe, oggetto: oggetto.trim(), testo });
    setBusy(false);
    if (!r.ok) { setEsito({ ok: false, testo: r.error }); return; }
    onInviato && onInviato({ il: new Date().toISOString(), a: a.trim(), oggetto: oggetto.trim(), tipo });
    setEsito({ ok: true, testo: `Email inviata a ${a.trim()}.` });
    setTimeout(onClose, 900);
  };
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 lc-fade-in" onClick={onClose}>
      <div className="lc-card lc-scale-in w-full max-w-md p-5 overflow-auto" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div><h3 className="font-semibold text-lg text-stone-900 tracking-tight flex items-center gap-2"><Mail size={18} className="brand-accent" /> Email al cliente</h3><p className="text-xs text-stone-400 mt-0.5">Parte dalla tua casella Gmail e resta fra le «Inviate».</p></div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>
        <div className="flex gap-1 bg-stone-100/80 rounded-xl p-1 mb-3">
          {[["conferma", "Conferma"], ["promemoria", "Promemoria"]].map(([k, l]) => <button key={k} onClick={() => cambiaTipo(k)} className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${tipo === k ? "bg-white shadow-[var(--lc-shadow-xs)] text-stone-900" : "text-stone-500 hover:text-stone-700"}`}>{l}</button>)}
        </div>
        <div className="space-y-3">
          <Field label="A"><input value={a} onChange={(e) => setA(e.target.value)} placeholder="cliente@esempio.it" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          <Field label="Oggetto"><input value={oggetto} onChange={(e) => setOggetto(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          <Field label="Testo"><textarea value={testo} onChange={(e) => setTesto(e.target.value)} rows={9} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring leading-relaxed" /></Field>
        </div>
        {esito ? <p className={`text-sm mt-3 flex items-center gap-1.5 ${esito.ok ? "text-green-700" : "text-red-600"}`}>{esito.ok ? <Check size={15} /> : <AlertTriangle size={15} />} {esito.testo}</p> : null}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={invia} disabled={busy} className="brand-bg font-medium py-2.5 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"><Send size={15} /> {busy ? "Invio…" : "Invia"}</button>
          <button onClick={onClose} className="font-medium py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50">Annulla</button>
        </div>
        {g.copiaAMe ? <p className="text-[11px] text-stone-400 mt-2 text-center">Una copia arriva anche a te, in copia nascosta.</p> : null}
      </div>
    </div>
  );
}

// ---- Impostazioni → Google ----------------------------------------------
const Bottone = ({ primario, pericolo, children, ...rest }) => <button type="button" {...rest} className={`text-sm font-medium px-3.5 py-2 rounded-lg transition inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${primario ? "brand-bg" : pericolo ? "border border-red-200 text-red-600 hover:bg-red-50 bg-white" : "border border-stone-300 text-stone-600 hover:bg-stone-50 bg-white"}`}>{children}</button>;
const Esito = ({ m }) => (m ? <p className={`text-sm mt-3 flex items-start gap-1.5 ${m.ok ? "text-green-700" : "text-red-600"}`}>{m.ok ? <Check size={15} className="shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="shrink-0 mt-0.5" />} <span>{m.testo}</span></p> : null);
const Link = ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="brand-accent font-medium hover:underline">{children}</a>;
const inp = "w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring";

export function GoogleImpostazioni({ config, saveConfig, esito, onEsitoVisto }) {
  const [stato, setStato] = useState(null);
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [guida, setGuida] = useState(false);
  const [lavoro, setLavoro] = useState("");
  const [msg, setMsg] = useState(null);
  const g = googleConfig(config);
  const salvaG = (patch) => saveConfig({ ...config, google: { ...g, ...patch } });
  const salvaModello = (tipo, patch) => salvaG({ modelli: { ...g.modelli, [tipo]: { ...g.modelli[tipo], ...patch } } });
  const ricarica = async () => { const s = await gmailApi("stato"); setStato(s.ok ? s : { errore: s.error }); if (s.ok && s.clientId) setClientId((c) => c || s.clientId); if (s.ok && !s.configurato) setGuida(true); return s; };
  useEffect(() => { ricarica(); }, []);
  const azione = async (nome, fn) => { setLavoro(nome); setMsg(null); try { await fn(); } finally { setLavoro(""); } };
  const salvaClient = () => azione("config", async () => {
    const r = await gmailApi("config", { clientId: clientId.trim(), clientSecret: secret.trim() });
    setMsg(r.ok ? { ok: true, testo: "Codici salvati. Ora premi «Collega account Google»." } : { ok: false, testo: r.error });
    if (r.ok) setSecret("");
    await ricarica();
  });
  const collega = () => azione("collega", async () => {
    const r = await gmailApi("autorizza");
    if (!r.ok || !r.url) { setMsg({ ok: false, testo: r.error || "Non riesco ad aprire Google." }); return; }
    window.location.href = r.url;
  });
  const prova = () => azione("prova", async () => { const r = await gmailApi("prova", {}); setMsg(r.ok ? { ok: true, testo: `Email di prova mandata a ${r.da || (stato && stato.email)}: controlla la posta.` } : { ok: false, testo: r.error }); await ricarica(); });
  const scollega = () => { if (!confirm("Scollegare l'account Google? Il gestionale non potrà più mandare email né parlare con Google Calendar finché non lo ricolleghi.")) return; azione("scollega", async () => { await gmailApi("scollega", {}); await ricarica(); setMsg({ ok: true, testo: "Account Google scollegato." }); try { window.dispatchEvent(new Event("gcal-cambiato")); } catch (e) {} }); };
  const dimentica = () => { if (!confirm("Cancellare anche ID client e client secret? Per ricollegare dovrai reinserirli.")) return; azione("dimentica", async () => { await gmailApi("dimentica", {}); setClientId(""); await ricarica(); }); };
  const redirect = (stato && stato.redirect) || ((typeof window !== "undefined" ? window.location.origin : "") + "/api/gmail?action=ritorno");
  const copia = async (v) => { try { await navigator.clipboard.writeText(v); setMsg({ ok: true, testo: "Copiato." }); } catch (e) { prompt("Copia:", v); } };
  const esitoInfo = esito ? GOOGLE_ESITI[esito] || GOOGLE_ESITI.errore : null;
  const collegato = !!(stato && stato.collegato);
  const SEGNAPOSTO = "{cliente} {data} {ora} {fine} {servizi} {operatore} {conOperatore} {salone} {telefono} {telefonoFrase} {indirizzo} {indirizzoFrase}";

  return (
    <>
      {esitoInfo ? <div className={`rounded-xl border p-3 text-sm flex items-start gap-2 ${esitoInfo.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"}`}>{esitoInfo.ok ? <Check size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}<span className="flex-1">{esitoInfo.testo}</span><button onClick={onEsitoVisto} className="text-xs underline shrink-0">ok</button></div> : null}

      <section className="lc-card p-5">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl brand-soft flex items-center justify-center shrink-0"><Mail size={22} className="brand-accent" /></span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-900 tracking-tight">Account Google</h3>
            <p className="text-sm text-stone-500 mt-0.5">
              {!stato ? "Controllo il collegamento…"
                : stato.errore ? <span className="text-red-600">{stato.errore}</span>
                : stato.collegato ? <><b className="text-green-700">Collegato</b> come <b>{stato.email || "account Google"}</b>{stato.ultimoInvio ? ` · ultima email il ${new Date(stato.ultimoInvio).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}</>
                : stato.configurato ? <><b className="text-amber-700">Non collegato</b> · i codici ci sono: manca il permesso del tuo account Google.</>
                : <><b>Spento</b> · servono due codici da Google (una volta sola) e poi il permesso del tuo account.</>}
            </p>
            {stato && stato.ultimoErrore ? <p className="text-xs text-red-600 mt-1">{stato.ultimoErrore}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {stato && stato.configurato ? <Bottone primario={!collegato} onClick={collega} disabled={!!lavoro}><Link2 size={15} /> {lavoro === "collega" ? "Apro Google…" : collegato ? "Ricollega / cambia account" : "Collega account Google"}</Bottone> : null}
          {collegato ? <Bottone primario onClick={prova} disabled={!!lavoro}><Send size={15} /> {lavoro === "prova" ? "Mando…" : "Manda un'email di prova"}</Bottone> : null}
          {collegato ? <Bottone pericolo onClick={scollega} disabled={!!lavoro}>Scollega</Bottone> : null}
        </div>
        <Esito m={msg} />
        <p className="text-[11px] text-stone-400 mt-3 leading-relaxed">Il gestionale chiede a Google solo di <b>inviare</b> email (mai di leggerle) e di leggere e scrivere i calendari. Le email partono dalla tua casella e restano fra le «Inviate».</p>
      </section>

      <section className="lc-card p-5">
        <button type="button" onClick={() => setGuida(!guida)} className="flex items-center justify-between w-full text-left">
          <h3 className="font-semibold text-stone-900 tracking-tight">1 · Codici del client Google {stato && stato.configurato ? <span className="text-xs font-medium text-green-700 ml-1">✓ inseriti</span> : null}</h3>
          <ChevronRight size={18} className={`text-stone-400 transition ${guida ? "rotate-90" : ""}`} />
        </button>
        {guida ? (
          <div className="mt-3">
            <ol className="text-sm text-stone-600 space-y-2.5 list-decimal pl-5 leading-relaxed">
              <li>Apri <Link href="https://console.cloud.google.com/projectcreate">Google Cloud Console</Link> col tuo account Google e crea un progetto (es. «Gestionale {(config.branding && config.branding.name) || "salone"}»).</li>
              <li>Nella <Link href="https://console.cloud.google.com/apis/library/gmail.googleapis.com">Libreria API → Gmail API</Link> premi <b>Abilita</b>; fai lo stesso con <Link href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com">Google Calendar API</Link>.</li>
              <li>Nella <Link href="https://console.cloud.google.com/auth/branding">Schermata consenso OAuth</Link> scegli <b>Esterno</b> (o <b>Interno</b> se hai Google Workspace), metti nome dell'app e la tua email. Fra i permessi (ambiti) aggiungi <code className="text-xs bg-stone-100 px-1 rounded">…/auth/gmail.send</code> e <code className="text-xs bg-stone-100 px-1 rounded">…/auth/calendar</code>. Poi in «Pubblico» premi <b>Pubblica app</b>: <b>se resta «in test», Google toglie il permesso ogni 7 giorni</b>. Per un uso tuo non serve la verifica di Google.</li>
              <li>In <Link href="https://console.cloud.google.com/apis/credentials">Credenziali</Link> → <b>Crea credenziali → ID client OAuth</b> → tipo <b>Applicazione web</b>. In «URI di reindirizzamento autorizzati» incolla esattamente:
                <div className="flex items-center gap-2 border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 mt-1.5">
                  <input readOnly value={redirect} onFocus={(e) => e.target.select()} className="flex-1 text-xs bg-transparent focus:outline-none text-stone-600 truncate" />
                  <button type="button" onClick={() => copia(redirect)} className="text-xs font-medium brand-bg px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 shrink-0"><Copy size={12} /> Copia</button>
                </div>
              </li>
              <li>Google ti mostra <b>ID client</b> e <b>Client secret</b>: copiali qui sotto e salva. Poi premi «Collega account Google»: al primo accesso può comparire «app non verificata», è normale per un'app tua: premi <b>Avanzate → Vai a …</b> e lascia tutte le spunte.</li>
            </ol>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <Field label="ID client"><input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="1234…apps.googleusercontent.com" className={inp} autoComplete="off" /></Field>
              <Field label={stato && stato.configurato ? "Client secret (già salvato: lascia vuoto per tenerlo)" : "Client secret"}><input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={stato && stato.configurato ? "••••••••" : "GOCSPX-…"} className={inp} autoComplete="new-password" /></Field>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Bottone primario onClick={salvaClient} disabled={!!lavoro || !clientId.trim()}>{lavoro === "config" ? "Salvo…" : "Salva i codici"}</Bottone>
              {stato && stato.configurato ? <Bottone pericolo onClick={dimentica} disabled={!!lavoro}>Cancella i codici</Bottone> : null}
            </div>
            <p className="text-[11px] text-stone-400 mt-3">Il client secret resta sul server e non torna più nel browser.</p>
          </div>
        ) : null}
      </section>

      <GcalAbbinamenti config={config} collegato={collegato} />

      <section className="lc-card p-5">
        <h3 className="font-semibold text-stone-900 tracking-tight flex items-center gap-2"><Send size={16} className="brand-accent" /> 3 · Email ai clienti</h3>
        <p className="text-sm text-stone-500 mt-0.5 mb-3">Dall'agenda, aprendo un appuntamento, puoi mandare al cliente una <b>conferma</b> o un <b>promemoria</b> col testo qui sotto. L'indirizzo è quello preso alla prenotazione o quello in anagrafica.</p>
        <div className="space-y-4">
          {[["conferma", "Conferma appuntamento"], ["promemoria", "Promemoria"]].map(([k, titolo]) => (
            <div key={k} className="rounded-xl border border-stone-200 p-3 space-y-2">
              <div className="text-sm font-medium text-stone-800">{titolo}</div>
              <Field label="Oggetto"><input defaultValue={g.modelli[k].oggetto} onBlur={(e) => salvaModello(k, { oggetto: e.target.value })} className={inp} /></Field>
              <Field label="Testo"><textarea defaultValue={g.modelli[k].testo} onBlur={(e) => salvaModello(k, { testo: e.target.value })} rows={6} className={`${inp} leading-relaxed`} /></Field>
            </div>
          ))}
          <p className="text-[11px] text-stone-400 leading-relaxed">Segnaposto che si riempiono da soli: <span className="text-stone-500">{SEGNAPOSTO}</span></p>
          <Field label="Firma (in fondo a ogni email)"><textarea defaultValue={g.firma} onBlur={(e) => salvaG({ firma: e.target.value })} rows={3} placeholder={`${(config.branding && config.branding.name) || "Il salone"}\nTel. …`} className={inp} /></Field>
          <label className="flex items-start gap-2.5 text-sm text-stone-700 cursor-pointer"><input type="checkbox" checked={!!g.copiaAMe} onChange={(e) => salvaG({ copiaAMe: e.target.checked })} className="mt-0.5" /><span><span className="font-medium block">Mandane una copia anche a me</span><span className="text-xs text-stone-400">In copia nascosta, alla tua casella Gmail.</span></span></label>
        </div>
      </section>

      <IcsCard />
    </>
  );
}

// 2 · Google Calendar: quale calendario per ogni operatore e per gli appuntamenti senza operatore
export function GcalAbbinamenti({ config, collegato }) {
  const [st, setSt] = useState(null);
  const [cals, setCals] = useState(null);
  const [mappa, setMappa] = useState({ op: {}, altro: "" });
  const [msg, setMsg] = useState(null);
  const [lavoro, setLavoro] = useState(false);
  const staff = (config && config.staff) || [];
  const carica = async () => {
    const s = await gcalApi("stato");
    setSt(s.ok ? s : { errore: s.error });
    if (s.ok) {
      setMappa({ op: { ...((s.mappa || {}).op || {}) }, altro: (s.mappa || {}).altro || "" });
      if (s.permesso) { const c = await gcalApi("calendari"); if (c.ok) setCals(c.calendari || []); else setMsg({ ok: false, testo: c.error }); }
    }
  };
  useEffect(() => { carica(); }, [collegato]);
  const salva = async (attivo) => {
    setLavoro(true);
    const r = await gcalApi("config", { attivo, mappa });
    setLavoro(false);
    if (!r.ok) { setMsg({ ok: false, testo: r.error }); return; }
    setMsg({ ok: true, testo: r.attivo ? "Salvato: da adesso l'agenda e Google Calendar vanno insieme." : "Collegamento con Google Calendar spento." });
    try { window.dispatchEvent(new Event("gcal-cambiato")); } catch (e) {}
    carica();
  };
  const scrivibili = (cals || []).filter((c) => c.scrivibile);
  const sel = (valore, onCambia) => (
    <select value={valore || ""} onChange={(e) => onCambia(e.target.value)} className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring">
      <option value="">— nessuno (non va su Google) —</option>
      {scrivibili.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.primario ? " (principale)" : ""}</option>)}
    </select>);
  return (
    <section className="lc-card p-5">
      <h3 className="font-semibold text-stone-900 tracking-tight flex items-center gap-2"><CalendarCheck size={16} className="brand-accent" /> 2 · Google Calendar a due vie</h3>
      <p className="text-sm text-stone-500 mt-0.5">Gli appuntamenti vanno nei calendari che hai già su Google, uno per ogni operatore. Quello che crei, sposti o cancelli su Google si vede anche in agenda (e viceversa), di solito entro un paio di minuti.</p>
      {!st ? <p className="text-sm text-stone-400 mt-3">Carico…</p>
        : st.errore ? <p className="text-sm text-red-600 mt-3">{st.errore}</p>
        : !st.collegato ? <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">Prima collega l'account Google qui sopra: è lo stesso account per email e calendario.</div>
        : !st.permesso ? <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 leading-relaxed">
            Google è collegato come <b>{st.email}</b>, ma manca il permesso del calendario. Due passi:
            <ol className="list-decimal pl-5 mt-1.5 space-y-1">
              <li>Su <Link href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com">Google Cloud → Google Calendar API</Link> premi <b>Abilita</b>; poi nella schermata consenso, fra gli ambiti, aggiungi <code className="text-xs bg-white px-1 rounded">…/auth/calendar</code>.</li>
              <li>Qui sopra premi <b>Ricollega / cambia account</b> e lascia tutte le spunte su Google.</li>
            </ol>
          </div>
        : <>
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mt-4 mb-2">Calendario di ogni operatore</div>
          {!cals ? <p className="text-sm text-stone-400">Carico i tuoi calendari da Google…</p> : null}
          {cals ? <div className="space-y-2">
            {staff.map((o) => (
              <div key={o.id} className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-stone-800 w-36 shrink-0 truncate">{o.name}</span>
                {sel(mappa.op[o.id], (v) => setMappa((m) => ({ ...m, op: { ...m.op, [o.id]: v } })))}
              </div>))}
            {staff.length === 0 ? <p className="text-sm text-stone-400">Nessun operatore configurato.</p> : null}
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide pt-2">Appuntamenti senza operatore</div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-stone-800 w-36 shrink-0">Solo cabina</span>
              {sel(mappa.altro, (v) => setMappa((m) => ({ ...m, altro: v })))}
            </div>
            <p className="text-[11px] text-stone-400">Gli appuntamenti fatti solo in cabina, senza operatore (es. lampada), vanno in questo calendario. Gli eventi creati lì su Google si vedono in agenda ma non bloccano nessuno.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Bottone primario disabled={lavoro} onClick={() => salva(true)}>{st.attivo ? "Salva gli abbinamenti" : "Attiva il collegamento"}</Bottone>
              {st.attivo ? <Bottone disabled={lavoro} onClick={() => { if (confirm("Spegnere il collegamento con Google Calendar? Gli appuntamenti già su Google restano lì.")) salva(false); }}>Spegni</Bottone> : null}
            </div>
          </div> : null}
          <p className="text-sm text-stone-500 mt-3">{st.attivo ? <>● <b className="text-green-700">Attivo</b> con l'account {st.email}.</> : "Spento: scegli i calendari e premi «Attiva il collegamento»."}{st.ultimoErrore ? <span className="block text-red-600 text-xs mt-1">Ultimo problema: {st.ultimoErrore}</span> : null}</p>
        </>}
      <Esito m={msg} />
    </section>
  );
}

// 4 · Feed iCalendar per telefono e Outlook
export function IcsCard() {
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { icsApi("stato").then((r) => { if (r.ok) setUrl(r.url || ""); else setMsg({ ok: false, testo: r.error }); }); }, []);
  const copia = async () => { try { await navigator.clipboard.writeText(url); setMsg({ ok: true, testo: "Indirizzo copiato." }); } catch (e) { prompt("Copia:", url); } };
  const rigenera = async () => {
    if (!confirm("Rigenerare l'indirizzo? Quello vecchio smette di funzionare: dovrai abbonare di nuovo i dispositivi.")) return;
    setBusy(true); const r = await icsApi("rigenera", {}); setBusy(false);
    if (r.ok) { setUrl(r.url); setMsg({ ok: true, testo: "Nuovo indirizzo pronto: il vecchio non vale più." }); } else setMsg({ ok: false, testo: r.error });
  };
  return (
    <section className="lc-card p-5">
      <h3 className="font-semibold text-stone-900 tracking-tight flex items-center gap-2"><Rss size={16} className="brand-accent" /> 4 · Calendario per telefono e Outlook</h3>
      <p className="text-sm text-stone-500 mt-0.5 mb-3">Un indirizzo da abbonare in sola lettura su iPhone (Impostazioni → Calendario → Account → Aggiungi account → Altro → Aggiungi calendario), Outlook o Google Calendar («Da URL»). Contiene nomi e orari dei clienti: <b>non condividerlo</b>. Non serve il collegamento con Google.</p>
      {url ? <div className="flex items-center gap-2 border border-stone-200 rounded-lg px-3 py-2 bg-stone-50">
        <input readOnly value={url} onFocus={(e) => e.target.select()} className="flex-1 text-xs bg-transparent focus:outline-none text-stone-600 truncate" />
        <button type="button" onClick={copia} className="text-xs font-medium brand-bg px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 shrink-0"><Copy size={12} /> Copia</button>
        <button type="button" onClick={rigenera} disabled={busy} className="text-xs font-medium border border-stone-300 text-stone-600 px-2.5 py-1.5 rounded-lg hover:bg-white shrink-0 inline-flex items-center gap-1 disabled:opacity-50"><RefreshCw size={12} className={busy ? "animate-spin" : ""} /> Rigenera</button>
      </div> : <p className="text-sm text-stone-400">Carico…</p>}
      <Esito m={msg} />
    </section>
  );
}
