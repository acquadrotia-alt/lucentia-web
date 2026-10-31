import { ArrowRight, Sparkles, Globe, LayoutTemplate, Check } from "lucide-react";
import { GOLD, GOLD_SOFT, ACCENT, INK, Reveal, SiteLink, ContattiSection, CtaBand, useSite, BtnInk, BtnLight, Eyebrow, Titolo, Intestazione, IconTile, Browser, Telefono } from "./ui.jsx";
import { FUNZIONALITA_HOME, FIDUCIA, PASSI, PERCHE, LICENZA_SINTESI } from "./dati.js";

// Le tre anteprime in evidenza nel blocco funzionalità della home.
const VETRINA = [
  { img: "/anteprime/agenda-desktop.webp", alt: "Agenda del gestionale Lucentia", chip: "Agenda", sotto: "Operatori, cabine e fasi" },
  { img: "/anteprime/clienti-desktop.webp", alt: "Scheda clienti del gestionale Lucentia", chip: "Clienti", sotto: "Storico, fidelity, pacchetti" },
  { img: "/anteprime/minisito-desktop.webp", alt: "Sito vetrina di un salone realizzato con Lucentia", chip: "Il tuo sito", sotto: "Prenotazioni ed eventi" },
];

// Home: la prima cosa che si vede aprendo il sito. Racconta il concetto
// (sito + dominio + gestionale dedicati), un assaggio di funzionalità, i tre
// passi, le ragioni per scegliere Lucentia, la licenza in sintesi e i contatti.
export default function HomePage() {
  const { openLead } = useSite();
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 pt-10 pb-16 sm:pt-16 sm:pb-24 grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 lc-fade-up"><span className="w-2 h-2 rounded-full" style={{ background: GOLD }} /> Per parrucchieri e centri estetici</div>
            <h1 className="mt-5 font-bold tracking-[-0.035em] leading-[1.02] text-stone-900 text-[2.75rem] sm:text-6xl lg:text-[4.25rem] lc-fade-up" style={{ animationDelay: "100ms" }}>
              Il tuo sito.<br />Il tuo dominio.<br />Il tuo <span style={{ color: ACCENT }}>gestionale</span>.
            </h1>
            <p className="mt-6 text-lg text-stone-600 leading-relaxed max-w-lg lc-fade-up" style={{ animationDelay: "200ms" }}>Un progetto dedicato per ogni salone, non un abbonamento a un software condiviso: un sito vetrina sul tuo dominio e, dietro, un gestionale completo costruito su come lavori.</p>
            <div className="mt-8 flex items-center gap-3 flex-wrap lc-fade-up" style={{ animationDelay: "300ms" }}>
              <BtnInk size="lg" onClick={() => openLead({ kind: "demo" })}><Sparkles size={17} style={{ color: GOLD }} /> Prova la demo gratis</BtnInk>
              <BtnLight size="lg" onClick={() => openLead({ kind: "licenza" })}>Richiedi un preventivo</BtnLight>
            </div>
            <div className="mt-9 flex items-center gap-x-6 gap-y-3 flex-wrap text-sm text-stone-600 lc-fade-up" style={{ animationDelay: "400ms" }}>
              {FIDUCIA.map(([Icon, t], i) => (
                <span key={i} className="inline-flex items-center gap-2"><Icon size={17} style={{ color: ACCENT }} /> {t}</span>
              ))}
            </div>
          </div>

          {/* Visual: agenda desktop in cornice, telefono in sovrapposizione */}
          <div className="relative lc-fade-up lg:pl-6" style={{ animationDelay: "250ms" }}>
            <div className="relative rounded-[2.5rem] overflow-hidden aspect-[5/4] sm:aspect-[4/3] lg:aspect-[5/4.4]" style={{ background: `linear-gradient(145deg, ${GOLD_SOFT} 0%, #ebe1cc 100%)` }}>
              <div className="pointer-events-none absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-70" style={{ background: `radial-gradient(circle, rgba(184,137,59,0.35) 0%, transparent 70%)` }} />
              <div className="absolute left-[9%] top-[13%] w-[108%]">
                <Browser src="/anteprime/agenda-desktop.webp" alt="Agenda del gestionale Lucentia: la giornata del salone con appuntamenti per operatore" className="!rounded-2xl" />
              </div>
            </div>
            <Telefono src="/anteprime/agenda-mobile.webp" alt="Agenda di Lucentia su smartphone" className="absolute w-[30%] max-w-[11rem] -bottom-6 -left-2 sm:-left-4 -rotate-6 lc-float" />
            <div className="absolute top-5 -right-1 sm:top-8 sm:-right-3 bg-white rounded-2xl shadow-lg border border-stone-100 px-4 py-3 flex items-center gap-3 lc-fade-up" style={{ animationDelay: "700ms" }}>
              <span className="relative flex w-2.5 h-2.5"><span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" /><span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500" /></span>
              <div className="leading-tight"><div className="text-[13px] font-semibold text-stone-900">tuodominio.it</div><div className="text-[11px] text-stone-500">Sito e gestionale online</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* COS'È */}
      <section className="max-w-6xl mx-auto px-5 pt-4 pb-16 sm:pb-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <Reveal><Eyebrow className="mb-3">Cos'è Lucentia</Eyebrow></Reveal>
            <Reveal delay={60}><Titolo>Un indirizzo per i tuoi clienti, uno per te</Titolo></Reveal>
            <Reveal as="p" delay={120} className="mt-5 text-lg text-stone-600 leading-relaxed">Il tuo dominio ospita il sito vetrina del salone: foto, servizi, eventi, catalogo e prenotazione online. Dietro, su <b className="text-stone-900">/gestionale</b>, lavori ogni giorno con agenda, clienti e cassa. Tutto in un database solo tuo, aggiornato da un unico posto.</Reveal>
            <Reveal delay={180} className="mt-6">
              <SiteLink to="/come-funziona" className="font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all" style={{ color: ACCENT }}>Scopri come funziona <ArrowRight size={17} /></SiteLink>
            </Reveal>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              [Globe, "tuodominio.it", "Il sito vetrina", "Personalizzato con le tue foto, i tuoi colori e i tuoi testi. Prenotazioni online, eventi e catalogo prodotti si aggiornano dal gestionale.", false],
              [LayoutTemplate, "tuodominio.it/gestionale", "Il gestionale", "Agenda intelligente, scheda cliente, fidelity, cassa e magazzino, statistiche, marketing: i moduli che ti servono, su misura.", true],
            ].map(([Icon, url, t, d, dark], i) => (
              <Reveal key={i} delay={i * 100} className={`rounded-3xl p-6 lc-lift ${dark ? "text-white" : "bg-stone-50 border border-stone-200"}`} style={dark ? { background: INK } : undefined}>
                <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${dark ? "bg-white/10 text-stone-200" : "bg-white border border-stone-200 text-stone-600"}`}><Icon size={12} style={{ color: GOLD }} /> {url}</div>
                <h3 className={`mt-4 text-xl font-bold tracking-tight ${dark ? "" : "text-stone-900"}`}>{t}</h3>
                <p className={`mt-2 text-[15px] leading-relaxed ${dark ? "text-stone-300" : "text-stone-600"}`}>{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FUNZIONALITÀ */}
      <section className="max-w-6xl mx-auto px-5">
        <div className="bg-stone-100 rounded-[2rem] sm:rounded-[2.5rem] px-5 py-12 sm:p-12 lg:p-16">
          <Intestazione eyebrow="Funzionalità" titolo="Tutto il salone in un unico gestionale" testo="Dall'appuntamento all'incasso, dalla scheda cliente al sito: ogni funzione al suo posto, con i moduli attivati su misura." />
          <div className="mt-12 grid md:grid-cols-3 gap-8 md:gap-6">
            {FUNZIONALITA_HOME.map(([Icon, t, d], i) => (
              <Reveal key={i} delay={i * 90} className="flex items-start gap-4">
                <IconTile icon={Icon} size={52} />
                <div><h3 className="font-bold text-stone-900 text-lg tracking-tight">{t}</h3><p className="mt-1 text-[15px] text-stone-600 leading-relaxed">{d}</p></div>
              </Reveal>
            ))}
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {VETRINA.map((v, i) => (
              <Reveal key={i} delay={i * 90} className="relative rounded-3xl overflow-hidden bg-white border border-stone-200 aspect-[4/3] lc-lift group">
                <img src={v.img} alt={v.alt} loading="lazy" className="absolute inset-0 w-full h-full object-cover object-left-top transition-transform duration-700 group-hover:scale-[1.04]" style={{ objectPosition: "0 0" }} />
                <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: "linear-gradient(to top, rgba(28,25,23,0.45), transparent)" }} />
                <div className="absolute left-4 bottom-4 bg-white rounded-2xl shadow-lg px-4 py-2.5">
                  <div className="text-[13px] font-bold text-stone-900">{v.chip}</div>
                  <div className="text-[11px] text-stone-500">{v.sotto}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200} className="mt-10 text-center">
            <BtnLight size="lg" to="/funzionalita">Tutte le funzionalità <ArrowRight size={17} /></BtnLight>
          </Reveal>
        </div>
      </section>

      {/* COME FUNZIONA */}
      <section className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
        <Intestazione eyebrow="Come funziona" titolo="Online in 3 semplici passi" testo="Dalla demo gratuita al tuo dominio: ti accompagniamo noi, un passo alla volta." />
        <div className="relative mt-14 grid md:grid-cols-3 gap-10 md:gap-6">
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+2.75rem)] right-[calc(16.67%+2.75rem)] h-px bg-stone-200" aria-hidden="true" />
          {PASSI.map((p, i) => (
            <Reveal key={i} delay={i * 120} className="flex flex-col items-center text-center">
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center" style={{ background: GOLD_SOFT, color: ACCENT }}>
                <p.icon size={30} strokeWidth={1.75} />
              </div>
              <div className="mt-6 flex items-start gap-3 text-left max-w-xs">
                <span className="mt-0.5 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: INK }}>{i + 1}</span>
                <div><h3 className="font-bold text-stone-900 text-lg tracking-tight leading-snug">{p.titolo}</h3><p className="mt-1.5 text-[15px] text-stone-600 leading-relaxed">{p.breve}</p></div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={300} className="mt-12 flex items-center justify-center gap-3 flex-wrap">
          <BtnInk size="lg" onClick={() => openLead({ kind: "demo" })}><Sparkles size={17} style={{ color: GOLD }} /> Inizia dalla demo</BtnInk>
          <SiteLink to="/come-funziona" className="font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all px-3" style={{ color: ACCENT }}>Il percorso nel dettaglio <ArrowRight size={17} /></SiteLink>
        </Reveal>
      </section>

      {/* PERCHÉ LUCENTIA */}
      <section className="max-w-6xl mx-auto px-5">
        <div className="bg-stone-100 rounded-[2rem] sm:rounded-[2.5rem] px-5 py-12 sm:p-12 lg:p-16">
          <Intestazione eyebrow="Perché Lucentia" titolo="Pensato per chi sta dietro alla poltrona" testo="Niente software condiviso, niente call center: un progetto costruito sul tuo salone, che cresce con te." />
          <div className="mt-12 grid md:grid-cols-2 gap-5">
            {PERCHE.map(([Icon, t, d], i) => (
              <Reveal key={i} delay={(i % 2) * 100} className="bg-white rounded-3xl p-6 sm:p-8 flex items-start gap-5 lc-lift">
                <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: GOLD_SOFT, color: ACCENT }}><Icon size={24} strokeWidth={1.75} /></div>
                <div><h3 className="font-bold text-stone-900 text-lg tracking-tight">{t}</h3><p className="mt-2 text-[15px] text-stone-600 leading-relaxed">{d}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* LICENZA IN SINTESI */}
      <section className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <Reveal><Eyebrow className="mb-3">Licenza annuale</Eyebrow></Reveal>
            <Reveal delay={60}><Titolo>Un solo canone all'anno, tutto incluso</Titolo></Reveal>
            <Reveal as="p" delay={120} className="mt-5 text-lg text-stone-600 leading-relaxed">Dominio, hosting su Cloudflare, sito, gestionale, aggiornamenti e assistenza: nessun costo nascosto. Il prezzo è su preventivo, in base ai moduli e alle personalizzazioni che servono al tuo salone.</Reveal>
            <Reveal delay={180} className="mt-6 flex flex-wrap gap-2">
              {LICENZA_SINTESI.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-stone-100 text-stone-700"><Check size={14} style={{ color: ACCENT }} /> {t}</span>
              ))}
            </Reveal>
          </div>
          <Reveal delay={120} className="rounded-[2rem] p-7 sm:p-9 border" style={{ background: GOLD_SOFT, borderColor: "#e9dcc0" }}>
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: ACCENT }}>Su preventivo</div>
            <div className="mt-3 font-bold tracking-tight text-stone-900 text-2xl sm:text-3xl leading-tight">Ci racconti il tuo salone, ti rispondiamo con un'offerta chiara.</div>
            <ul className="mt-5 space-y-2.5 text-[15px] text-stone-700">
              {["Moduli e integrazioni scelti insieme", "Attivabili in qualsiasi momento, anche dopo", "Il sito e il gestionale vengono sospesi solo se la licenza non viene rinnovata"].map((t) => (
                <li key={t} className="flex items-start gap-2.5"><Check size={17} className="mt-0.5 shrink-0" style={{ color: ACCENT }} /> {t}</li>
              ))}
            </ul>
            <div className="mt-7 flex items-center gap-3 flex-wrap">
              <BtnInk size="lg" onClick={() => openLead({ kind: "licenza" })}>Richiedi un preventivo <ArrowRight size={17} /></BtnInk>
              <SiteLink to="/licenza" className="font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all px-2" style={{ color: ACCENT }}>Cosa include <ArrowRight size={17} /></SiteLink>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand titolo="Pronto a dare al tuo salone un indirizzo tutto suo?" testo="Prova la demo gratuita per 10 giorni, oppure raccontaci come lavori e ti prepariamo un preventivo su misura." />

      <ContattiSection />
    </>
  );
}
