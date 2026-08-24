import { createContext, useContext, useState, useEffect, useRef } from "react";
import { KeyRound, ArrowRight, X, Sparkles, Phone, Mail, MessageCircle, Globe, Check } from "lucide-react";
import { CONTACTS } from "../contatti.js";

// ===== Token grafici condivisi dal sito pubblico =====
export const GOLD = "#b8893b";
export const GOLD_SOFT = "#f3e9d6";
export const INK = "#1c1917";

// ===== Contesto di navigazione del sito pubblico =====
// Il sito è composto da tre pagine reali (/, /funzionalita, /piani): la
// navigazione avviene con la History API, senza ricaricare l'app.
export const SiteCtx = createContext({ path: "/", go: () => {}, onLogin: () => {}, openLead: () => {} });
export function useSite() { return useContext(SiteCtx); }

// Rivela il contenuto con un'animazione quando entra nello schermo (scroll reveal).
export function Reveal({ children, delay = 0, className = "", as: Tag = "div", ...rest }) {
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

// Link interno al sito: resta un <a href> vero (per SEO e per "apri in nuova
// scheda"), ma con click normale naviga senza ricaricare la pagina.
export function SiteLink({ to, className = "", children, ...rest }) {
  const { go } = useSite();
  const click = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(to);
  };
  return <a href={to} onClick={click} className={className} {...rest}>{children}</a>;
}

// ===== Modale richiesta demo / informazioni =====
export function LeadModal({ kind, piano, onClose, onLogin }) {
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
            <button onClick={onLogin} className="w-full text-white font-semibold py-2.5 rounded-xl inline-flex items-center justify-center gap-2" style={{ background: INK }}>Vai al login <ArrowRight size={16} /></button>
          </div>
        ) : okLead ? (
          <div className="text-sm text-stone-600 space-y-3">
            <p>Grazie! Abbiamo ricevuto la tua richiesta{piano ? ` per il piano ${piano}` : ""}. Ti ricontatteremo al più presto.</p>
            <button onClick={onClose} className="w-full text-white font-semibold py-2.5 rounded-xl" style={{ background: INK }}>Chiudi</button>
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
              <button onClick={submit} disabled={busy} className="w-full text-white font-semibold py-2.5 rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: demo ? GOLD : INK }}>{busy ? "Invio…" : demo ? "Attiva la demo" : "Invia richiesta"}</button>
              <p className="text-[11px] text-stone-400 text-center">Inviando accetti di essere ricontattato in merito a Lucentia.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===== Intestazione con la navigazione tra le pagine =====
export const NAV = [["/", "Home"], ["/funzionalita", "Funzionalità"], ["/piani", "Piani"], ["/#contatti", "Contatti"]];

export function SiteHeader() {
  const { path, onLogin } = useSite();
  const isCur = (to) => (to.startsWith("/#") ? false : to === path);
  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-stone-100 lc-fade-in">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <SiteLink to="/" className="flex items-center gap-2.5 group" aria-label="Lucentia — home">
          <img src="/lucentia-mark.png" alt="Lucentia" className="h-9 w-9 rounded-lg transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110" />
          <span className="font-display text-xl font-semibold tracking-[0.12em]">LUCENTIA</span>
        </SiteLink>
        <div className="flex items-center gap-6">
          <nav className="hidden sm:flex items-center gap-6">
            {NAV.map(([to, label]) => (
              <SiteLink key={to} to={to} className={`text-sm transition ${isCur(to) ? "font-semibold text-stone-900" : "text-stone-500 hover:text-stone-900"}`} style={isCur(to) ? { color: GOLD } : undefined}>{label}</SiteLink>
            ))}
          </nav>
          <button onClick={onLogin} className="text-sm font-semibold text-white px-4 py-2 rounded-lg inline-flex items-center gap-1.5 lc-shine shrink-0" style={{ background: INK }}><KeyRound size={15} /> Login</button>
        </div>
      </div>
      {/* Navigazione compatta su mobile */}
      <nav className="sm:hidden border-t border-stone-100 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {NAV.map(([to, label]) => (
          <SiteLink key={to} to={to} className={`text-[13px] whitespace-nowrap px-3 py-1.5 rounded-full transition ${isCur(to) ? "font-semibold" : "text-stone-500"}`} style={isCur(to) ? { background: GOLD_SOFT, color: GOLD } : undefined}>{label}</SiteLink>
        ))}
      </nav>
    </header>
  );
}

