import { useState, useEffect } from "react";
import { Calendar, Clock, Users, Phone, MapPin, MessageCircle, Sparkles, Share2, Check, AlertTriangle, ArrowRight } from "lucide-react";
import { setBrandTab } from "./favicon.js";
import { AvatarSvg, avatarIdFor } from "./avatars.jsx";

// Pagina pubblica di un evento del salone, raggiungibile via ?evento=<azienda>:<id>.
// Nessun login: mostra copertina, dettagli e contatti col brand del salone.

const pad = (n) => String(n).padStart(2, "0");
const minToStr = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const GIORNI = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
function fmtDataEstesa(ds) {
  const p = String(ds || "").split("-").map(Number);
  if (p.length !== 3) return ds || "";
  const d = new Date(p[0], p[1] - 1, p[2]);
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`;
}

export default function EventoPage({ token }) {
  const [stato, setStato] = useState("loading"); // loading | ok | errore
  const [dati, setDati] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const i = token.indexOf(":");
    const aid = i > 0 ? token.slice(0, i) : "";
    const eid = i > 0 ? token.slice(i + 1) : "";
    if (!aid || !eid) { setStato("errore"); return; }
    (async () => {
      try {
        const r = await fetch(`/api/evento/${encodeURIComponent(aid)}/${encodeURIComponent(eid)}`);
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) { setStato("errore"); return; }
        setDati(j); setStato("ok");
        setBrandTab(j.salone.logo, `${j.evento.titolo} · ${j.salone.brandName}`);
      } catch (e) { setStato("errore"); }
    })();
  }, [token]);

  if (stato === "loading") return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4">
      <div className="lc-spinner" />
      <div className="text-stone-400 text-sm">Caricamento evento…</div>
    </div>
  );
  if (stato === "errore") return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-sm p-6 text-center lc-scale-in">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3"><AlertTriangle size={22} /></div>
        <h2 className="font-semibold text-lg">Evento non disponibile</h2>
        <p className="text-sm text-stone-500 mt-2">Il link potrebbe essere scaduto oppure l'evento è stato rimosso. Chiedi al salone il link aggiornato.</p>
      </div>
    </div>
  );

  const { evento: ev, salone } = dati;
  const primary = salone.primary || "#b8893b";
  const wa = salone.phone ? "39" + String(salone.phone).replace(/\D/g, "") : "";
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: ev.titolo, url }); return; } catch (e) {} }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 lc-fade-in">
      {/* Copertina */}
      <div className="relative">
        {ev.copertina ? (
          <img src={ev.copertina} alt={`Copertina di ${ev.titolo}`} className="w-full h-52 sm:h-80 object-cover" />
        ) : (
          <div className="w-full h-40 sm:h-56" style={{ background: `linear-gradient(135deg, ${primary}, #1c1917)` }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45), transparent 55%)" }} />
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-14 sm:-mt-16 relative pb-12">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-lg overflow-hidden lc-scale-in">
          <div className="p-6 sm:p-8">
            {/* Salone */}
            <div className="flex items-center gap-2.5 mb-4">
              {salone.logo ? <img src={salone.logo} alt="" className="w-9 h-9 rounded-xl object-cover ring-1 ring-stone-200" /> : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: primary }}><Sparkles size={17} /></div>}
              <div className="min-w-0">
                <div className="font-semibold text-sm leading-tight truncate">{salone.brandName}</div>
                {salone.tagline ? <div className="text-xs text-stone-400 leading-tight truncate">{salone.tagline}</div> : null}
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full mb-3 text-white" style={{ background: primary }}><Sparkles size={12} /> Evento</div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">{ev.titolo}</h1>

            <div className="mt-4 space-y-2 text-[15px]">
              <div className="flex items-center gap-2.5 text-stone-700"><Calendar size={17} style={{ color: primary }} className="shrink-0" /> <span className="capitalize">{fmtDataEstesa(ev.date)}</span></div>
              <div className="flex items-center gap-2.5 text-stone-700"><Clock size={17} style={{ color: primary }} className="shrink-0" /> Dalle {minToStr(ev.startMin)} alle {minToStr(ev.endMin)}</div>
              {salone.address ? <div className="flex items-center gap-2.5 text-stone-700"><MapPin size={17} style={{ color: primary }} className="shrink-0" /> {salone.address}</div> : null}
            </div>

            {ev.descrizione ? <p className="mt-5 text-stone-600 leading-relaxed whitespace-pre-line">{ev.descrizione}</p> : null}

            {(ev.dettagli || []).length ? (
              <div className="mt-5 grid sm:grid-cols-2 gap-2.5">
                {ev.dettagli.map((d, i) => (
                  <div key={i} className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
                    {d.label ? <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: primary }}>{d.label}</div> : null}
                    {d.testo ? <div className="text-sm text-stone-700 mt-0.5">{d.testo}</div> : null}
                  </div>
                ))}
              </div>
            ) : null}

            {(ev.staff || []).length ? (
              <div className="mt-6">
                <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Users size={13} /> Con te all'evento</div>
                <div className="flex flex-wrap gap-2">
                  {ev.staff.map((st, i) => (
                    <div key={i} className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-full pl-1 pr-3 py-1">
                      {st.photo ? <img src={st.photo} alt="" className="w-7 h-7 rounded-full object-cover" /> : <div className="w-7 h-7 rounded-full overflow-hidden"><AvatarSvg id={avatarIdFor(st)} size={28} /></div>}
                      <span className="text-sm font-medium text-stone-700">{st.name}</span>
                      {st.role ? <span className="text-xs text-stone-400">· {st.role}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Azioni */}
            <div className="mt-7 grid gap-2">
              {salone.phone ? (
                <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Ciao! Vi scrivo per l'evento "${ev.titolo}" del ${fmtDataEstesa(ev.date)}.`)}`} target="_blank" rel="noreferrer" className="w-full text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 lc-shine hover:brightness-105 transition" style={{ background: primary }}>
                  <MessageCircle size={17} /> Scrivici per partecipare <ArrowRight size={15} />
                </a>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                {salone.phone ? <a href={`tel:+${wa}`} className="font-medium py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition flex items-center justify-center gap-1.5 text-sm"><Phone size={15} /> Chiama</a> : null}
                <button onClick={share} className={`font-medium py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition flex items-center justify-center gap-1.5 text-sm ${salone.phone ? "" : "col-span-2"}`}>{copied ? <><Check size={15} /> Link copiato</> : <><Share2 size={15} /> Condividi</>}</button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-stone-400 mt-6">Pagina creata con <span className="font-medium">Lucentia</span> · gestionale per parrucchieri ed estetisti</p>
      </div>
    </div>
  );
}
