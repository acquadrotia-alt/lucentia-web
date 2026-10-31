import { ArrowRight, Sparkles, Globe, LayoutTemplate } from "lucide-react";
import { GOLD, GOLD_SOFT, ACCENT, INK, Reveal, SiteLink, Punti, CtaBand, Faq, useSite, BtnInk, BtnLight, Eyebrow, Titolo, Intestazione, IconTile, Telefono } from "./ui.jsx";
import { PASSI, PERSONALIZZAZIONI_SITO, PERSONALIZZAZIONI_GESTIONALE, SUPPORTO, FAQ_PROCESSO } from "./dati.js";

// Pagina Come funziona: il percorso dalla demo al proprio dominio, cosa
// viene personalizzato, come funzionano aggiornamenti e assistenza, FAQ.
export default function ComeFunzionaPage() {
  const { openLead } = useSite();
  return (
    <>
      {/* INTESTAZIONE */}
      <section className="max-w-6xl mx-auto px-5 pt-12 pb-10 sm:pt-20 sm:pb-14">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 lc-fade-up"><span className="w-2 h-2 rounded-full" style={{ background: GOLD }} /> Come funziona</div>
            <Titolo as="h1" size="lg" className="mt-5 lc-fade-up" style={{ animationDelay: "100ms" }}>Dalla demo al tuo <span style={{ color: ACCENT }}>dominio</span>, in tre passi</Titolo>
            <p className="mt-6 text-lg text-stone-600 leading-relaxed lc-fade-up" style={{ animationDelay: "200ms" }}>Non compri un software: avvii un progetto. Provi, progettiamo insieme, vai online con il tuo indirizzo. E da quel giorno il salone lavora da tuodominio.it/gestionale.</p>
            <div className="mt-8 flex items-center gap-3 flex-wrap lc-fade-up" style={{ animationDelay: "300ms" }}>
              <BtnInk size="lg" onClick={() => openLead({ kind: "demo" })}><Sparkles size={17} style={{ color: GOLD }} /> Inizia dalla demo</BtnInk>
              <BtnLight size="lg" onClick={() => openLead({ kind: "licenza" })}>Richiedi un preventivo</BtnLight>
            </div>
          </div>
          <div className="relative lc-fade-up" style={{ animationDelay: "250ms" }}>
            <div className="rounded-[2rem] p-6 sm:p-8 grid gap-3" style={{ background: `linear-gradient(145deg, ${GOLD_SOFT} 0%, #ebe1cc 100%)` }}>
              {[
                [Globe, "tuodominio.it", "Il sito vetrina per i tuoi clienti", false],
                [LayoutTemplate, "tuodominio.it/gestionale", "Il gestionale per te e il tuo team", true],
              ].map(([Icon, url, d, dark], i) => (
                <div key={i} className={`rounded-2xl p-5 flex items-center gap-4 ${dark ? "text-white" : "bg-white"}`} style={dark ? { background: INK } : undefined}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: dark ? "rgba(255,255,255,0.08)" : GOLD_SOFT, color: dark ? GOLD : ACCENT }}><Icon size={20} /></div>
                  <div className="min-w-0"><div className="font-bold tracking-tight truncate">{url}</div><div className={`text-sm ${dark ? "text-stone-300" : "text-stone-500"}`}>{d}</div></div>
                </div>
              ))}
              <div className="rounded-2xl bg-white/70 border border-white px-5 py-3 text-sm text-stone-600 leading-relaxed">Stesso dominio, stesso database: ciò che cambi nel gestionale compare subito sul sito.</div>
            </div>
          </div>
        </div>
      </section>

      {/* I TRE PASSI NEL DETTAGLIO */}
      <section className="max-w-6xl mx-auto px-5">
        <div className="bg-stone-100 rounded-[2rem] sm:rounded-[2.5rem] px-5 py-12 sm:p-12 lg:p-16">
          <Intestazione eyebrow="Il percorso" titolo="Tre passi, ti accompagniamo noi" />
          <div className="mt-12 space-y-5">
            {PASSI.map((p, i) => (
              <Reveal key={i} delay={i * 80} className="bg-white rounded-3xl p-6 sm:p-8 grid md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-4 flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: GOLD_SOFT, color: ACCENT }}><p.icon size={26} strokeWidth={1.75} /></div>
                    <span className="absolute -top-1 -left-1 w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center border-2 border-white" style={{ background: INK }}>{i + 1}</span>
                  </div>
                  <div><div className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: ACCENT }}>Passo {i + 1}</div><h3 className="mt-1 font-bold text-stone-900 text-xl tracking-tight leading-snug">{p.titolo}</h3></div>
                </div>
                <p className="md:col-span-4 text-[15px] text-stone-600 leading-relaxed">{p.dettaglio}</p>
                <Punti items={p.punti} className="md:col-span-4" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* COSA PERSONALIZZIAMO */}
      <section id="personalizzazioni" className="max-w-6xl mx-auto px-5 py-16 sm:py-24 scroll-mt-24">
        <Intestazione eyebrow="Su misura" titolo="Cosa personalizziamo" testo="Il sito racconta il tuo salone; il gestionale segue il tuo metodo di lavoro. Entrambi si adattano, all'inizio e ogni volta che cambi." />
        <div className="mt-12 grid lg:grid-cols-5 gap-5">
          <Reveal className="lg:col-span-3 rounded-3xl border border-stone-200 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6"><IconTile icon={Globe} size={44} /><div><div className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: ACCENT }}>Il sito vetrina</div><div className="font-bold text-stone-900 text-lg tracking-tight">Tutto quello che vedono i clienti</div></div></div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
              {PERSONALIZZAZIONI_SITO.map(([Icon, t, d], i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: GOLD_SOFT, color: ACCENT }}><Icon size={16} /></div>
                  <div><div className="font-semibold text-stone-900 text-[15px]">{t}</div><div className="text-sm text-stone-600 leading-relaxed">{d}</div></div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-2 rounded-3xl p-6 sm:p-8 text-white" style={{ background: INK }}>
            <div className="flex items-center gap-3 mb-6"><div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)", color: GOLD }}><LayoutTemplate size={20} /></div><div><div className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: GOLD }}>Il gestionale</div><div className="font-bold text-lg tracking-tight">Come lavorate davvero</div></div></div>
            <div className="space-y-5">
              {PERSONALIZZAZIONI_GESTIONALE.map(([Icon, t, d], i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(184,137,59,0.18)", color: GOLD }}><Icon size={16} /></div>
                  <div><div className="font-semibold text-[15px]">{t}</div><div className="text-sm text-stone-300 leading-relaxed">{d}</div></div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* AGGIORNAMENTI E ASSISTENZA */}
      <section id="assistenza" className="max-w-6xl mx-auto px-5 scroll-mt-24">
        <div className="bg-stone-100 rounded-[2rem] sm:rounded-[2.5rem] px-5 py-12 sm:p-12 lg:p-16">
          <Intestazione eyebrow="Dopo la partenza" titolo="Aggiornamenti e assistenza, inclusi" testo="Il progetto non finisce quando vai online: il gestionale si aggiorna da solo, i moduli si accendono quando servono e per qualsiasi dubbio parli con noi." />
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {SUPPORTO.map(([Icon, t, d], i) => (
              <Reveal key={i} delay={i * 90} className="bg-white rounded-3xl p-6 sm:p-7 lc-lift">
                <IconTile icon={Icon} size={48} className="mb-5" />
                <h3 className="font-bold text-stone-900 text-lg tracking-tight">{t}</h3>
                <p className="mt-2 text-[15px] text-stone-600 leading-relaxed">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-6xl mx-auto px-5 py-16 sm:py-24 scroll-mt-24">
        <div className="grid lg:grid-cols-5 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-2">
            <Reveal><Eyebrow className="mb-3">Domande frequenti</Eyebrow></Reveal>
            <Reveal delay={60}><Titolo>Sul percorso</Titolo></Reveal>
            <Reveal as="p" delay={120} className="mt-4 text-lg text-stone-600 leading-relaxed">Tempi, dominio, aggiornamenti e assistenza. Per le domande sulla licenza e su cosa include, <SiteLink to="/licenza#faq" className="font-semibold hover:underline" style={{ color: ACCENT }}>vai alla pagina Licenza</SiteLink>.</Reveal>
          </div>
          <Reveal delay={100} className="lg:col-span-3"><Faq items={FAQ_PROCESSO} /></Reveal>
        </div>
      </section>

      <CtaBand titolo="Iniziamo dalla demo?" testo="Dieci giorni gratis con tutti i moduli. Poi, se ti piace, progettiamo insieme sito e gestionale sul tuo salone." img="/anteprime/clienti-desktop.webp" alt="Scheda clienti del gestionale Lucentia" phone="/anteprime/evento-mobile.webp" />
    </>
  );
}
