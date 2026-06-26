import { useState, useEffect, useRef } from "react";
import { Calendar, Users, Star, Layers, ShoppingBag, BarChart3, MessageCircle, HeartPulse, KeyRound, Cloud, FileText, Check, ArrowRight, Sparkles, ShieldCheck, Smartphone, X, Gift } from "lucide-react";

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
            <a href="#piani" className="hidden sm:inline text-sm text-stone-500 hover:text-stone-900">Piani</a>
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

      {/* FOOTER */}
      <footer className="border-t border-stone-100">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col items-center gap-3 text-center">
          <img src="/lucentia-logo.png" alt="Lucentia" className="h-12 w-auto opacity-90" />
          <p className="text-xs text-stone-400">Gestionale per parrucchieri ed estetisti</p>
          <p className="text-[11px] text-stone-300 mt-2">© {new Date().getFullYear()} Lucentia · Tutti i diritti riservati</p>
        </div>
      </footer>

      {lead ? <LeadModal kind={lead.kind} piano={lead.piano} onClose={() => setLead(null)} onLogin={onLogin} /> : null}
    </div>
  );
}
