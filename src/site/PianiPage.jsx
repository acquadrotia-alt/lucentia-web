import { ArrowRight, Sparkles, Check, X, Minus, Users, Puzzle, Receipt, HelpCircle } from "lucide-react";
import { GOLD, GOLD_SOFT, INK, Reveal, SiteLink, useSite } from "./ui.jsx";
import { PIANI, MODULI, ADDON_ONLINE, CONFRONTO, INCLUSO_OVUNQUE, FAQ } from "./dati.js";

// Cella della tabella di confronto: true/false diventano spunta o trattino,
// una stringa viene mostrata così com'è.
function Cella({ v }) {
  if (v === true) return <Check size={17} style={{ color: GOLD }} className="mx-auto" aria-label="Incluso" />;
  if (v === false) return <Minus size={17} className="mx-auto text-stone-300" aria-label="Non incluso" />;
  return <span className="text-sm font-medium text-stone-700">{v}</span>;
}

// Pagina Piani: prezzi, cosa comprende ogni piano, confronto puntuale,
// moduli aggiuntivi e add-on prenotazioni online.
export default function PianiPage() {
  const { openLead } = useSite();
  const inPiano = (m, p) => p.moduli.includes(m.key);
  return (
    <>
      {/* INTESTAZIONE */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `radial-gradient(65% 65% at 50% 0%, ${GOLD_SOFT} 0%, #ffffff 70%)` }} />
        <div className="relative max-w-4xl mx-auto px-5 pt-14 pb-12 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full mb-5 lc-fade-up" style={{ background: "#fff", color: GOLD, border: `1px solid ${GOLD_SOFT}` }}><Receipt size={13} /> Piani e prezzi</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight text-stone-900 lc-fade-up" style={{ animationDelay: "120ms" }}>Scegli il piano <span className="font-display-i" style={{ color: GOLD }}>su misura</span></h1>
          <p className="mt-5 text-base sm:text-lg text-stone-500 max-w-2xl mx-auto lc-fade-up" style={{ animationDelay: "220ms" }}>Tre piani con canone mensile, più i moduli e l'add-on che vuoi aggiungere. Prezzi chiari, nessun vincolo nascosto, tutto IVA esclusa.</p>
          <div className="mt-7 flex items-center justify-center gap-5 text-xs text-stone-400 flex-wrap lc-fade-up" style={{ animationDelay: "320ms" }}>
            <span className="inline-flex items-center gap-1.5"><Check size={14} style={{ color: GOLD }} /> Prova gratuita di 10 giorni</span>
            <span className="inline-flex items-center gap-1.5"><Check size={14} style={{ color: GOLD }} /> Cambio piano in qualsiasi momento</span>
            <span className="inline-flex items-center gap-1.5"><Check size={14} style={{ color: GOLD }} /> Assistenza inclusa</span>
          </div>
        </div>
      </section>

      {/* I TRE PIANI */}
      <section id="piani" style={{ background: INK }} className="text-white scroll-mt-24">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="grid lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {PIANI.map((p, pi) => (
              <Reveal key={p.name} delay={pi * 110} className={`rounded-2xl p-6 flex flex-col lc-lift ${p.highlight ? "lc-glow-card lg:-translate-y-2" : ""}`} style={{ background: p.highlight ? "#26231f" : "#211e1b", border: `1px solid ${p.highlight ? GOLD : "#3a352f"}` }}>
                {p.highlight ? <div className="self-start text-[11px] font-semibold px-2.5 py-1 rounded-full mb-3" style={{ background: GOLD, color: INK }}>Consigliato</div> : <div className="h-[26px] mb-3" />}
                <div className="font-display text-2xl font-semibold" style={{ color: p.highlight ? GOLD : "#fff" }}>{p.name}</div>
                <p className="text-sm text-stone-400 mt-1.5 min-h-[2.5rem]">{p.tagline}</p>
                {p.full ? <div className="mt-3 inline-flex self-start items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(184,137,59,0.18)", color: GOLD }}>Prezzo di lancio −50%</div> : <div className="mt-3 h-[22px]" />}
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold">€{p.price}</span>
                  {p.full ? <span className="text-lg text-stone-500 line-through">€{p.full}</span> : null}
                  <span className="text-stone-400 text-sm">/mese</span>
                </div>
                <div className="text-xs text-stone-400 mt-1">{p.act} · IVA escl.</div>
                <div className="mt-4 inline-flex self-start items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#e7e5e4" }}><Users size={13} /> {p.operatori}</div>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {p.feats.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-200"><Check size={16} style={{ color: GOLD }} className="mt-0.5 shrink-0" /> {f}</li>
                  ))}
                  {p.esclusi.map((f, i) => (
                    <li key={`x${i}`} className="flex items-start gap-2 text-sm text-stone-500"><X size={16} className="mt-0.5 shrink-0 text-stone-600" /> {f}</li>
                  ))}
                </ul>
                <button onClick={() => openLead({ kind: "licenza", piano: p.name })} className={`mt-6 w-full font-semibold py-2.5 rounded-xl transition hover:-translate-y-0.5 ${p.highlight ? "lc-shine" : "hover:bg-white/5"}`} style={p.highlight ? { background: GOLD, color: INK } : { background: "transparent", color: "#fff", border: "1px solid #4a443d" }}>Richiedi {p.name}</button>
              </Reveal>
            ))}
          </div>
          <Reveal delay={360} className="mt-10 max-w-3xl mx-auto rounded-2xl p-6" style={{ background: "#211e1b", border: "1px solid #3a352f" }}>
            <div className="text-sm font-semibold mb-3" style={{ color: GOLD }}>Compreso in ogni piano, sempre</div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
              {INCLUSO_OVUNQUE.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-stone-300"><Check size={15} style={{ color: GOLD }} className="mt-0.5 shrink-0" /> {t}</div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CONFRONTO */}
      <section id="confronto" className="scroll-mt-24">
        <div className="max-w-5xl mx-auto px-5 py-16">
          <div className="text-center mb-10">
            <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Confronto</Reveal>
            <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">Cosa cambia tra Basic, Smart e Pro</Reveal>
          </div>
          <Reveal delay={140} className="rounded-2xl border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="py-3.5 px-4 text-sm font-semibold text-stone-500">Funzione</th>
                    {PIANI.map((p) => (
                      <th key={p.name} className="py-3.5 px-4 text-center">
                        <div className="font-display text-lg font-semibold" style={{ color: p.highlight ? GOLD : "#1c1917" }}>{p.name}</div>
                        <div className="text-[11px] text-stone-400 font-normal">€{p.price}/mese</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CONFRONTO.map((r, i) => (
                    <tr key={i} className={`border-b border-stone-100 last:border-0 ${i % 2 ? "bg-stone-50/50" : ""}`}>
                      <td className="py-3 px-4 text-sm text-stone-700">{r[0]}</td>
                      <td className="py-3 px-4 text-center"><Cella v={r[1]} /></td>
                      <td className="py-3 px-4 text-center"><Cella v={r[2]} /></td>
                      <td className="py-3 px-4 text-center"><Cella v={r[3]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
          <p className="text-xs text-stone-400 text-center mt-4">Canoni mensili IVA esclusa. L'add-on prenotazioni online si somma al canone del piano.</p>
        </div>
      </section>

      {/* MODULI */}
      <section id="moduli" className="bg-stone-50 border-y border-stone-100 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-12">
            <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Moduli</Reveal>
            <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">I moduli, uno per uno</Reveal>
            <Reveal as="p" delay={160} className="mt-3 text-stone-500 max-w-2xl mx-auto">Ogni modulo accende una parte del gestionale. Sotto trovi cosa fa e in quali piani è compreso.</Reveal>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULI.map((m, i) => (
              <Reveal key={m.key} delay={(i % 3) * 90} className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col lc-lift">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: GOLD_SOFT, color: GOLD }}><m.icon size={20} /></div>
                <h3 className="font-semibold text-stone-900 mb-1.5">{m.nome}</h3>
                <p className="text-sm text-stone-500 leading-relaxed flex-1">{m.desc}</p>
                <div className="mt-4 pt-4 border-t border-stone-100 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-stone-400 mr-1">Incluso in:</span>
                  {PIANI.map((p) => (
                    <span key={p.name} className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={inPiano(m, p) ? { background: GOLD_SOFT, color: GOLD } : { background: "#f5f5f4", color: "#a8a29e", textDecoration: "line-through" }}>{p.name}</span>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>

          {/* Operatori */}
          <Reveal delay={200} className="mt-8 bg-white rounded-2xl border border-stone-200 p-6 sm:p-8">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: GOLD_SOFT, color: GOLD }}><Users size={20} /></div>
              <div>
                <h3 className="font-semibold text-stone-900">Numero di operatori</h3>
                <p className="text-sm text-stone-500 leading-relaxed">È il limite di collaboratori gestibili in agenda. Dal secondo operatore in poi ognuno può avere le proprie credenziali e vedere solo la sua giornata.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {PIANI.map((p) => (
                <div key={p.name} className="rounded-xl border border-stone-200 p-4">
                  <div className="text-xs text-stone-400">{p.name}</div>
                  <div className="font-semibold text-stone-900 mt-0.5">{p.operatori}</div>
                  <div className="text-xs text-stone-500 mt-1">{p.tier === "1" ? "Accessi operatori non disponibili" : "Con accessi dedicati per ciascuno"}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ADD-ON PRENOTAZIONI ONLINE */}
      <section id="addon" className="relative overflow-hidden scroll-mt-24">
        <div className="absolute inset-0" style={{ background: `radial-gradient(70% 70% at 50% 0%, ${GOLD_SOFT} 0%, #ffffff 65%)` }} />
        <div className="relative max-w-5xl mx-auto px-5 py-16">
          <div className="rounded-3xl border border-stone-200 bg-white/80 backdrop-blur shadow-sm overflow-hidden">
            <div className="grid lg:grid-cols-2">
              <div className="p-8 sm:p-10">
                <Reveal className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-4" style={{ background: GOLD_SOFT, color: GOLD }}><Puzzle size={13} /> Add-on · si somma al piano</Reveal>
                <Reveal as="h2" delay={60} className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">{ADDON_ONLINE.nome}</Reveal>
                <Reveal as="p" delay={120} className="mt-3 text-stone-500 leading-relaxed">{ADDON_ONLINE.desc}</Reveal>
                <Reveal delay={180} className="mt-6 space-y-2.5">
                  {["Non è compreso in nessun piano: si attiva a parte", "Richiede il piano Smart o Pro", "Con Basic non è attivabile", "Attivabile e disattivabile in qualsiasi momento"].map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-stone-700"><Check size={16} style={{ color: GOLD }} className="mt-0.5 shrink-0" /> {t}</div>
                  ))}
                </Reveal>
                <Reveal delay={240} className="mt-6 text-sm text-stone-500">
                  Vuoi sapere cosa ci trovano i tuoi clienti? <SiteLink to="/funzionalita" className="font-semibold hover:underline" style={{ color: GOLD }}>Guarda il mini-sito nelle funzionalità</SiteLink>.
                </Reveal>
              </div>
              <div className="relative p-8 sm:p-10 flex flex-col justify-center items-center text-center border-t lg:border-t-0 lg:border-l border-stone-100" style={{ background: INK }}>
                <Reveal className="lc-float">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: GOLD, color: INK }}><ADDON_ONLINE.icon size={30} /></div>
                </Reveal>
                <Reveal as="div" delay={80} className="mt-5 text-white/60 text-sm">Add-on opzionale</Reveal>
                <Reveal as="div" delay={120} className="mt-1 flex items-baseline justify-center gap-1.5"><span className="text-5xl font-bold text-white">€{ADDON_ONLINE.prezzo}</span><span className="text-white/50">{ADDON_ONLINE.periodo}</span></Reveal>
                <Reveal as="p" delay={180} className="mt-3 text-white/50 text-xs leading-relaxed max-w-[16rem]">{ADDON_ONLINE.nota}</Reveal>
                <Reveal delay={240}><button onClick={() => openLead({ kind: "licenza", piano: "Pro" })} className="mt-6 font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 lc-shine hover:-translate-y-0.5 transition" style={{ background: GOLD, color: INK }}>Lo voglio nel mio salone <ArrowRight size={17} /></button></Reveal>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONFIGURAZIONE SU MISURA */}
      <section className="bg-stone-50 border-y border-stone-100">
        <div className="max-w-4xl mx-auto px-5 py-16 text-center">
          <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Su misura</Reveal>
          <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">Nessuno dei tre ti va a genio?</Reveal>
          <Reveal as="p" delay={160} className="mt-3 text-stone-500 max-w-2xl mx-auto">I tre piani sono le combinazioni più richieste, ma non sono una gabbia: possiamo comporre una licenza con esattamente i moduli e il numero di operatori che ti servono. Raccontaci come lavori e ti prepariamo un preventivo.</Reveal>
          <Reveal delay={240}>
            <button onClick={() => openLead({ kind: "licenza" })} className="mt-7 text-white font-semibold px-7 py-3 rounded-xl inline-flex items-center gap-2 lc-shine hover:-translate-y-0.5 hover:shadow-lg transition" style={{ background: INK }}>Chiedi un preventivo su misura <ArrowRight size={17} /></button>
          </Reveal>
        </div>
      </section>

      {/* DOMANDE FREQUENTI */}
      <section id="domande" className="scroll-mt-24">
        <div className="max-w-3xl mx-auto px-5 py-16">
          <div className="text-center mb-10">
            <Reveal className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Domande frequenti</Reveal>
            <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold text-stone-900">Prima di decidere</Reveal>
          </div>
          <div className="space-y-3">
            {FAQ.map(([q, a], i) => (
              <Reveal key={i} delay={i * 70} className="bg-white rounded-2xl border border-stone-200 p-5">
                <div className="flex items-start gap-3">
                  <HelpCircle size={18} className="mt-0.5 shrink-0" style={{ color: GOLD }} />
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">{q}</div>
                    <p className="text-sm text-stone-500 leading-relaxed mt-1">{a}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: INK }} className="text-white">
        <div className="max-w-4xl mx-auto px-5 py-16 text-center">
          <Reveal as="img" src="/lucentia-mark.png" alt="Lucentia" className="h-14 w-14 rounded-2xl mx-auto mb-5 lc-float" />
          <Reveal as="h2" delay={80} className="font-display text-3xl sm:text-4xl font-bold">Provalo prima di scegliere il piano</Reveal>
          <Reveal as="p" delay={160} className="mt-3 text-stone-400 max-w-xl mx-auto">10 giorni di prova gratuita con tutti i moduli attivi. Nessuna carta di credito, nessun rinnovo automatico.</Reveal>
          <Reveal delay={240} className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            <button onClick={() => openLead({ kind: "demo" })} className="font-semibold px-7 py-3 rounded-xl inline-flex items-center gap-2 lc-shine hover:-translate-y-0.5 transition" style={{ background: GOLD, color: INK }}><Sparkles size={17} /> Prova gratis 10 giorni</button>
            <SiteLink to="/#contatti" className="font-semibold px-7 py-3 rounded-xl inline-flex items-center gap-2 border border-white/25 text-white hover:bg-white/10 transition">Parla con noi <ArrowRight size={17} /></SiteLink>
          </Reveal>
        </div>
      </section>
    </>
  );
}
