import { createContext, useContext, useState, useEffect, useRef } from "react";
import { ArrowRight, X, Sparkles, Phone, Mail, MessageCircle, Globe, Check, Menu, Plus } from "lucide-react";
import { CONTACTS } from "../contatti.js";

// ===== Token grafici condivisi dal sito pubblico =====
export const GOLD = "#b8893b";        // oro di brand: icone, momenti di vetrina, testo su fondo scuro
export const ACCENT = "#8a6a2e";      // oro scuro: testo su bianco (contrasto AA)
export const GOLD_SOFT = "#f5efe2";   // tinta tenue per sfondi e badge
export const INK = "#1c1917";         // sezioni scure, pulsanti, footer

// ===== Contesto di navigazione del sito pubblico =====
// Il sito è composto da quattro pagine reali (/, /funzionalita, /come-funziona,
// /licenza): la navigazione avviene con la History API, senza ricaricare l'app.
export const SiteCtx = createContext({ path: "/", go: () => {}, onLogin: () => {}, openLead: () => {} });
export function useSite() { return useContext(SiteCtx); }

// Rivela il contenuto con un'animazione quando entra nello schermo (scroll reveal).
export function Reveal({ children, delay = 0, className = "", as: Tag = "div", style, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return (
    <Tag ref={ref} className={`lc-reveal ${shown ? "lc-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }} {...rest}>
      {children}
    </Tag>
  );
}

// Link interno al sito: resta un <a href> vero (per SEO e per "apri in nuova
// scheda"), ma con click normale naviga senza ricaricare la pagina.
export function SiteLink({ to, className = "", children, onClick, ...rest }) {
  const { go } = useSite();
  const click = (e) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(to);
  };
  return <a href={to} onClick={click} className={className} {...rest}>{children}</a>;
}

// ===== Pulsanti a pillola =====
const BTN = "inline-flex items-center justify-center gap-2 font-semibold rounded-full transition hover:-translate-y-0.5 whitespace-nowrap";
const SIZE = { sm: "text-sm px-4 py-2", md: "text-[15px] px-5 py-2.5", lg: "text-base px-6 py-3.5" };

export function BtnInk({ children, className = "", size = "md", onClick, to, ...rest }) {
  const cls = `${BTN} ${SIZE[size]} text-white lc-shine hover:shadow-lg ${className}`;
  const st = { background: INK };
  if (to) return <SiteLink to={to} className={cls} style={st} {...rest}>{children}</SiteLink>;
  return <button onClick={onClick} className={cls} style={st} {...rest}>{children}</button>;
}

export function BtnGold({ children, className = "", size = "md", onClick, to, ...rest }) {
  const cls = `${BTN} ${SIZE[size]} text-white lc-shine hover:shadow-lg ${className}`;
  const st = { background: GOLD };
  if (to) return <SiteLink to={to} className={cls} style={st} {...rest}>{children}</SiteLink>;
  return <button onClick={onClick} className={cls} style={st} {...rest}>{children}</button>;
}

export function BtnLight({ children, className = "", size = "md", onClick, to, dark = false, ...rest }) {
  const cls = `${BTN} ${SIZE[size]} border ${dark ? "border-white/25 text-white hover:bg-white/10" : "border-stone-300 text-stone-900 bg-white hover:border-stone-900"} ${className}`;
  if (to) return <SiteLink to={to} className={cls} {...rest}>{children}</SiteLink>;
  return <button onClick={onClick} className={cls} {...rest}>{children}</button>;
}

// ===== Elementi tipografici di sezione =====
export function Eyebrow({ children, className = "", dark = false }) {
  return <div className={`text-[11px] font-bold tracking-[0.18em] uppercase ${className}`} style={{ color: dark ? GOLD : ACCENT }}>{children}</div>;
}

export function Titolo({ children, className = "", as: Tag = "h2", size = "md", ...rest }) {
  const s = size === "lg" ? "text-4xl sm:text-5xl lg:text-[3.4rem]" : size === "sm" ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl lg:text-[2.6rem]";
  return <Tag className={`font-bold tracking-[-0.03em] leading-[1.08] text-stone-900 ${s} ${className}`} {...rest}>{children}</Tag>;
}

export function Intestazione({ eyebrow, titolo, testo, center = true, dark = false, className = "" }) {
  return (
    <div className={`${center ? "text-center mx-auto" : ""} max-w-2xl ${className}`}>
      <Reveal><Eyebrow dark={dark} className="mb-3">{eyebrow}</Eyebrow></Reveal>
      <Reveal delay={60}><Titolo className={dark ? "!text-white" : ""}>{titolo}</Titolo></Reveal>
      {testo ? <Reveal as="p" delay={120} className={`mt-4 text-base sm:text-lg leading-relaxed ${dark ? "text-stone-300" : "text-stone-500"}`}>{testo}</Reveal> : null}
    </div>
  );
}

// Elenco puntato con spunta dorata (usato in più pagine).
export function Punti({ items, className = "", dark = false }) {
  return (
    <ul className={`space-y-2.5 ${className}`}>
      {items.map((p, j) => (
        <li key={j} className={`flex items-start gap-2.5 text-[15px] ${dark ? "text-stone-200" : "text-stone-700"}`}>
          <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: dark ? "rgba(184,137,59,0.18)" : GOLD_SOFT, color: dark ? GOLD : ACCENT }}><Check size={12} strokeWidth={3} /></span>
          <span>{p}</span>
        </li>
      ))}
    </ul>
  );
}

// Riquadro icona quadrato scuro (stile "tile") usato nelle griglie di funzioni.
export function IconTile({ icon: Icon, size = 48, className = "" }) {
  return (
    <div className={`rounded-2xl flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size, background: INK, color: GOLD }}>
      <Icon size={Math.round(size * 0.42)} />
    </div>
  );
}