// ===== Sezione contatti (vive nella home, ancorata a #contatti) =====
export const CONTATTI = [
  [Phone, "Telefono", CONTACTS.tel.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3"), `tel:+39${CONTACTS.tel}`, "Rispondiamo in orario d'ufficio", false],
  [MessageCircle, "WhatsApp", "Scrivici subito", `https://wa.me/39${CONTACTS.tel}`, "Il canale più rapido", true],
  [Mail, "Email", CONTACTS.email, `mailto:${CONTACTS.email}`, "Per richieste e preventivi", false],
  [Globe, "Sito web", CONTACTS.sito, `https://${CONTACTS.sito}`, "Scopri chi siamo", true],
];

export function ContattiSection() {
  const { openLead } = useSite();
  return (
    <section id="contatti" className="bg-stone-50 border-t border-stone-100 scroll-mt-24">
      <div className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Contatti</Reveal>
          <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">Parliamo del tuo salone</Reveal>
          <Reveal as="p" delay={160} className="mt-3 text-stone-500 max-w-2xl mx-auto">Lucentia è distribuito da <b className="text-stone-700">{CONTACTS.nome}</b>. Chiamaci, scrivici o lasciaci i tuoi dati: ti rispondiamo noi, senza call center.</Reveal>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {CONTATTI.map(([Icon, title, value, href, sub, ext], i) => (
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
          <button onClick={() => openLead({ kind: "licenza" })} className="text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 lc-shine hover:-translate-y-0.5 hover:shadow-lg transition" style={{ background: INK }}><Mail size={16} /> Richiedi informazioni</button>
          <button onClick={() => openLead({ kind: "demo" })} className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 border hover:-translate-y-0.5 transition bg-white" style={{ borderColor: GOLD, color: GOLD }}><Sparkles size={16} /> Prova gratis 10 giorni</button>
        </Reveal>
      </div>
    </section>
  );
}

// ===== Blocco di chiusura riutilizzabile (pagine interne) =====
export function CtaBand({ titolo, testo, azione, piano }) {
  const { openLead } = useSite();
  return (
    <section className="max-w-4xl mx-auto px-5 py-16 text-center">
      <Reveal as="img" src="/lucentia-mark.png" alt="Lucentia" className="h-14 w-14 rounded-2xl mx-auto mb-5 lc-float" />
      <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">{titolo}</Reveal>
      <Reveal as="p" delay={160} className="mt-3 text-stone-500 max-w-xl mx-auto">{testo}</Reveal>
      <Reveal delay={240} className="mt-7 flex items-center justify-center gap-3 flex-wrap">
        <button onClick={() => openLead({ kind: "demo" })} className="text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 lc-shine hover:-translate-y-0.5 hover:shadow-lg transition" style={{ background: GOLD }}><Sparkles size={17} /> Prova gratis 10 giorni</button>
        <button onClick={() => openLead({ kind: "licenza", piano })} className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 border hover:-translate-y-0.5 hover:bg-stone-900 hover:text-white transition" style={{ borderColor: INK, color: INK }}>{azione || "Richiedi informazioni"} <ArrowRight size={17} /></button>
      </Reveal>
    </section>
  );
}

// ===== Piè di pagina con la mappa del sito =====
export function SiteFooter() {
  return (
    <footer className="border-t border-stone-100">
      <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col items-center gap-3 text-center">
        <SiteLink to="/"><img src="/lucentia-logo.png" alt="Lucentia" className="h-12 w-auto opacity-90" /></SiteLink>
        <p className="text-xs text-stone-400">Gestionale per parrucchieri ed estetisti</p>
        <nav className="flex items-center gap-4 flex-wrap justify-center text-xs text-stone-500">
          {NAV.map(([to, label]) => <SiteLink key={to} to={to} className="hover:text-stone-900">{label}</SiteLink>)}
        </nav>
        <p className="text-xs text-stone-400">Distribuito da {CONTACTS.nome} · <a href={`tel:+39${CONTACTS.tel}`} className="hover:text-stone-600">{CONTACTS.tel.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}</a> · <a href={`mailto:${CONTACTS.email}`} className="hover:text-stone-600">{CONTACTS.email}</a></p>
        <p className="text-[11px] text-stone-300 mt-2">© {new Date().getFullYear()} Lucentia · Tutti i diritti riservati</p>
      </div>
    </footer>
  );
}

// Elenco puntato con spunta dorata (usato in più pagine).
export function Punti({ items, className = "" }) {
  return (
    <ul className={`space-y-2.5 ${className}`}>
      {items.map((p, j) => (
        <li key={j} className="flex items-start gap-2 text-sm text-stone-700"><Check size={16} style={{ color: GOLD }} className="mt-0.5 shrink-0" /> {p}</li>
      ))}
    </ul>
  );
}
