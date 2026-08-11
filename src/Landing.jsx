import { useState, useEffect, useRef } from "react";
import { Calendar, Users, Star, Layers, ShoppingBag, BarChart3, MessageCircle, HeartPulse, KeyRound, Cloud, FileText, Check, ArrowRight, Sparkles, ShieldCheck, Smartphone, X, Gift, CalendarClock, Globe, Phone, Mail, Monitor, PartyPopper } from "lucide-react";
import { CONTACTS } from "./contatti.js";

// Rivela il contenuto con un'animazione quando entra nello schermo (scroll reveal).
function Reveal({ children, delay = 0, className = "", as: Tag = "div", ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return (
    <Tag ref={ref} className={`lc-reveal ${shown ? "lc-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}

const GOLD = "#b8893b";
const GOLD_SOFT = "#f3e9d6";

const FEATURES = [
  [Calendar, "Agenda intelligente", "Appuntamenti per operatore, slot calcolati in automatico su orari e disponibilità, vista giorno e settimana."],
  [Users, "Scheda cliente", "Anagrafica completa, storico appuntamenti e servizi, tessera digitale e ricerca rapida."],
  [Star, "Fidelity & premi", "Programma punti automatico dai servizi e dalle vendite, con premi riscattabili dalla scheda cliente."],
  [Layers, "Pacchetti sedute", "Crea e gestisci pacchetti prepagati, scala le sedute usate e tieni traccia dei residui."],
  [ShoppingBag, "Vendite & magazzino", "Cassa integrata, prodotti con formati e giacenze, scontrino di riepilogo e carico magazzino."],
  [BarChart3, "Statistiche", "Andamento incassi, servizi più richiesti e attività dei clienti, sempre aggiornati."],
  [MessageCircle, "Marketing", "Promemoria e messaggi ai clienti via WhatsApp, direttamente dalla loro scheda."],
  [HeartPulse, "Allergeni & patologie", "Schede salute del cliente con avvisi sugli appuntamenti, per lavorare in sicurezza."],
  [KeyRound, "Accessi operatori", "Ogni operatore entra con le proprie credenziali e vede solo la sua agenda."],
  [Cloud, "Cloud & multi-dispositivo", "Dati sincronizzati e al sicuro: lavori da computer, tablet e telefono, ovunque ti trovi."],
  [FileText, "Listino PDF", "Genera un listino servizi elegante e personalizzato col tuo logo e i tuoi colori."],
  [ShieldCheck, "Backup e sicurezza", "Accesso protetto, dati isolati per ogni salone e backup dei tuoi dati."],
  [PartyPopper, "Eventi del salone", "Serate, corsi e open day in agenda: occupano gli operatori e hanno una pagina dedicata da condividere con un link."],
  [CalendarClock, "Mini-sito & prenotazioni online", "Una pagina web della tua attività con prenotazione online, eventi in programma e contenuti personalizzabili. Add-on, +€4/mese."],
];

const PLANS = [
  { name: "Basic", price: "9", full: null, act: "Attivazione € 100", highlight: false, feats: ["1 operatore", "Agenda e appuntamenti illimitati", "Scheda cliente"] },
  { name: "Smart", price: "12", full: "24", act: "Attivazione € 50", highlight: false, feats: ["Fino a 3 operatori", "Tutto di Basic", "Fidelity e pacchetti", "Magazzino e vendita prodotti"] },
  { name: "Pro", price: "19,50", full: "39", act: "Attivazione inclusa", highlight: true, feats: ["Operatori illimitati", "Tutto di Smart", "Statistiche e marketing", "Allergie e patologie"] },
];

function LeadModal({ kind, piano, onClose, onLogin }) {
  const demo = kind === "demo";
  const [f, setF] = useState({ ragione_sociale: "", piva: "", email: "", telefono: "", messaggio: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okDemo, setOkDemo] = useState(null);
  const [okLead, setOkLead] = useState(false);
  const set = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); setErr(""); };
  const submit = async () => {
    if (!f.ragione_sociale.trim() || !f.email.trim() || (demo && !f.telefono.trim())) { setErr("Compila ragione sociale, email" + (demo ? " e telefono." : ".")); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch(demo ? "/api/demo" : "/api/richiesta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(demo ? f : { ...f, piano }) });
      const j = await r.json().catch(() => ({}));
      setBusy(false);
      if (!r.ok) { setErr(j.error || "Si è verificato un errore. Riprova."); return; }
      if (demo) setOkDemo(j.email || f.email.trim().toLowerCase()); else setOkLead(true);
    } catch (e) { setBusy(false); setErr("Errore di rete. Riprova."); }
  };
  const GOLD = "#b8893b";
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 lc-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-auto lc-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-display font-semibold text-xl">{okDemo ? "Demo attivata!" : okLead ? "Richiesta inviata" : demo ? "Prova gratis 10 giorni" : "Richiedi informazioni"}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>
        {okDemo ? (
          <div className="text-sm text-stone-600 space-y-3">
            <p>La tua prova è pronta. Accedi con queste credenziali:</p>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
              <div>Email: <b>{okDemo}</b></div>
              <div>Password: <b>demo</b></div>
            </div>
            <p className="text-xs text-stone-400">La demo resta attiva per 10 giorni. Tutti i moduli sono disponibili, con alcuni limiti.</p>
            <button onClick={onLogin} className="w-full text-white font-semibold py-2.5 rounded-xl inline-flex items-center justify-center gap-2" style={{ background: "#1c1917" }}>Vai al login <ArrowRight size={16} /></button>
          </div>
        ) : okLead ? (
          <div className="text-sm text-stone-600 space-y-3">
            <p>Grazie! Abbiamo ricevuto la tua richiesta{piano ? ` per il piano ${piano}` : ""}. Ti ricontatteremo al più presto.</p>
            <button onClick={onClose} className="w-full text-white font-semibold py-2.5 rounded-xl" style={{ background: "#1c1917" }}>Chiudi</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-500 mb-4">{demo ? "Inserisci i tuoi dati: attiviamo subito una versione di prova con tutti i moduli." : `Lasciaci i tuoi dati${piano ? ` per il piano ${piano}` : ""} e ti ricontattiamo noi.`}</p>
            <div className="space-y-3">
              <input value={f.ragione_sociale} onChange={set("ragione_sociale")} placeholder="Ragione sociale / nome attività *" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
              <input value={f.email} onChange={set("email")} type="email" placeholder="Email *" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
              <input value={f.telefono} onChange={set("telefono")} placeholder={"Telefono" + (demo ? " *" : "")} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
              <input value={f.piva} onChange={set("piva")} placeholder="Partita IVA" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
              {!demo ? <textarea value={f.messaggio} onChange={set("messaggio")} rows={3} placeholder="Messaggio (facoltativo)" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" /> : null}
              {err ? <p className="text-xs text-red-500">{err}</p> : null}
              <button onClick={submit} disabled={busy} className="w-full text-white font-semibold py-2.5 rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: demo ? GOLD : "#1c1917" }}>{busy ? "Invio…" : demo ? "Attiva la demo" : "Invia richiesta"}</button>
              <p className="text-[11px] text-stone-400 text-center">Inviando accetti di essere ricontattato in merito a Lucentia.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Landing({ onLogin }) {
  const [lead, setLead] = useState(null);
  return (
    <div className="min-h-screen bg-white text-stone-800">
      {/* NAV */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-stone-100 lc-fade-in">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 group">
            <img src="/lucentia-mark.png" alt="Lucentia" className="h-9 w-9 rounded-lg transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110" />
            <span className="font-display text-xl font-semibold tracking-[0.12em]">LUCENTIA</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#funzionalita" className="hidden sm:inline text-sm text-stone-500 hover:text-stone-900">Funzionalità</a>
            <a href="#anteprime" className="hidden md:inline text-sm text-stone-500 hover:text-stone-900">Anteprime</a>
            <a href="#piani" className="hidden sm:inline text-sm text-stone-500 hover:text-stone-900">Piani</a>
            <a href="#contatti" className="hidden sm:inline text-sm text-stone-500 hover:text-stone-900">Contatti</a>
            <button onClick={onLogin} className="text-sm font-semibold text-white px-4 py-2 rounded-lg inline-flex items-center gap-1.5 lc-shine" style={{ background: "#1c1917" }}><KeyRound size={15} /> Login</button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 lc-fade-in" style={{ background: `radial-gradient(60% 60% at 50% 0%, ${GOLD_SOFT} 0%, #ffffff 70%)` }} />
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-50 lc-float" style={{ background: `radial-gradient(circle, ${GOLD_SOFT} 0%, transparent 70%)` }} />
        <div className="pointer-events-none absolute top-10 -right-20 w-80 h-80 rounded-full opacity-40 lc-float" style={{ background: `radial-gradient(circle, ${GOLD_SOFT} 0%, transparent 70%)`, animationDelay: "1.4s" }} />
        <div className="relative max-w-4xl mx-auto px-5 pt-16 pb-20 text-center">
          <img src="/lucentia-logo.png" alt="Lucentia — Gestionale per parrucchieri ed estetisti" className="h-28 sm:h-36 w-auto mx-auto mb-8 lc-pop-in" />
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full mb-5 lc-fade-up" style={{ background: GOLD_SOFT, color: GOLD, animationDelay: "120ms" }}><Sparkles size={13} className="lc-float" /> Gestionale per parrucchieri ed estetisti</div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold leading-[1.08] tracking-tight text-stone-900 lc-fade-up" style={{ animationDelay: "200ms" }}>Tutto il tuo salone,<br className="hidden sm:block" /> in un'unica app <span className="font-display-i" style={{ color: GOLD }}>elegante</span>.</h1>
          <p className="mt-5 text-base sm:text-lg text-stone-500 max-w-2xl mx-auto lc-fade-up" style={{ animationDelay: "300ms" }}>Agenda, clienti, fidelity, vendite, magazzino e statistiche. Sul cloud, sempre con te, semplice da usare ogni giorno.</p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap lc-fade-up" style={{ animationDelay: "400ms" }}>
            <button onClick={() => setLead({ kind: "demo" })} className="text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 shadow-sm lc-shine hover:shadow-lg hover:-translate-y-0.5 transition" style={{ background: GOLD }}><Sparkles size={17} /> Prova gratis 10 giorni</button>
            <button onClick={onLogin} className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 border hover:-translate-y-0.5 hover:bg-stone-900 hover:text-white transition" style={{ borderColor: "#1c1917", color: "#1c1917" }}>Accedi <ArrowRight size={17} /></button>
            <a href="#piani" className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 text-stone-500 hover:text-stone-800">Vedi i piani</a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-5 text-xs text-stone-400 flex-wrap lc-fade-up" style={{ animationDelay: "500ms" }}>
            <span className="inline-flex items-center gap-1.5"><Cloud size={14} /> Sul cloud</span>
            <span className="inline-flex items-center gap-1.5"><Smartphone size={14} /> Multi-dispositivo</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> Dati protetti</span>
          </div>
        </div>
      </section>

      {/* COS'È */}
      <section className="max-w-4xl mx-auto px-5 py-14 text-center">
        <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Cos'è Lucentia</Reveal>
        <Reveal as="p" delay={80} className="text-xl sm:text-[1.7rem] sm:leading-[1.5] text-stone-700 leading-relaxed font-light">Lucentia è il gestionale pensato per <span className="font-display-i font-medium text-stone-900">parrucchieri e centri estetici</span>: organizza gli appuntamenti, fidelizza i clienti, gestisci vendite e magazzino e tieni tutto sotto controllo da un'unica schermata, con un'interfaccia curata e immediata.</Reveal>
      </section>

      {/* FUNZIONALITÀ */}
      <section id="funzionalita" className="bg-stone-50 border-y border-stone-100">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-12">
            <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Funzionalità</Reveal>
            <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">Tutto ciò che serve al tuo salone</Reveal>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(([Icon, title, desc], i) => (
              <Reveal key={i} delay={(i % 3) * 90} className="group bg-white rounded-2xl border border-stone-200 p-6 lc-lift">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: GOLD_SOFT, color: GOLD }}><Icon size={20} /></div>
                <h3 className="font-semibold text-stone-900 mb-1.5">{title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ANTEPRIME · DENTRO L'APP */}
      <section id="anteprime" className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-10">
            <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Dentro l'app</Reveal>
            <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">Guarda Lucentia dal vivo</Reveal>
            <Reveal as="p" delay={160} className="mt-3 text-stone-500 max-w-2xl mx-auto">La stessa app, identica su computer, tablet e telefono: apri l'agenda alla reception e ritrovi tutto sul cellulare, ovunque sei.</Reveal>
          </div>
          <Reveal delay={200} className="relative max-w-4xl mx-auto pb-10 sm:pb-14">
            {/* Cornice "browser" con l'agenda desktop */}
            <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden" style={{ boxShadow: "var(--lc-shadow-xl)" }}>
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-stone-50 border-b border-stone-100">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-200" /><span className="w-2.5 h-2.5 rounded-full bg-stone-200" /><span className="w-2.5 h-2.5 rounded-full bg-stone-200" />
                <span className="ml-3 text-[11px] text-stone-300 tracking-wide inline-flex items-center gap-1"><Monitor size={11} /> lucentia-app.com</span>
              </div>
              <img src="/anteprime/agenda-desktop.webp" alt="Agenda appuntamenti di Lucentia su desktop: giornata del salone con appuntamenti per operatore" width="1600" height="1000" loading="lazy" className="w-full h-auto" />
            </div>
            {/* Telefono in sovrapposizione con l'agenda mobile */}
            <div className="absolute -bottom-2 -right-2 sm:bottom-0 sm:right-6 w-32 sm:w-44 rounded-[1.8rem] sm:rounded-[2.2rem] border-[5px] sm:border-[6px] border-stone-900 bg-stone-900 overflow-hidden rotate-3 lc-float" style={{ boxShadow: "var(--lc-shadow-xl)" }}>
              <img src="/anteprime/agenda-mobile.webp" alt="Agenda di Lucentia su smartphone" width="780" height="1688" loading="lazy" className="w-full h-auto" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* APPROFONDIMENTO FUNZIONALITÀ */}
      <section id="dettagli" className="bg-stone-50 border-y border-stone-100">
        <div className="max-w-6xl mx-auto px-5 py-16 space-y-16 sm:space-y-20">
          {[
            {
              icon: Calendar, kicker: "Agenda & appuntamenti", title: "La giornata del salone, sempre sotto controllo",
              text: "L'agenda di Lucentia mostra gli appuntamenti di ogni operatore con vista giorno, 3 giorni o settimana. Gli orari disponibili vengono calcolati in automatico su turni e disponibilità, e ogni appuntamento tiene traccia di servizio, durata, cliente e incasso.",
              points: ["Vista per operatore o per tutto il salone", "Slot calcolati su orari e disponibilità reali", "Stati chiari: da svolgere, svolto, incassato", "Le prenotazioni online arrivano direttamente in agenda"],
              img: "/anteprime/agenda-desktop.webp", alt: "Agenda del gestionale per parrucchieri Lucentia con appuntamenti della giornata", flip: false,
            },
            {
              icon: Users, kicker: "Clienti, fidelity & pacchetti", title: "Ogni cliente ha la sua storia",
              text: "Anagrafica completa con storico di appuntamenti e acquisti, tessera digitale, punti fedeltà accumulati in automatico da servizi e vendite, pacchetti prepagati con sedute residue e schede salute con allergie e patologie che generano avvisi sugli appuntamenti.",
              points: ["Scheda cliente con storico completo", "Punti fedeltà e premi riscattabili", "Pacchetti prepagati con sedute residue", "Avvisi automatici per allergie e patologie"],
              img: "/anteprime/clienti-desktop.webp", alt: "Scheda clienti del gestionale Lucentia con fidelity e pacchetti", flip: true,
              phone: { img: "/anteprime/clienti-mobile.webp", alt: "Elenco clienti di Lucentia su smartphone" },
            },
            {
              icon: ShoppingBag, kicker: "Cassa, vendite & magazzino", title: "Vendi prodotti e tieni le scorte in ordine",
              text: "La cassa integrata registra vendite di prodotti e servizi, con scontrino di riepilogo e possibilità di collegare ogni vendita al cliente. Il magazzino si aggiorna da solo: carichi i prodotti quando arrivano, le giacenze scalano a ogni vendita.",
              points: ["Cassa rapida con riepilogo di giornata", "Prodotti con formati, prezzi e giacenze", "Carico magazzino e storico movimenti", "Buoni regalo e pacchetti vendibili in cassa"],
              img: "/anteprime/vendite-desktop.webp", alt: "Cassa e magazzino del gestionale per saloni Lucentia", flip: false,
            },
            {
              icon: BarChart3, kicker: "Statistiche & marketing", title: "Decidi con i numeri, fidelizza con i messaggi",
              text: "Incassi di servizi e prodotti, servizi più richiesti, clienti più attivi: le statistiche si aggiornano in tempo reale su 30 giorni, 90 giorni o tutto lo storico. E dalla scheda cliente parti con promemoria e promozioni via WhatsApp, senza esportare nulla.",
              points: ["Andamento incassi servizi e prodotti", "Classifiche di servizi e prodotti più venduti", "Clienti più attivi e frequenza visite", "Messaggi WhatsApp direttamente dalla scheda"],
              img: "/anteprime/statistiche-desktop.webp", alt: "Statistiche del salone nel gestionale Lucentia: incassi e servizi più richiesti", flip: true,
            },
            {
              icon: PartyPopper, kicker: "Eventi & mini-sito", title: "Il tuo salone ha una pagina web, e i tuoi eventi pure",
              text: "Il link di prenotazione è un vero mini-sito della tua attività: copertina, presentazione, orari, social e prenotazione online. E quando organizzi una serata, un corso o un open day, l'evento occupa gli operatori coinvolti in agenda e ha una pagina dedicata con foto e dettagli, pronta da condividere su WhatsApp e Instagram con un link.",
              points: ["Mini-sito con prenotazioni, eventi e contenuti personalizzabili", "Eventi in agenda con operatori occupati automaticamente", "Pagina evento con copertina, dettagli e pulsante WhatsApp", "Tutto col tuo logo e i tuoi colori"],
              img: "/anteprime/minisito-desktop.webp", alt: "Mini-sito pubblico di un salone su Lucentia con calendario eventi", flip: false,
              phone: { img: "/anteprime/evento-mobile.webp", alt: "Pagina pubblica di un evento del salone su smartphone" },
            },
          ].map((r, i) => (
            <div key={i} className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <Reveal className={r.flip ? "lg:order-2" : ""}>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-4" style={{ background: "#fff", color: GOLD, border: `1px solid ${GOLD_SOFT}` }}><r.icon size={13} /> {r.kicker}</div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 leading-tight">{r.title}</h3>
                <p className="mt-3 text-stone-500 leading-relaxed">{r.text}</p>
                <ul className="mt-5 space-y-2.5">
                  {r.points.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-stone-700"><Check size={16} style={{ color: GOLD }} className="mt-0.5 shrink-0" /> {p}</li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={120} className={`relative ${r.flip ? "lg:order-1" : ""} ${r.phone ? "pb-8 pr-6 sm:pr-10" : ""}`}>
                <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden lc-lift" style={{ boxShadow: "var(--lc-shadow-lg)" }}>
                  <img src={r.img} alt={r.alt} width="1600" height="1000" loading="lazy" className="w-full h-auto" />
                </div>
                {r.phone ? (
                  <div className="absolute bottom-0 right-0 w-24 sm:w-32 rounded-[1.4rem] sm:rounded-[1.8rem] border-[4px] sm:border-[5px] border-stone-900 bg-stone-900 overflow-hidden -rotate-3" style={{ boxShadow: "var(--lc-shadow-lg)" }}>
                    <img src={r.phone.img} alt={r.phone.alt} width="780" height="1688" loading="lazy" className="w-full h-auto" />
                  </div>
                ) : null}
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* ADD-ON · PRENOTAZIONI ONLINE */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `radial-gradient(70% 70% at 50% 0%, ${GOLD_SOFT} 0%, #ffffff 65%)` }} />
        <div className="relative max-w-5xl mx-auto px-5 py-16">
          <div className="rounded-3xl border border-stone-200 bg-white/80 backdrop-blur shadow-sm overflow-hidden">
            <div className="grid lg:grid-cols-2">
              <div className="p-8 sm:p-10">
                <Reveal className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-4" style={{ background: GOLD_SOFT, color: GOLD }}><Sparkles size={13} /> Add-on · Novità</Reveal>
                <Reveal as="h2" delay={60} className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">Il mini-sito del tuo salone, con prenotazioni <span className="font-display-i" style={{ color: GOLD }}>online</span>.</Reveal>
                <Reveal as="p" delay={120} className="mt-3 text-stone-500 leading-relaxed">Condividi un link — su WhatsApp, Instagram, Google o un QR in negozio — e i clienti trovano una pagina web della tua attività: prenotano da soli 24 ore su 24, scoprono gli eventi in programma e tutte le info utili.</Reveal>
                <div className="mt-6 space-y-3">
                  {[
                    [Globe, "Mini-sito col tuo brand", "Copertina, presentazione, orari, social e contatti: personalizzi tutto dalle impostazioni, senza login per il cliente."],
                    [CalendarClock, "Niente vuoti in agenda", "Gli orari si incastrano in automatico dopo gli appuntamenti — oppure a griglia, come preferisci."],
                    [PartyPopper, "Eventi in vetrina", "Serate, corsi e open day compaiono da soli sul mini-sito, ognuno con la sua pagina condivisibile."],
                    [Users, "Scelta dell'operatore", "Il cliente sceglie chi preferisce, con foto o avatar personalizzati, e gestisce la prenotazione in autonomia."],
                  ].map(([Icon, t, d], i) => (
                    <Reveal key={i} delay={160 + i * 70} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: GOLD_SOFT, color: GOLD }}><Icon size={17} /></div>
                      <div><div className="font-semibold text-stone-900 text-sm">{t}</div><div className="text-sm text-stone-500 leading-relaxed">{d}</div></div>
                    </Reveal>
                  ))}
                </div>
              </div>
              <div className="relative p-8 sm:p-10 flex flex-col justify-center items-center text-center border-t lg:border-t-0 lg:border-l border-stone-100" style={{ background: "#1c1917" }}>
                <Reveal className="lc-float">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: GOLD, color: "#1c1917" }}><CalendarClock size={30} /></div>
                </Reveal>
                <Reveal as="div" delay={80} className="mt-5 text-white/60 text-sm">Add-on opzionale</Reveal>
                <Reveal as="div" delay={120} className="mt-1 flex items-baseline justify-center gap-1.5"><span className="text-5xl font-bold text-white">€4</span><span className="text-white/50">/mese</span></Reveal>
                <Reveal as="p" delay={180} className="mt-3 text-white/50 text-xs leading-relaxed max-w-[16rem]">Attivabile dai piani Smart e Pro (non disponibile con Basic). IVA esclusa.</Reveal>
                <Reveal delay={240}><button onClick={() => setLead({ kind: "licenza", piano: "Pro" })} className="mt-6 font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 lc-shine hover:-translate-y-0.5 transition" style={{ background: GOLD, color: "#1c1917" }}>Lo voglio nel mio salone <ArrowRight size={17} /></button></Reveal>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PIANI */}
      <section id="piani" style={{ background: "#1c1917" }} className="text-white">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-12">
            <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Piani di licenza</Reveal>
            <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold">Scegli il piano su misura</Reveal>
            <Reveal as="p" delay={160} className="mt-3 text-stone-400 text-sm">Canone mensile, IVA esclusa. Nessun vincolo nascosto.</Reveal>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {PLANS.map((p, pi) => (
              <Reveal key={p.name} delay={pi * 110} className={`rounded-2xl p-6 flex flex-col lc-lift ${p.highlight ? "lc-glow-card sm:-translate-y-2" : ""}`} style={{ background: p.highlight ? "#26231f" : "#211e1b", border: `1px solid ${p.highlight ? GOLD : "#3a352f"}` }}>
                {p.highlight ? <div className="self-start text-[11px] font-semibold px-2.5 py-1 rounded-full mb-3" style={{ background: GOLD, color: "#1c1917" }}>Consigliato</div> : <div className="h-[26px] mb-3" />}
                <div className="font-display text-2xl font-semibold" style={{ color: p.highlight ? GOLD : "#fff" }}>{p.name}</div>
                {p.full ? <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(184,137,59,0.18)", color: GOLD }}>Prezzo di lancio −50%</div> : null}
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold">€{p.price}</span>
                  {p.full ? <span className="text-lg text-stone-500 line-through">€{p.full}</span> : null}
                  <span className="text-stone-400 text-sm">/mese</span>
                </div>
                <div className="text-xs text-stone-400 mt-1">{p.act} · IVA escl.</div>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {p.feats.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-200"><Check size={16} style={{ color: GOLD }} className="mt-0.5 shrink-0" /> {f}</li>
                  ))}
                </ul>
                <button onClick={() => setLead({ kind: "licenza", piano: p.name })} className={`mt-6 w-full font-semibold py-2.5 rounded-xl transition hover:-translate-y-0.5 ${p.highlight ? "lc-shine" : "hover:bg-white/5"}`} style={p.highlight ? { background: GOLD, color: "#1c1917" } : { background: "transparent", color: "#fff", border: "1px solid #4a443d" }}>Inizia ora</button>
              </Reveal>
            ))}
          </div>
          <p className="text-center text-xs text-stone-500 mt-8">Tutti i piani includono Agenda e Scheda cliente. Gli operatori e i moduli si attivano in base al piano scelto.</p>
          <p className="text-center text-xs mt-2" style={{ color: GOLD }}>+ Add-on Prenotazioni online: € 4/mese, attivabile dai piani Smart e Pro.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-5 py-16 text-center">
        <Reveal as="img" src="/lucentia-mark.png" alt="Lucentia" className="h-14 w-14 rounded-2xl mx-auto mb-5 lc-float" />
        <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">Pronto a far brillare il tuo salone?</Reveal>
        <Reveal as="p" delay={160} className="mt-3 text-stone-500">Accedi con le credenziali ricevute dal tuo fornitore e inizia subito.</Reveal>
        <Reveal delay={240}>
          <button onClick={onLogin} className="mt-7 text-white font-semibold px-7 py-3 rounded-xl inline-flex items-center gap-2 lc-shine hover:-translate-y-0.5 hover:shadow-lg transition" style={{ background: "#1c1917" }}>Accedi a Lucentia <ArrowRight size={17} /></button>
        </Reveal>
      </section>

      {/* CONTATTI */}
      <section id="contatti" className="bg-stone-50 border-t border-stone-100">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-10">
            <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Contatti</Reveal>
            <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">Parliamo del tuo salone</Reveal>
            <Reveal as="p" delay={160} className="mt-3 text-stone-500 max-w-2xl mx-auto">Lucentia è distribuito da <b className="text-stone-700">{CONTACTS.nome}</b>. Chiamaci, scrivici o lasciaci i tuoi dati: ti rispondiamo noi, senza call center.</Reveal>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              [Phone, "Telefono", CONTACTS.tel.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3"), `tel:+39${CONTACTS.tel}`, "Rispondiamo in orario d'ufficio", false],
              [MessageCircle, "WhatsApp", "Scrivici subito", `https://wa.me/39${CONTACTS.tel}`, "Il canale più rapido", true],
              [Mail, "Email", CONTACTS.email, `mailto:${CONTACTS.email}`, "Per richieste e preventivi", false],
              [Globe, "Sito web", CONTACTS.sito, `https://${CONTACTS.sito}`, "Scopri chi siamo", true],
            ].map(([Icon, title, value, href, sub, ext], i) => (
              <Reveal key={i} delay={i * 90}>
                <a href={href} {...(ext ? { target: "_blank", rel: "noreferrer" } : {})} className="block bg-white rounded-2xl border border-stone-200 p-5 h-full lc-lift">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: GOLD_SOFT, color: GOLD }}><Icon size={19} /></div>
                  <div className="font-semibold text-stone-900 text-sm">{title}</div>
                  <div className="text-sm mt-0.5 break-all" style={{ color: GOLD }}>{value}</div>
                  <div className="text-xs text-stone-400 mt-1.5">{sub}</div>
                </a>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200} className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <button onClick={() => setLead({ kind: "licenza" })} className="text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 lc-shine hover:-translate-y-0.5 hover:shadow-lg transition" style={{ background: "#1c1917" }}><Mail size={16} /> Richiedi informazioni</button>
            <button onClick={() => setLead({ kind: "demo" })} className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 border hover:-translate-y-0.5 transition bg-white" style={{ borderColor: GOLD, color: GOLD }}><Sparkles size={16} /> Prova gratis 10 giorni</button>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-stone-100">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col items-center gap-3 text-center">
          <img src="/lucentia-logo.png" alt="Lucentia" className="h-12 w-auto opacity-90" />
          <p className="text-xs text-stone-400">Gestionale per parrucchieri ed estetisti</p>
          <p className="text-xs text-stone-400">Distribuito da {CONTACTS.nome} · <a href={`tel:+39${CONTACTS.tel}`} className="hover:text-stone-600">{CONTACTS.tel.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}</a> · <a href={`mailto:${CONTACTS.email}`} className="hover:text-stone-600">{CONTACTS.email}</a></p>
          <p className="text-[11px] text-stone-300 mt-2">© {new Date().getFullYear()} Lucentia · Tutti i diritti riservati</p>
        </div>
      </footer>

      {lead ? <LeadModal kind={lead.kind} piano={lead.piano} onClose={() => setLead(null)} onLogin={onLogin} /> : null}
    </div>
  );
}
