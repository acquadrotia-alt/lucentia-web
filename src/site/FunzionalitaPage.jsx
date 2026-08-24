import { ArrowRight, Sparkles, Monitor, Check, Smartphone, Cloud, ShieldCheck } from "lucide-react";
import { GOLD, GOLD_SOFT, INK, Reveal, SiteLink, Punti, CtaBand, useSite } from "./ui.jsx";
import { FUNZIONALITA, APPROFONDIMENTI, ONLINE_PUNTI } from "./dati.js";

// Pagina Funzionalità: raccoglie l'elenco completo delle funzioni e le
// anteprime dell'app. Volutamente NON contiene prezzi né canoni: i costi
// stanno tutti nella pagina Piani.
export default function FunzionalitaPage() {
  const { openLead } = useSite();
  return (
    <>
      {/* INTESTAZIONE */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `radial-gradient(65% 65% at 50% 0%, ${GOLD_SOFT} 0%, #ffffff 70%)` }} />
        <div className="relative max-w-4xl mx-auto px-5 pt-14 pb-12 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full mb-5 lc-fade-up" style={{ background: "#fff", color: GOLD, border: `1px solid ${GOLD_SOFT}` }}><Sparkles size={13} /> Funzionalità</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight text-stone-900 lc-fade-up" style={{ animationDelay: "120ms" }}>Tutto quello che puoi fare <span className="font-display-i" style={{ color: GOLD }}>con Lucentia</span></h1>
          <p className="mt-5 text-base sm:text-lg text-stone-500 max-w-2xl mx-auto lc-fade-up" style={{ animationDelay: "220ms" }}>Dall'appuntamento all'incasso, dalla scheda cliente al mini-sito con prenotazioni online: qui trovi l'elenco completo delle funzioni, con le anteprime reali dell'app.</p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap lc-fade-up" style={{ animationDelay: "320ms" }}>
            <button onClick={() => openLead({ kind: "demo" })} className="text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 shadow-sm lc-shine hover:shadow-lg hover:-translate-y-0.5 transition" style={{ background: GOLD }}><Sparkles size={17} /> Provale gratis 10 giorni</button>
            <SiteLink to="/piani" className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 border hover:-translate-y-0.5 hover:bg-stone-900 hover:text-white transition" style={{ borderColor: INK, color: INK }}>Vedi i piani <ArrowRight size={17} /></SiteLink>
          </div>
        </div>
      </section>

      {/* ELENCO COMPLETO */}
      <section id="elenco" className="bg-stone-50 border-y border-stone-100 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-12">
            <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>L'elenco completo</Reveal>
            <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">Ogni funzione al suo posto</Reveal>
            <Reveal as="p" delay={160} className="mt-3 text-stone-500 max-w-2xl mx-auto">Alcune funzioni sono comprese in ogni licenza, altre sono moduli che si attivano in base al piano scelto.</Reveal>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FUNZIONALITA.map(([Icon, title, desc], i) => (
              <Reveal key={i} delay={(i % 3) * 90} className="group bg-white rounded-2xl border border-stone-200 p-6 lc-lift">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: GOLD_SOFT, color: GOLD }}><Icon size={20} /></div>
                <h3 className="font-semibold text-stone-900 mb-1.5">{title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ANTEPRIME */}
      <section id="anteprime" className="relative overflow-hidden scroll-mt-24">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-10">
            <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Anteprime · Dentro l'app</Reveal>
            <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">Guarda Lucentia dal vivo</Reveal>
            <Reveal as="p" delay={160} className="mt-3 text-stone-500 max-w-2xl mx-auto">La stessa app, identica su computer, tablet e telefono: apri l'agenda alla reception e ritrovi tutto sul cellulare, ovunque sei.</Reveal>
          </div>
          <Reveal delay={200} className="relative max-w-4xl mx-auto pb-10 sm:pb-14">
            <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden" style={{ boxShadow: "var(--lc-shadow-xl)" }}>
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-stone-50 border-b border-stone-100">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-200" /><span className="w-2.5 h-2.5 rounded-full bg-stone-200" /><span className="w-2.5 h-2.5 rounded-full bg-stone-200" />
                <span className="ml-3 text-[11px] text-stone-300 tracking-wide inline-flex items-center gap-1"><Monitor size={11} /> lucentia-app.com</span>
              </div>
              <img src="/anteprime/agenda-desktop.webp" alt="Agenda appuntamenti di Lucentia su desktop: giornata del salone con appuntamenti per operatore" width="1600" height="1000" loading="lazy" className="w-full h-auto" />
            </div>
            <div className="absolute -bottom-2 -right-2 sm:bottom-0 sm:right-6 w-32 sm:w-44 rounded-[1.8rem] sm:rounded-[2.2rem] border-[5px] sm:border-[6px] border-stone-900 bg-stone-900 overflow-hidden rotate-3 lc-float" style={{ boxShadow: "var(--lc-shadow-xl)" }}>
              <img src="/anteprime/agenda-mobile.webp" alt="Agenda di Lucentia su smartphone" width="780" height="1688" loading="lazy" className="w-full h-auto" />
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              [Cloud, "Sul cloud", "Nessuna installazione: apri il browser e sei operativo."],
              [Smartphone, "Multi-dispositivo", "Computer, tablet e telefono, sempre sincronizzati."],
              [ShieldCheck, "Dati protetti", "Accesso con credenziali, dati isolati per ogni salone."],
            ].map(([Icon, t, d], i) => (
              <Reveal key={i} delay={i * 90} className="rounded-2xl border border-stone-200 p-5 text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: GOLD_SOFT, color: GOLD }}><Icon size={19} /></div>
                <div className="font-semibold text-stone-900 text-sm">{t}</div>
                <div className="text-xs text-stone-500 mt-1 leading-relaxed">{d}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* APPROFONDIMENTI */}
      <section id="dettagli" className="bg-stone-50 border-y border-stone-100 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-5 py-16 space-y-16 sm:space-y-20">
          {APPROFONDIMENTI.map((r, i) => (
            <div key={i} className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <Reveal className={r.flip ? "lg:order-2" : ""}>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-4" style={{ background: "#fff", color: GOLD, border: `1px solid ${GOLD_SOFT}` }}><r.icon size={13} /> {r.kicker}</div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 leading-tight">{r.title}</h3>
                <p className="mt-3 text-stone-500 leading-relaxed">{r.text}</p>
                <Punti items={r.points} className="mt-5" />
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

      {/* MINI-SITO & PRENOTAZIONI ONLINE (senza prezzi) */}
      <section id="online" className="relative overflow-hidden scroll-mt-24">
        <div className="absolute inset-0" style={{ background: `radial-gradient(70% 70% at 50% 0%, ${GOLD_SOFT} 0%, #ffffff 65%)` }} />
        <div className="relative max-w-5xl mx-auto px-5 py-16">
          <div className="text-center mb-10">
            <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Modulo aggiuntivo</Reveal>
            <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">Il mini-sito del tuo salone, con prenotazioni <span className="font-display-i" style={{ color: GOLD }}>online</span></Reveal>
            <Reveal as="p" delay={160} className="mt-3 text-stone-500 max-w-2xl mx-auto">Condividi un link — su WhatsApp, Instagram, Google o un QR in negozio — e i clienti trovano una pagina web della tua attività: prenotano da soli 24 ore su 24, scoprono gli eventi in programma e tutte le info utili.</Reveal>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {ONLINE_PUNTI.map(([Icon, t, d], i) => (
              <Reveal key={i} delay={i * 80} className="flex items-start gap-3 bg-white rounded-2xl border border-stone-200 p-5 lc-lift">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: GOLD_SOFT, color: GOLD }}><Icon size={17} /></div>
                <div><div className="font-semibold text-stone-900 text-sm">{t}</div><div className="text-sm text-stone-500 leading-relaxed">{d}</div></div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={320} className="mt-8 text-center text-sm text-stone-500">
            È un modulo opzionale: <SiteLink to="/piani" className="font-semibold hover:underline" style={{ color: GOLD }}>scopri come attivarlo nella pagina Piani</SiteLink>.
          </Reveal>
        </div>
      </section>

      {/* COSA È COMPRESO IN OGNI LICENZA */}
      <section className="bg-stone-50 border-y border-stone-100">
        <div className="max-w-4xl mx-auto px-5 py-16">
          <div className="text-center mb-8">
            <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Sempre incluso</Reveal>
            <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">Il cuore del gestionale, in ogni licenza</Reveal>
            <Reveal as="p" delay={160} className="mt-3 text-stone-500">Agenda, clienti e buoni ci sono sempre. I moduli come fidelity, vendite, statistiche, marketing e allergeni si attivano in base al piano.</Reveal>
          </div>
          <Reveal delay={200} className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8">
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {["Agenda e appuntamenti illimitati", "Scheda cliente con storico completo", "Buoni regalo a valore o a pacchetto", "Eventi del salone con pagina pubblica", "Listino servizi in PDF personalizzato", "Cloud, multi-dispositivo e backup"].map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-stone-700"><Check size={16} style={{ color: GOLD }} className="mt-0.5 shrink-0" /> {t}</div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand titolo="Vuoi vederlo sul tuo salone?" testo="Attiva una prova gratuita di 10 giorni con tutti i moduli, oppure scrivici e ti mostriamo Lucentia dal vivo." azione="Richiedi una dimostrazione" />
    </>
  );
}
