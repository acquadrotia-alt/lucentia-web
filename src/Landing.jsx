import { useState } from "react";
import { Calendar, Users, Star, Layers, ShoppingBag, BarChart3, MessageCircle, HeartPulse, KeyRound, Cloud, FileText, Check, ArrowRight, Sparkles, ShieldCheck, Smartphone, X, Gift } from "lucide-react";

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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-lg">{okDemo ? "Demo attivata!" : okLead ? "Richiesta inviata" : demo ? "Prova gratis 10 giorni" : "Richiedi informazioni"}</h3>
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
      <style>{`html{scroll-behavior:smooth}`}</style>

      {/* NAV */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/lucentia-mark.png" alt="Lucentia" className="h-9 w-9 rounded-lg" />
            <span className="text-lg font-semibold tracking-wide">LUCENTIA</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#funzionalita" className="hidden sm:inline text-sm text-stone-500 hover:text-stone-900">Funzionalità</a>
            <a href="#piani" className="hidden sm:inline text-sm text-stone-500 hover:text-stone-900">Piani</a>
            <button onClick={onLogin} className="text-sm font-semibold text-white px-4 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: "#1c1917" }}><KeyRound size={15} /> Login</button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `radial-gradient(60% 60% at 50% 0%, ${GOLD_SOFT} 0%, #ffffff 70%)` }} />
        <div className="relative max-w-4xl mx-auto px-5 pt-16 pb-20 text-center">
          <img src="/lucentia-logo.png" alt="Lucentia — Gestionale per parrucchieri ed estetisti" className="h-28 sm:h-36 w-auto mx-auto mb-8" />
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full mb-5" style={{ background: GOLD_SOFT, color: GOLD }}><Sparkles size={13} /> Gestionale per parrucchieri ed estetisti</div>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight text-stone-900">Tutto il tuo salone,<br className="hidden sm:block" /> in un'unica app elegante.</h1>
          <p className="mt-5 text-base sm:text-lg text-stone-500 max-w-2xl mx-auto">Agenda, clienti, fidelity, vendite, magazzino e statistiche. Sul cloud, sempre con te, semplice da usare ogni giorno.</p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <button onClick={() => setLead({ kind: "demo" })} className="text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 shadow-sm" style={{ background: GOLD }}><Sparkles size={17} /> Prova gratis 10 giorni</button>
            <button onClick={onLogin} className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 border" style={{ borderColor: "#1c1917", color: "#1c1917" }}>Accedi <ArrowRight size={17} /></button>
            <a href="#piani" className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 text-stone-500 hover:text-stone-800">Vedi i piani</a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-5 text-xs text-stone-400 flex-wrap">
            <span className="inline-flex items-center gap-1.5"><Cloud size={14} /> Sul cloud</span>
            <span className="inline-flex items-center gap-1.5"><Smartphone size={14} /> Multi-dispositivo</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> Dati protetti</span>
          </div>
        </div>
      </section>

      {/* COS'È */}
      <section className="max-w-4xl mx-auto px-5 py-14 text-center">
        <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Cos'è Lucentia</div>
        <p className="text-xl sm:text-2xl text-stone-700 leading-relaxed font-light">Lucentia è il gestionale pensato per <span className="font-medium text-stone-900">parrucchieri e centri estetici</span>: organizza gli appuntamenti, fidelizza i clienti, gestisci vendite e magazzino e tieni tutto sotto controllo da un'unica schermata, con un'interfaccia curata e immediata.</p>
      </section>

      {/* FUNZIONALITÀ */}
      <section id="funzionalita" className="bg-stone-50 border-y border-stone-100">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Funzionalità</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">Tutto ciò che serve al tuo salone</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(([Icon, title, desc], i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 p-6 hover:shadow-md transition">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: GOLD_SOFT, color: GOLD }}><Icon size={20} /></div>
                <h3 className="font-semibold text-stone-900 mb-1.5">{title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PIANI */}
      <section id="piani" style={{ background: "#1c1917" }} className="text-white">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Piani di licenza</div>
            <h2 className="text-2xl sm:text-3xl font-bold">Scegli il piano su misura</h2>
            <p className="mt-3 text-stone-400 text-sm">Canone mensile, IVA esclusa. Nessun vincolo nascosto.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {PLANS.map((p) => (
              <div key={p.name} className="rounded-2xl p-6 flex flex-col" style={{ background: p.highlight ? "#26231f" : "#211e1b", border: `1px solid ${p.highlight ? GOLD : "#3a352f"}` }}>
                {p.highlight ? <div className="self-start text-[11px] font-semibold px-2.5 py-1 rounded-full mb-3" style={{ background: GOLD, color: "#1c1917" }}>Consigliato</div> : <div className="h-[26px] mb-3" />}
                <div className="text-lg font-semibold" style={{ color: p.highlight ? GOLD : "#fff" }}>{p.name}</div>
                {p.full ? <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(184,137,59,0.18)", color: GOLD }}>Prezzo di lancio −50%</div> : null}
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-bold">€{p.price}</span>
                  {p.full ? <span className="text-lg text-stone-500 line-through">€{p.full}</span> : null}
                  <span className="text-stone-400 text-sm">/mese</span>
                </div>
                <div className="text-xs text-stone-400 mt-1">{p.act} · IVA escl.</div>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {p.feats.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-200"><Check size={16} style={{ color: GOLD }} className="mt-0.5 shrink-0" /> {f}</li>
                  ))}
                </ul>
                <button onClick={() => setLead({ kind: "licenza", piano: p.name })} className="mt-6 w-full font-semibold py-2.5 rounded-xl transition" style={p.highlight ? { background: GOLD, color: "#1c1917" } : { background: "transparent", color: "#fff", border: "1px solid #4a443d" }}>Inizia ora</button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-stone-500 mt-8">Tutti i piani includono Agenda e Scheda cliente. Gli operatori e i moduli si attivano in base al piano scelto.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-5 py-16 text-center">
        <img src="/lucentia-mark.png" alt="Lucentia" className="h-14 w-14 rounded-2xl mx-auto mb-5" />
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">Pronto a far brillare il tuo salone?</h2>
        <p className="mt-3 text-stone-500">Accedi con le credenziali ricevute dal tuo fornitore e inizia subito.</p>
        <button onClick={onLogin} className="mt-7 text-white font-semibold px-7 py-3 rounded-xl inline-flex items-center gap-2" style={{ background: "#1c1917" }}>Accedi a Lucentia <ArrowRight size={17} /></button>
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
