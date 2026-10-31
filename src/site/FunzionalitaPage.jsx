import { ArrowRight, Sparkles, Smartphone, Cloud, ShieldCheck } from "lucide-react";
import { GOLD, GOLD_SOFT, ACCENT, INK, Reveal, SiteLink, Punti, CtaBand, useSite, BtnInk, BtnLight, Eyebrow, Titolo, Intestazione, IconTile, Browser, Telefono } from "./ui.jsx";
import { FUNZIONALITA, APPROFONDIMENTI, ONLINE_PUNTI } from "./dati.js";

// Pagina Funzionalità: l'elenco completo delle funzioni del gestionale e le
// anteprime reali dell'app. Volutamente NON contiene prezzi né canoni: per
// la licenza rimanda a /licenza.
export default function FunzionalitaPage() {
  const { openLead } = useSite();
  return (
    <>
      {/* INTESTAZIONE */}
      <section className="max-w-6xl mx-auto px-5 pt-12 pb-10 sm:pt-20 sm:pb-14">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 lc-fade-up"><span className="w-2 h-2 rounded-full" style={{ background: GOLD }} /> Funzionalità</div>
          <Titolo as="h1" size="lg" className="mt-5 lc-fade-up" style={{ animationDelay: "100ms" }}>Tutto quello che fa il tuo <span style={{ color: ACCENT }}>gestionale</span></Titolo>
          <p className="mt-6 text-lg text-stone-600 leading-relaxed max-w-2xl lc-fade-up" style={{ animationDelay: "200ms" }}>Dall'appuntamento all'incasso, dalla scheda cliente al sito con prenotazioni online: qui trovi l'elenco completo delle funzioni, con le anteprime reali dell'app. I moduli si attivano su misura, in base a come lavora il tuo salone.</p>
          <div className="mt-8 flex items-center gap-3 flex-wrap lc-fade-up" style={{ animationDelay: "300ms" }}>
            <BtnInk size="lg" onClick={() => openLead({ kind: "demo" })}><Sparkles size={17} style={{ color: GOLD }} /> Provale nella demo</BtnInk>
            <BtnLight size="lg" to="/licenza">Cosa include la licenza <ArrowRight size={17} /></BtnLight>
          </div>
        </div>
      </section>

      {/* ANTEPRIMA PRINCIPALE */}
      <section className="max-w-6xl mx-auto px-5">
        <Reveal className="relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden px-5 pt-8 sm:px-12 sm:pt-12" style={{ background: `linear-gradient(145deg, ${GOLD_SOFT} 0%, #ebe1cc 100%)` }}>
          <div className="max-w-4xl mx-auto relative">
            <Browser src="/anteprime/agenda-desktop.webp" alt="Agenda appuntamenti di Lucentia su desktop: giornata del salone con appuntamenti per operatore" className="!rounded-b-none !border-b-0" />
            <Telefono src="/anteprime/agenda-mobile.webp" alt="Agenda di Lucentia su smartphone" className="absolute w-24 sm:w-36 -bottom-2 -right-3 sm:right-0 rotate-3 lc-float" />
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          {[
            [Cloud, "Nessuna installazione", "Apri tuodominio.it/gestionale dal browser e sei operativo."],
            [Smartphone, "Multi-dispositivo", "Computer, tablet e telefono, sempre sincronizzati."],
            [ShieldCheck, "Dati protetti", "Accessi con credenziali, database dedicato al tuo salone."],
          ].map(([Icon, t, d], i) => (
            <Reveal key={i} delay={i * 80} className="flex items-start gap-4 rounded-3xl border border-stone-200 p-5">
              <IconTile icon={Icon} size={44} />
              <div><div className="font-bold text-stone-900">{t}</div><div className="text-sm text-stone-600 mt-1 leading-relaxed">{d}</div></div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ELENCO COMPLETO */}
      <section id="elenco" className="max-w-6xl mx-auto px-5 py-16 sm:py-24 scroll-mt-24">
        <Intestazione eyebrow="L'elenco completo" titolo="Ogni funzione al suo posto" testo="Il cuore del gestionale c'è sempre; gli altri moduli si attivano quando servono, anche dopo la partenza." />
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FUNZIONALITA.map(([Icon, title, desc], i) => (
            <Reveal key={i} delay={(i % 3) * 80} className="group bg-white rounded-3xl border border-stone-200 p-6 lc-lift">
              <IconTile icon={Icon} size={46} className="mb-5 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3" />
              <h3 className="font-bold text-stone-900 tracking-tight">{title}</h3>
              <p className="mt-1.5 text-[15px] text-stone-600 leading-relaxed">{desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* APPROFONDIMENTI */}
      <section id="dettagli" className="max-w-6xl mx-auto px-5 scroll-mt-24">
        <div className="bg-stone-100 rounded-[2rem] sm:rounded-[2.5rem] px-5 py-12 sm:p-12 lg:p-16 space-y-16 sm:space-y-24">
          {APPROFONDIMENTI.map((r, i) => (
            <div key={i} className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
              <Reveal className={r.flip ? "lg:order-2" : ""}>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white text-stone-700 border border-stone-200"><r.icon size={13} style={{ color: ACCENT }} /> {r.kicker}</div>
                <h3 className="mt-4 font-bold tracking-[-0.03em] text-stone-900 text-2xl sm:text-3xl lg:text-[2.2rem] leading-[1.1]">{r.title}</h3>
                <p className="mt-4 text-stone-600 leading-relaxed text-[15px] sm:text-base">{r.text}</p>
                <Punti items={r.points} className="mt-5" />
              </Reveal>
              <Reveal delay={120} className={`relative ${r.flip ? "lg:order-1" : ""} ${r.phone ? "pb-10 pr-8 sm:pr-12" : ""}`}>
                <div className="rounded-3xl border border-stone-200 bg-white overflow-hidden lc-lift" style={{ boxShadow: "var(--lc-shadow-lg)" }}>
                  <img src={r.img} alt={r.alt} width="1600" height="1000" loading="lazy" className="w-full h-auto block" />
                </div>
                {r.phone ? <Telefono src={r.phone.img} alt={r.phone.alt} className="absolute bottom-0 right-0 w-24 sm:w-32 -rotate-3 border-[5px] rounded-[1.6rem]" /> : null}
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* IL TUO SITO & PRENOTAZIONI ONLINE (senza prezzi) */}
      <section id="online" className="max-w-6xl mx-auto px-5 py-16 sm:py-24 scroll-mt-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div>
            <Reveal><Eyebrow className="mb-3">Il tuo sito</Eyebrow></Reveal>
            <Reveal delay={60}><Titolo>Prenotazioni online dal tuo dominio</Titolo></Reveal>
            <Reveal as="p" delay={120} className="mt-5 text-lg text-stone-600 leading-relaxed">Condividi il tuo indirizzo — su WhatsApp, Instagram, Google o con un QR in negozio — e i clienti trovano il sito del tuo salone: prenotano da soli 24 ore su 24, scoprono gli eventi in programma e tutte le informazioni utili. È un modulo del gestionale, attivabile quando vuoi.</Reveal>
            <Reveal delay={180} className="mt-6">
              <SiteLink to="/licenza#moduli" className="font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all" style={{ color: ACCENT }}>Tutti i moduli attivabili <ArrowRight size={17} /></SiteLink>
            </Reveal>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {ONLINE_PUNTI.map(([Icon, t, d], i) => (
              <Reveal key={i} delay={i * 80} className="bg-stone-50 rounded-3xl border border-stone-200 p-5 lc-lift">
                <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ background: GOLD_SOFT, color: ACCENT }}><Icon size={19} /></div>
                <div className="font-bold text-stone-900">{t}</div>
                <div className="text-[15px] text-stone-600 leading-relaxed mt-1">{d}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand titolo="Vuoi vederlo sul tuo salone?" testo="Attiva una demo gratuita di 10 giorni con tutti i moduli, oppure scrivici e ti mostriamo Lucentia dal vivo, con i tuoi servizi e i tuoi operatori." img="/anteprime/statistiche-desktop.webp" alt="Statistiche del gestionale Lucentia" phone="/anteprime/clienti-mobile.webp" />
    </>
  );
}
