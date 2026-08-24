import { ArrowRight, Sparkles, Cloud, Smartphone, ShieldCheck, Monitor, HeartHandshake, Zap } from "lucide-react";
import { GOLD, GOLD_SOFT, INK, Reveal, SiteLink, ContattiSection, useSite } from "./ui.jsx";
import { FUNZIONALITA_HOME, PIANI } from "./dati.js";

// Home: la prima cosa che si vede aprendo il sito. Racconta cos'è Lucentia,
// mostra un assaggio di funzionalità e piani e rimanda alle pagine dedicate.
export default function HomePage() {
  const { onLogin, openLead } = useSite();
  return (
    <>
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
            <button onClick={() => openLead({ kind: "demo" })} className="text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 shadow-sm lc-shine hover:shadow-lg hover:-translate-y-0.5 transition" style={{ background: GOLD }}><Sparkles size={17} /> Prova gratis 10 giorni</button>
            <button onClick={onLogin} className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 border hover:-translate-y-0.5 hover:bg-stone-900 hover:text-white transition" style={{ borderColor: INK, color: INK }}>Accedi <ArrowRight size={17} /></button>
            <SiteLink to="/funzionalita" className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 text-stone-500 hover:text-stone-800">Scopri le funzionalità</SiteLink>
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

      {/* ANTEPRIMA */}
      <section className="relative overflow-hidden bg-stone-50 border-y border-stone-100">
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
          <Reveal delay={260} className="text-center">
            <SiteLink to="/funzionalita" className="font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all" style={{ color: GOLD }}>Vedi tutte le anteprime <ArrowRight size={17} /></SiteLink>
          </Reveal>
        </div>
      </section>

      {/* ASSAGGIO FUNZIONALITÀ */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center mb-12">
          <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Funzionalità</Reveal>
          <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">Tutto ciò che serve al tuo salone</Reveal>
          <Reveal as="p" delay={160} className="mt-3 text-stone-500 max-w-2xl mx-auto">Un assaggio di quello che puoi fare ogni giorno con Lucentia.</Reveal>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FUNZIONALITA_HOME.map(([Icon, title, desc], i) => (
            <Reveal key={i} delay={(i % 3) * 90} className="group bg-white rounded-2xl border border-stone-200 p-6 lc-lift">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: GOLD_SOFT, color: GOLD }}><Icon size={20} /></div>
              <h3 className="font-semibold text-stone-900 mb-1.5">{title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200} className="mt-10 text-center">
          <SiteLink to="/funzionalita" className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 border hover:-translate-y-0.5 hover:bg-stone-900 hover:text-white transition" style={{ borderColor: INK, color: INK }}>Vedi tutte le funzionalità <ArrowRight size={17} /></SiteLink>
        </Reveal>
      </section>

      {/* PERCHÉ LUCENTIA */}
      <section className="bg-stone-50 border-y border-stone-100">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-10">
            <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Perché Lucentia</Reveal>
            <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">Pensato per chi sta dietro alla poltrona</Reveal>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              [Zap, "Si impara in un pomeriggio", "Niente menu infiniti: le schermate seguono il flusso della giornata, dall'appuntamento all'incasso."],
              [Cloud, "Sempre sincronizzato", "I dati sono sul cloud: dal computer della reception al telefono in borsa, trovi sempre tutto aggiornato."],
              [HeartHandshake, "Assistenza vera", "Ti seguiamo noi, dalla configurazione iniziale ai dubbi di ogni giorno. Nessun call center."],
            ].map(([Icon, t, d], i) => (
              <Reveal key={i} delay={i * 100} className="bg-white rounded-2xl border border-stone-200 p-6 text-center lc-lift">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: GOLD_SOFT, color: GOLD }}><Icon size={22} /></div>
                <h3 className="font-semibold text-stone-900 mb-1.5">{t}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PIANI IN SINTESI */}
      <section style={{ background: INK }} className="text-white">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-12">
            <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Piani di licenza</Reveal>
            <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold">Tre piani, nessun vincolo nascosto</Reveal>
            <Reveal as="p" delay={160} className="mt-3 text-stone-400 text-sm">Canone mensile, IVA esclusa. Il confronto completo è nella pagina Piani.</Reveal>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {PIANI.map((p, pi) => (
              <Reveal key={p.name} delay={pi * 110} className={`rounded-2xl p-6 flex flex-col lc-lift ${p.highlight ? "lc-glow-card sm:-translate-y-2" : ""}`} style={{ background: p.highlight ? "#26231f" : "#211e1b", border: `1px solid ${p.highlight ? GOLD : "#3a352f"}` }}>
                {p.highlight ? <div className="self-start text-[11px] font-semibold px-2.5 py-1 rounded-full mb-3" style={{ background: GOLD, color: INK }}>Consigliato</div> : <div className="h-[26px] mb-3" />}
                <div className="font-display text-2xl font-semibold" style={{ color: p.highlight ? GOLD : "#fff" }}>{p.name}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold">€{p.price}</span>
                  {p.full ? <span className="text-lg text-stone-500 line-through">€{p.full}</span> : null}
                  <span className="text-stone-400 text-sm">/mese</span>
                </div>
                <div className="text-xs text-stone-400 mt-1">{p.operatori} · IVA escl.</div>
                <p className="text-sm text-stone-400 mt-4 flex-1">{p.tagline}</p>
                <SiteLink to="/piani" className={`mt-6 w-full font-semibold py-2.5 rounded-xl transition hover:-translate-y-0.5 text-center inline-flex items-center justify-center gap-1.5 ${p.highlight ? "lc-shine" : "hover:bg-white/5"}`} style={p.highlight ? { background: GOLD, color: INK } : { background: "transparent", color: "#fff", border: "1px solid #4a443d" }}>Vedi il piano</SiteLink>
              </Reveal>
            ))}
          </div>
          <Reveal delay={340} className="text-center mt-10">
            <SiteLink to="/piani" className="font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all" style={{ color: GOLD }}>Confronta i piani e i moduli aggiuntivi <ArrowRight size={17} /></SiteLink>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-5 py-16 text-center">
        <Reveal as="img" src="/lucentia-mark.png" alt="Lucentia" className="h-14 w-14 rounded-2xl mx-auto mb-5 lc-float" />
        <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">Pronto a far brillare il tuo salone?</Reveal>
        <Reveal as="p" delay={160} className="mt-3 text-stone-500">Attiva una prova gratuita di 10 giorni, oppure accedi con le credenziali ricevute dal tuo fornitore.</Reveal>
        <Reveal delay={240} className="mt-7 flex items-center justify-center gap-3 flex-wrap">
          <button onClick={() => openLead({ kind: "demo" })} className="text-white font-semibold px-7 py-3 rounded-xl inline-flex items-center gap-2 lc-shine hover:-translate-y-0.5 hover:shadow-lg transition" style={{ background: GOLD }}><Sparkles size={17} /> Prova gratis 10 giorni</button>
          <button onClick={onLogin} className="text-white font-semibold px-7 py-3 rounded-xl inline-flex items-center gap-2 lc-shine hover:-translate-y-0.5 hover:shadow-lg transition" style={{ background: INK }}>Accedi a Lucentia <ArrowRight size={17} /></button>
        </Reveal>
      </section>

      <ContattiSection />
    </>
  );
}