// Domanda a scomparsa per le FAQ.
export function Domanda({ q, a, aperta = false }) {
  const [open, setOpen] = useState(aperta);
  return (
    <div className="border-b border-stone-200 last:border-0">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center justify-between gap-4 py-5 text-left">
        <span className="font-semibold text-stone-900 text-[15px] sm:text-base">{q}</span>
        <span className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-transform duration-300 ${open ? "rotate-45 border-stone-900 bg-stone-900 text-white" : "border-stone-300 text-stone-600"}`}><Plus size={16} /></span>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden"><p className="pb-5 text-[15px] text-stone-600 leading-relaxed pr-10">{a}</p></div>
      </div>
    </div>
  );
}

export function Faq({ items }) {
  return (
    <div className="bg-white rounded-3xl border border-stone-200 px-6 sm:px-8">
      {items.map(([q, a], i) => <Domanda key={i} q={q} a={a} aperta={i === 0} />)}
    </div>
  );
}

// Cornice "browser" per le anteprime desktop.
export function Browser({ src, alt, url = "tuodominio.it/gestionale", className = "", imgClass = "" }) {
  return (
    <div className={`rounded-2xl sm:rounded-3xl border border-stone-200 bg-white overflow-hidden ${className}`} style={{ boxShadow: "var(--lc-shadow-xl)" }}>
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-stone-50 border-b border-stone-100">
        <span className="w-2.5 h-2.5 rounded-full bg-stone-200" /><span className="w-2.5 h-2.5 rounded-full bg-stone-200" /><span className="w-2.5 h-2.5 rounded-full bg-stone-200" />
        <span className="ml-3 text-[11px] text-stone-400 tracking-wide inline-flex items-center gap-1.5 bg-white border border-stone-100 rounded-md px-2 py-0.5"><Globe size={10} /> {url}</span>
      </div>
      <img src={src} alt={alt} width="1600" height="1000" loading="lazy" className={`w-full h-auto block ${imgClass}`} />
    </div>
  );
}

// Cornice "telefono" per le anteprime mobile.
export function Telefono({ src, alt, className = "" }) {
  return (
    <div className={`rounded-[2rem] border-[6px] border-stone-900 bg-stone-900 overflow-hidden ${className}`} style={{ boxShadow: "var(--lc-shadow-xl)" }}>
      <img src={src} alt={alt} width="780" height="1688" loading="lazy" className="w-full h-auto block" />
    </div>
  );
}

// ===== Modale richiesta demo / preventivo =====
export function LeadModal({ kind, onClose, onLogin }) {
  const demo = kind === "demo";
  const [f, setF] = useState({ ragione_sociale: "", piva: "", email: "", telefono: "", messaggio: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okDemo, setOkDemo] = useState(null);
  const [okLead, setOkLead] = useState(false);
  const set = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); setErr(""); };
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const submit = async () => {
    if (!f.ragione_sociale.trim() || !f.email.trim() || (demo && !f.telefono.trim())) { setErr("Compila ragione sociale, email" + (demo ? " e telefono." : ".")); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch(demo ? "/api/demo" : "/api/richiesta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      setBusy(false);
      if (!r.ok) { setErr(j.error || "Si è verificato un errore. Riprova."); return; }
      if (demo) setOkDemo(j.email || f.email.trim().toLowerCase()); else setOkLead(true);
    } catch (e) { setBusy(false); setErr("Errore di rete. Riprova."); }
  };
  const input = "w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-[15px] focus:bg-white focus:border-stone-400 outline-none transition";
  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 lc-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-auto lc-scale-in" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] uppercase mb-2" style={{ color: ACCENT }}>{demo ? <><Sparkles size={12} /> Demo gratuita</> : <><Mail size={12} /> Preventivo</>}</div>
            <h3 className="font-bold tracking-tight text-2xl text-stone-900">{okDemo ? "La tua demo è pronta" : okLead ? "Richiesta inviata" : demo ? "Prova Lucentia per 10 giorni" : "Richiedi un preventivo"}</h3>
          </div>
          <button onClick={onClose} aria-label="Chiudi" className="w-9 h-9 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900 flex items-center justify-center shrink-0"><X size={18} /></button>
        </div>
        {okDemo ? (
          <div className="text-[15px] text-stone-600 space-y-4 mt-3">
            <p>Accedi con queste credenziali: trovi tutti i moduli attivi, con alcuni limiti, per 10 giorni.</p>
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-1">
              <div className="flex justify-between gap-3"><span className="text-stone-400">Email</span><b className="text-stone-900 break-all text-right">{okDemo}</b></div>
              <div className="flex justify-between gap-3"><span className="text-stone-400">Password</span><b className="text-stone-900">demo</b></div>
            </div>
            <BtnInk onClick={onLogin} size="lg" className="w-full">Vai al login <ArrowRight size={16} /></BtnInk>
          </div>
        ) : okLead ? (
          <div className="text-[15px] text-stone-600 space-y-4 mt-3">
            <p>Grazie! Abbiamo ricevuto la tua richiesta: ti ricontattiamo noi per conoscere il tuo salone e prepararti un preventivo su misura.</p>
            <BtnInk onClick={onClose} size="lg" className="w-full">Chiudi</BtnInk>
          </div>
        ) : (
          <>
            <p className="text-[15px] text-stone-500 mt-2 mb-5">{demo ? "Inserisci i tuoi dati: attiviamo subito una versione di prova completa, senza carta di credito." : "Raccontaci il tuo salone: ti ricontattiamo noi con un'offerta chiara, un solo canone all'anno."}</p>
            <div className="space-y-3">
              <input value={f.ragione_sociale} onChange={set("ragione_sociale")} placeholder="Nome del salone / ragione sociale *" className={input} />
              <input value={f.email} onChange={set("email")} type="email" placeholder="Email *" className={input} />
              <input value={f.telefono} onChange={set("telefono")} placeholder={"Telefono" + (demo ? " *" : "")} className={input} />
              <input value={f.piva} onChange={set("piva")} placeholder="Partita IVA" className={input} />
              {!demo ? <textarea value={f.messaggio} onChange={set("messaggio")} rows={3} placeholder="Come lavora il tuo salone? Operatori, cabine, cosa ti serve… (facoltativo)" className={input} /> : null}
              {err ? <p className="text-sm text-red-600">{err}</p> : null}
              {demo ? <BtnGold onClick={submit} disabled={busy} size="lg" className="w-full disabled:opacity-50">{busy ? "Invio…" : "Attiva la demo"} <Sparkles size={16} /></BtnGold>
                : <BtnInk onClick={submit} disabled={busy} size="lg" className="w-full disabled:opacity-50">{busy ? "Invio…" : "Invia la richiesta"} <ArrowRight size={16} /></BtnInk>}
              <p className="text-xs text-stone-400 text-center">Inviando accetti di essere ricontattato in merito a Lucentia.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===== Barra annuncio + intestazione con la navigazione =====
export const NAV = [["/", "Home"], ["/funzionalita", "Funzionalità"], ["/come-funziona", "Come funziona"], ["/licenza", "Licenza"], ["/#contatti", "Contatti"]];

export function SiteHeader() {
  const { path, onLogin, openLead } = useSite();
  const [open, setOpen] = useState(false);
  const isCur = (to) => (to.startsWith("/#") ? false : to === path);
  useEffect(() => { setOpen(false); }, [path]);
  return (
    <>
      <div className="text-white text-xs" style={{ background: INK }}>
        <div className="max-w-6xl mx-auto px-5 h-9 flex items-center justify-between gap-4">
          <SiteLink to="/come-funziona" className="inline-flex items-center gap-2 truncate text-stone-200 hover:text-white">
            <Sparkles size={12} style={{ color: GOLD }} className="shrink-0" />
            <span className="truncate">Lucentia diventa un progetto su misura: il tuo sito, il tuo dominio, il tuo gestionale.</span>
          </SiteLink>
          <span className="hidden sm:inline-flex items-center gap-2 text-stone-300 shrink-0"><span className="inline-block w-3 h-2 rounded-[2px]" style={{ background: "linear-gradient(90deg,#009246 33%,#fff 33% 66%,#ce2b37 66%)" }} /> Per parrucchieri e centri estetici</span>
        </div>
      </div>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-5 h-[68px] flex items-center justify-between gap-4">
          <SiteLink to="/" className="flex items-center gap-2.5 group shrink-0" aria-label="Lucentia — home">
            <img src="/lucentia-mark.png" alt="" className="h-9 w-9 rounded-xl transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110" />
            <span className="font-bold text-[1.3rem] tracking-[-0.02em] text-stone-900">Lucentia</span>
          </SiteLink>
          <nav className="hidden md:flex items-center gap-7">
            {NAV.map(([to, label]) => (
              <SiteLink key={to} to={to} className={`text-[15px] transition ${isCur(to) ? "font-semibold text-stone-900" : "font-medium text-stone-600 hover:text-stone-900"}`}>{label}</SiteLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={onLogin} className="hidden sm:inline text-[15px] font-medium text-stone-700 hover:text-stone-900">Accedi</button>
            <BtnInk size="sm" onClick={() => openLead({ kind: "demo" })} className="!py-2.5">Prova la demo</BtnInk>
            <button onClick={() => setOpen((o) => !o)} aria-label={open ? "Chiudi il menu" : "Apri il menu"} aria-expanded={open} className="md:hidden w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center text-stone-700">{open ? <X size={18} /> : <Menu size={18} />}</button>
          </div>
        </div>
        {open ? (
          <nav className="md:hidden border-t border-stone-100 bg-white px-5 py-3 flex flex-col lc-fade-in">
            {NAV.map(([to, label]) => (
              <SiteLink key={to} to={to} className={`py-3 text-base border-b border-stone-100 last:border-0 ${isCur(to) ? "font-semibold text-stone-900" : "text-stone-600"}`}>{label}</SiteLink>
            ))}
            <button onClick={onLogin} className="py-3 text-base text-left text-stone-600">Accedi al gestionale</button>
          </nav>
        ) : null}
      </header>
    </>
  );
}

// ===== Sezione contatti (vive nella home, ancorata a #contatti) =====
const telLeggibile = CONTACTS.tel.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
export const CONTATTI = [
  [Phone, "Telefono", telLeggibile, `tel:+39${CONTACTS.tel}`, "Rispondiamo in orario d'ufficio", false],
  [MessageCircle, "WhatsApp", "Scrivici subito", `https://wa.me/39${CONTACTS.tel}`, "Il canale più rapido", true],
  [Mail, "Email", CONTACTS.email, `mailto:${CONTACTS.email}`, "Per richieste e preventivi", false],
  [Globe, "Sito web", CONTACTS.sito, `https://${CONTACTS.sito}`, "Scopri chi siamo", true],
];

export function ContattiSection() {
  const { openLead } = useSite();
  return (
    <section id="contatti" className="scroll-mt-24">
      <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
        <div className="grid lg:grid-cols-5 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-2">
            <Reveal><Eyebrow className="mb-3">Contatti</Eyebrow></Reveal>
            <Reveal delay={60}><Titolo>Parliamo del tuo salone</Titolo></Reveal>
            <Reveal as="p" delay={120} className="mt-4 text-stone-500 text-lg leading-relaxed">Lucentia è realizzato e distribuito da <b className="text-stone-800">{CONTACTS.nome}</b>. Chiamaci, scrivici o lasciaci i tuoi dati: ti rispondiamo noi, senza call center.</Reveal>
            <Reveal delay={180} className="mt-7 flex items-center gap-3 flex-wrap">
              <BtnInk size="lg" onClick={() => openLead({ kind: "licenza" })}>Richiedi un preventivo <ArrowRight size={17} /></BtnInk>
              <BtnLight size="lg" onClick={() => openLead({ kind: "demo" })}><Sparkles size={16} style={{ color: ACCENT }} /> Prova la demo</BtnLight>
            </Reveal>
          </div>
          <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
            {CONTATTI.map(([Icon, title, value, href, sub, ext], i) => (
              <Reveal key={i} delay={i * 70}>
                <a href={href} {...(ext ? { target: "_blank", rel: "noreferrer" } : {})} className="flex items-start gap-4 bg-stone-50 hover:bg-white rounded-3xl border border-stone-200 p-5 h-full lc-lift">
                  <IconTile icon={Icon} size={44} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">{title}</div>
                    <div className="font-semibold text-stone-900 mt-0.5 break-all">{value}</div>
                    <div className="text-sm text-stone-500 mt-1">{sub}</div>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== Fascia scura di chiusura con immagine (riutilizzata in ogni pagina) =====
export function CtaBand({ titolo, testo, img = "/anteprime/minisito-desktop.webp", alt = "Sito di un salone realizzato con Lucentia", phone = "/anteprime/agenda-mobile.webp" }) {
  const { openLead } = useSite();
  return (
    <section className="max-w-6xl mx-auto px-5 py-10 sm:py-14">
      <Reveal className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] text-white" style={{ background: INK }}>
        <div className="pointer-events-none absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full opacity-30" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 65%)` }} />
        <div className="grid lg:grid-cols-5 items-stretch">
          <div className="relative lg:col-span-2 min-h-[220px] sm:min-h-[280px] lg:min-h-0 overflow-hidden">
            <img src={img} alt={alt} loading="lazy" className="absolute inset-0 w-full h-full object-cover object-left-top opacity-90" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${INK} 0%, rgba(28,25,23,0.15) 55%, transparent 100%)` }} />
            <div className="hidden lg:block absolute inset-y-0 right-0 w-24" style={{ background: `linear-gradient(to right, transparent, ${INK})` }} />
            <Telefono src={phone} alt="Gestionale Lucentia su smartphone" className="absolute w-28 sm:w-32 -bottom-20 right-6 rotate-[6deg] lc-float border-[5px] rounded-[1.6rem]" />
          </div>
          <div className="relative lg:col-span-3 p-7 sm:p-10 lg:p-14">
            <Titolo className="!text-white">{titolo}</Titolo>
            <p className="mt-4 text-stone-300 text-base sm:text-lg leading-relaxed max-w-xl">{testo}</p>
            <div className="mt-7 flex items-center gap-3 flex-wrap">
              <BtnGold size="lg" onClick={() => openLead({ kind: "demo" })}><Sparkles size={17} /> Prova la demo gratis</BtnGold>
              <BtnLight dark size="lg" onClick={() => openLead({ kind: "licenza" })}>Richiedi un preventivo <ArrowRight size={17} /></BtnLight>
            </div>
            <p className="mt-5 text-sm text-stone-400">10 giorni, tutti i moduli, nessuna carta di credito.</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ===== Piè di pagina scuro a più colonne =====
export function SiteFooter() {
  const { onLogin, openLead } = useSite();
  const col = "text-sm text-stone-400 hover:text-white transition text-left";
  return (
    <footer className="text-white mt-6" style={{ background: INK }}>
      <div className="max-w-6xl mx-auto px-5 pt-14 pb-8">
        <div className="grid gap-10 grid-cols-2 md:grid-cols-12">
          <div className="col-span-2 md:col-span-4">
            <SiteLink to="/" className="inline-flex items-center gap-2.5" aria-label="Lucentia — home">
              <img src="/lucentia-mark.png" alt="" className="h-9 w-9 rounded-xl" />
              <span className="font-bold text-[1.3rem] tracking-[-0.02em]">Lucentia</span>
            </SiteLink>
            <p className="mt-4 text-sm text-stone-400 leading-relaxed max-w-xs">Il tuo sito, il tuo dominio, il tuo gestionale. Un progetto dedicato per ogni parrucchiere e centro estetico, con licenza annuale tutto incluso.</p>
          </div>
          <div className="col-span-1 md:col-span-2 md:col-start-6">
            <div className="text-sm font-semibold mb-4">Prodotto</div>
            <div className="flex flex-col gap-2.5">
              <SiteLink to="/funzionalita" className={col}>Funzionalità</SiteLink>
              <SiteLink to="/come-funziona" className={col}>Come funziona</SiteLink>
              <SiteLink to="/licenza" className={col}>Licenza annuale</SiteLink>
              <SiteLink to="/licenza#moduli" className={col}>Moduli e integrazioni</SiteLink>
            </div>
          </div>
          <div className="col-span-1 md:col-span-2">
            <div className="text-sm font-semibold mb-4">Supporto</div>
            <div className="flex flex-col gap-2.5">
              <button onClick={onLogin} className={col}>Accedi al gestionale</button>
              <button onClick={() => openLead({ kind: "demo" })} className={col}>Prova la demo</button>
              <button onClick={() => openLead({ kind: "licenza" })} className={col}>Richiedi un preventivo</button>
              <SiteLink to="/licenza#faq" className={col}>Domande frequenti</SiteLink>
            </div>
          </div>
          <div className="col-span-2 md:col-span-3">
            <div className="text-sm font-semibold mb-4">Contatti</div>
            <div className="flex flex-col gap-2.5">
              <a href={`tel:+39${CONTACTS.tel}`} className={col}>{telLeggibile}</a>
              <a href={`https://wa.me/39${CONTACTS.tel}`} target="_blank" rel="noreferrer" className={col}>WhatsApp</a>
              <a href={`mailto:${CONTACTS.email}`} className={`${col} break-all`}>{CONTACTS.email}</a>
              <a href={`https://${CONTACTS.sito}`} target="_blank" rel="noreferrer" className={col}>{CONTACTS.nome} · {CONTACTS.sito}</a>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} Lucentia · Tutti i diritti riservati</p>
          <p>Realizzato e distribuito da {CONTACTS.nome}</p>
        </div>
      </div>
    </footer>
  );
}
