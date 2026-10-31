import { ArrowRight, Sparkles, Check, ToggleRight } from "lucide-react";
import { GOLD, GOLD_SOFT, ACCENT, INK, Reveal, SiteLink, CtaBand, Faq, useSite, BtnInk, BtnLight, BtnGold, Eyebrow, Titolo, Intestazione, IconTile } from "./ui.jsx";
import { LICENZA_INCLUDE, MODULI, FAQ_LICENZA } from "./dati.js";

// Pagina Licenza: cosa comprende la licenza annuale, i moduli e le
// integrazioni attivabili, le domande frequenti. Nessun prezzo: la licenza
// è su preventivo, in base a moduli e personalizzazioni.
export default function LicenzaPage() {
  const { openLead } = useSite();
  return (
    <>
      {/* INTESTAZIONE */}
      <section className="max-w-6xl mx-auto px-5 pt-12 pb-10 sm:pt-20 sm:pb-14">
        <div className="grid lg:grid-cols-5 gap-10 items-center">
          <div className="lg:col-span-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 lc-fade-up"><span className="w-2 h-2 rounded-full" style={{ background: GOLD }} /> Licenza annuale</div>
            <Titolo as="h1" size="lg" className="mt-5 lc-fade-up" style={{ animationDelay: "100ms" }}>Un solo canone all'anno, <span style={{ color: ACCENT }}>tutto incluso</span></Titolo>
            <p className="mt-6 text-lg text-stone-600 leading-relaxed lc-fade-up" style={{ animationDelay: "200ms" }}>Dominio, hosting su Cloudflare, sito vetrina, gestionale, aggiornamenti e assistenza. Nessun costo nascosto, nessuna voce da sommare: una licenza annuale costruita sui moduli e sulle personalizzazioni del tuo salone.</p>
            <div className="mt-8 flex items-center gap-3 flex-wrap lc-fade-up" style={{ animationDelay: "300ms" }}>
              <BtnInk size="lg" onClick={() => openLead({ kind: "licenza" })}>Richiedi un preventivo <ArrowRight size={17} /></BtnInk>
              <BtnLight size="lg" onClick={() => openLead({ kind: "demo" })}><Sparkles size={16} style={{ color: ACCENT }} /> Prova la demo</BtnLight>
            </div>
          </div>
          <Reveal delay={150} className="lg:col-span-2 rounded-[2rem] p-7 sm:p-8 text-white" style={{ background: INK }}>
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: GOLD }}>Su preventivo</div>
            <div className="mt-3 font-bold tracking-tight text-2xl leading-tight">Il prezzo dipende da due cose</div>
            <ul className="mt-5 space-y-3 text-[15px] text-stone-200">
              <li className="flex items-start gap-3"><span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0" style={{ background: GOLD, color: INK }}>1</span> I moduli e le integrazioni che attivi</li>
              <li className="flex items-start gap-3"><span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0" style={{ background: GOLD, color: INK }}>2</span> Le personalizzazioni di sito e gestionale</li>
            </ul>
            <p className="mt-5 text-sm text-stone-400 leading-relaxed">Ci racconti come lavora il tuo salone e ti rispondiamo con un'offerta chiara. Senza sorprese al rinnovo.</p>
          </Reveal>
        </div>
      </section>

      {/* COSA INCLUDE */}
      <section id="include" className="max-w-6xl mx-auto px-5 scroll-mt-24">
        <div className="bg-stone-100 rounded-[2rem] sm:rounded-[2.5rem] px-5 py-12 sm:p-12 lg:p-16">
          <Intestazione eyebrow="Cosa include" titolo="Tutto quello che serve per stare online e lavorare" testo="Ogni licenza comprende l'intera infrastruttura: non devi comprare o gestire niente a parte." />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {LICENZA_INCLUDE.map(([Icon, t, d], i) => (
              <Reveal key={i} delay={(i % 4) * 70} className="bg-white rounded-3xl p-6 lc-lift">
                <IconTile icon={Icon} size={46} className="mb-5" />
                <h3 className="font-bold text-stone-900 tracking-tight">{t}</h3>
                <p className="mt-1.5 text-[15px] text-stone-600 leading-relaxed">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* MODULI E INTEGRAZIONI */}
      <section id="moduli" className="max-w-6xl mx-auto px-5 py-16 sm:py-24 scroll-mt-24">
        <div className="grid lg:grid-cols-5 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-2 lg:sticky lg:top-28">
            <Reveal><Eyebrow className="mb-3">Moduli e integrazioni</Eyebrow></Reveal>
            <Reveal delay={60}><Titolo>Scegli cosa attivare. Anche dopo.</Titolo></Reveal>
            <Reveal as="p" delay={120} className="mt-5 text-lg text-stone-600 leading-relaxed">Agenda, clienti, buoni regalo, eventi, accessi operatori, listino PDF e backup ci sono sempre. I moduli qui a fianco si aggiungono in base a come lavori — e si possono attivare in qualsiasi momento.</Reveal>
            <Reveal delay={180} className="mt-6 rounded-3xl border border-stone-200 p-5 flex items-start gap-4" style={{ background: GOLD_SOFT, borderColor: "#e9dcc0" }}>
              <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0" style={{ color: ACCENT }}><ToggleRight size={22} /></div>
              <div><div className="font-bold text-stone-900">Li accendiamo noi dal portale Lucentia</div><p className="mt-1 text-[15px] text-stone-600 leading-relaxed">Un modulo in più compare subito nel tuo gestionale, senza interruzioni e senza perdere dati.</p></div>
            </Reveal>
          </div>
          <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
            {MODULI.map((m, i) => (
              <Reveal key={m.key} delay={(i % 2) * 80} className="bg-white rounded-3xl border border-stone-200 p-6 lc-lift">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: GOLD_SOFT, color: ACCENT }}><m.icon size={19} /></div>
                  <h3 className="font-bold text-stone-900 tracking-tight">{m.nome}</h3>
                </div>
                <p className="mt-4 text-[15px] text-stone-600 leading-relaxed">{m.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-6xl mx-auto px-5 scroll-mt-24">
        <div className="bg-stone-100 rounded-[2rem] sm:rounded-[2.5rem] px-5 py-12 sm:p-12 lg:p-16">
          <div className="grid lg:grid-cols-5 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-2">
              <Reveal><Eyebrow className="mb-3">Domande frequenti</Eyebrow></Reveal>
              <Reveal delay={60}><Titolo>Sulla licenza</Titolo></Reveal>
              <Reveal as="p" delay={120} className="mt-4 text-lg text-stone-600 leading-relaxed">Costi, moduli, dati e scadenza. Per tempi e percorso, <SiteLink to="/come-funziona#faq" className="font-semibold hover:underline" style={{ color: ACCENT }}>vai alla pagina Come funziona</SiteLink>.</Reveal>
              <Reveal delay={180} className="mt-6 hidden lg:flex items-center gap-3 flex-wrap">
                <BtnInk onClick={() => openLead({ kind: "licenza" })}>Richiedi un preventivo <ArrowRight size={16} /></BtnInk>
              </Reveal>
            </div>
            <Reveal delay={100} className="lg:col-span-3"><Faq items={FAQ_LICENZA} /></Reveal>
          </div>
        </div>
      </section>

      <CtaBand titolo="Raccontaci il tuo salone, ti rispondiamo con un preventivo chiaro." testo="Un solo canone all'anno, moduli e personalizzazioni scelti insieme. Oppure parti dalla demo gratuita e decidi con calma." img="/anteprime/vendite-desktop.webp" alt="Cassa e magazzino del gestionale Lucentia" phone="/anteprime/agenda-mobile.webp" />
    </>
  );
}
