import { useState, useEffect } from "react";
import { Calendar, Clock, Phone, Mail, MapPin, MessageCircle, Instagram, Facebook, Globe, Sparkles, ArrowRight, PartyPopper, ShoppingBag, Scissors, Users, ChevronRight, AlertTriangle, Menu, X } from "lucide-react";
import { AvatarSvg, avatarIdFor } from "../../avatars.jsx";
import { setBrandTab } from "../../favicon.js";
import { ESTENSIONI } from "../../cliente/index.jsx";

// ============================================================================
// Il SITO del salone, servito sulla radice del suo dominio (installazioni
// cliente). I contenuti arrivano da GET /api/sito: brand, presentazione,
// sezioni personalizzate, servizi, operatori, eventi, catalogo, orari e
// contatti — tutto ciò che il salone cura dal gestionale (Impostazioni →
// Sito e prenotazioni). Le personalizzazioni di codice entrano da
// ESTENSIONI.sito (src/cliente/index.jsx): home sostitutiva, sezioni in più,
// pagine in più.
// ============================================================================

const pad2 = (n) => String(n).padStart(2, "0");
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const GIORNI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const fmtData = (s) => { const [y, m, d] = String(s).split("-").map(Number); const dt = new Date(y, m - 1, d); return `${GIORNI[dt.getDay()]} ${dt.getDate()} ${MESI[dt.getMonth()]}`; };
const hhmm = (m) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
const eur = (n) => "€ " + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",").replace(",00", "");

function Sezione({ id, kicker, titolo, testo, children, primary, alt }) {
  return (
    <section id={id} className={`scroll-mt-20 ${alt ? "bg-stone-50 border-y border-stone-100" : ""}`}>
      <div className="max-w-5xl mx-auto px-5 py-14 sm:py-16">
        {(kicker || titolo) ? (
          <div className="mb-8">
            {kicker ? <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: primary }}>{kicker}</div> : null}
            {titolo ? <h2 className="font-display text-3xl sm:text-4xl font-semibold text-stone-900">{titolo}</h2> : null}
            {testo ? <p className="mt-3 text-stone-500 max-w-2xl">{testo}</p> : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export default function SitoSalone({ inst, path, vai }) {
  const [dati, setDati] = useState(null);
  const [stato, setStato] = useState("loading");
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/sito");
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) { setStato("errore"); return; }
        setDati(j); setStato("ok");
        setBrandTab(j.salone.logo, j.salone.tagline ? `${j.salone.brandName} · ${j.salone.tagline}` : j.salone.brandName);
      } catch (e) { setStato("errore"); }
    })();
  }, []);

  const brand = (dati && dati.salone) || (inst && inst.salone) || {};
  const primary = (ESTENSIONI.tema && ESTENSIONI.tema.primary) || brand.primary || "#b8893b";

  if (stato === "loading") return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><div className="lc-spinner" /></div>;
  if (stato === "errore") return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="lc-card p-8 text-center max-w-sm">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3"><AlertTriangle size={22} /></div>
        <h2 className="font-display text-xl font-semibold text-stone-900">Sito momentaneamente non disponibile</h2>
        <p className="text-sm text-stone-500 mt-2">Riprova tra qualche minuto.</p>
      </div>
    </div>
  );

  const sito = dati.sito || {};
  const eventi = Array.isArray(dati.eventi) ? dati.eventi : [];
  const catalogo = dati.catalogo && Array.isArray(dati.catalogo.prodotti) && dati.catalogo.prodotti.length ? dati.catalogo : null;
  const listino = Array.isArray(dati.listino) ? dati.listino : [];
  const staff = Array.isArray(dati.staff) ? dati.staff : [];
  const prenota = !!dati.prenotazioniOnline;
  const pagineExtra = (ESTENSIONI.sito && Array.isArray(ESTENSIONI.sito.pagine) ? ESTENSIONI.sito.pagine : []).filter((p) => p && p.path && p.componente);
  const wa = brand.phone ? "39" + String(brand.phone).replace(/\D/g, "") : "";

  const NAV = [
    ["/#servizi", "Servizi", listino.length > 0],
    ["/#team", "Il team", staff.length > 0],
    ["/#eventi", "Eventi", eventi.length > 0],
    ["/#prodotti", "Prodotti", !!catalogo],
    ...pagineExtra.map((p) => [p.path, p.label || p.path, true]),
    ["/#contatti", "Contatti", true],
  ].filter((n) => n[2]);

  const paginaExtra = pagineExtra.find((p) => p.path === path);
  const Home = ESTENSIONI.sito && ESTENSIONI.sito.Home;
  const sezioniExtra = ESTENSIONI.sito && Array.isArray(ESTENSIONI.sito.sezioni) ? ESTENSIONI.sito.sezioni : [];

  const Link = ({ to, className = "", children, ...rest }) => <a href={to} onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); setMenu(false); vai(to); }} className={className} {...rest}>{children}</a>;

  return (
    <div className="min-h-screen bg-white text-stone-800" style={{ "--brand": primary }}>
      {/* Intestazione */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            {brand.logo ? <img src={brand.logo} alt={brand.brandName} className="h-9 w-9 rounded-xl object-cover ring-1 ring-stone-200" /> : <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white" style={{ background: primary }}><Sparkles size={18} /></div>}
            <span className="font-display text-lg font-semibold text-stone-900 truncate">{brand.brandName}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-5">
            {NAV.map(([to, label]) => <Link key={to} to={to} className="text-sm text-stone-500 hover:text-stone-900">{label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            {prenota ? <Link to="/prenota" className="text-sm font-semibold text-white px-4 py-2 rounded-xl inline-flex items-center gap-1.5 lc-shine" style={{ background: primary }}><Calendar size={15} /> Prenota</Link> : (brand.phone ? <a href={`tel:+${wa}`} className="text-sm font-semibold text-white px-4 py-2 rounded-xl inline-flex items-center gap-1.5" style={{ background: primary }}><Phone size={15} /> Chiama</a> : null)}
            <button onClick={() => setMenu((m) => !m)} className="md:hidden p-2 text-stone-500" aria-label="Menu">{menu ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {menu ? <nav className="md:hidden border-t border-stone-100 px-5 py-3 flex flex-col gap-2 bg-white">{NAV.map(([to, label]) => <Link key={to} to={to} className="text-sm text-stone-600 py-1.5">{label}</Link>)}</nav> : null}
      </header>

      <main>
        {paginaExtra ? <paginaExtra.componente dati={dati} vai={vai} /> : Home ? <Home dati={dati} vai={vai} /> : (
          <>
            {/* Copertina */}
            <section className="relative overflow-hidden">
              {sito.copertina ? (
                <div className="relative h-[420px] sm:h-[520px]">
                  <img src={sito.copertina} alt={brand.brandName} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(28,25,23,0.78) 0%, rgba(28,25,23,0.25) 55%, rgba(28,25,23,0.1) 100%)" }} />
                  <div className="relative max-w-5xl mx-auto px-5 h-full flex flex-col justify-end pb-12 text-white">
                    {brand.tagline ? <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-3 opacity-90">{brand.tagline}</div> : null}
                    <h1 className="font-display text-4xl sm:text-6xl font-semibold leading-[1.05] max-w-3xl">{brand.brandName}</h1>
                    {sito.descrizione ? <p className="mt-4 text-white/85 max-w-2xl text-base sm:text-lg leading-relaxed">{sito.descrizione}</p> : null}
                    <div className="mt-7 flex items-center gap-3 flex-wrap">
                      {prenota ? <Link to="/prenota" className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 text-white lc-shine" style={{ background: primary }}><Calendar size={17} /> Prenota online</Link> : null}
                      {listino.length ? <Link to="/#servizi" className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/30 hover:bg-white/25 transition">I servizi <ArrowRight size={17} /></Link> : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative" style={{ background: `radial-gradient(70% 80% at 50% 0%, ${primary}22 0%, #ffffff 70%)` }}>
                  <div className="max-w-5xl mx-auto px-5 pt-20 pb-16 text-center">
                    {brand.logo ? <img src={brand.logo} alt={brand.brandName} className="h-24 w-24 rounded-3xl object-cover mx-auto mb-6 shadow-md ring-4 ring-white lc-pop-in" /> : null}
                    {brand.tagline ? <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: primary }}>{brand.tagline}</div> : null}
                    <h1 className="font-display text-4xl sm:text-6xl font-semibold leading-[1.05] text-stone-900">{brand.brandName}</h1>
                    {sito.descrizione ? <p className="mt-5 text-stone-500 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">{sito.descrizione}</p> : null}
                    <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
                      {prenota ? <Link to="/prenota" className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 text-white lc-shine" style={{ background: primary }}><Calendar size={17} /> Prenota online</Link> : null}
                      {brand.phone ? <a href={`tel:+${wa}`} className="font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 border border-stone-300 text-stone-800 hover:bg-stone-50"><Phone size={17} /> {brand.phone}</a> : null}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Sezioni personalizzate (Chi siamo, Promozioni…) */}
            {(sito.sezioni || []).length ? (
              <Sezione primary={primary}>
                <div className={`grid gap-6 ${sito.sezioni.length > 1 ? "md:grid-cols-2" : ""}`}>
                  {sito.sezioni.map((s, i) => (
                    <div key={i} className="lc-card p-6">
                      {s.titolo ? <h3 className="font-display text-2xl font-semibold text-stone-900 mb-2">{s.titolo}</h3> : null}
                      {s.testo ? <p className="text-stone-600 leading-relaxed whitespace-pre-line">{s.testo}</p> : null}
                    </div>
                  ))}
                </div>
              </Sezione>
            ) : null}

            {/* Servizi */}
            {listino.length ? (
              <Sezione id="servizi" kicker="Servizi" titolo="Il nostro listino" primary={primary} alt>
                <div className="grid sm:grid-cols-2 gap-3">
                  {listino.map((s) => (
                    <div key={s.id} className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${primary}1a`, color: primary }}><Scissors size={18} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-stone-900 truncate">{s.name}</div>
                        {s.durationMin ? <div className="text-xs text-stone-400 inline-flex items-center gap-1"><Clock size={11} /> {s.durationMin} min</div> : null}
                      </div>
                      {s.price != null ? <div className="font-semibold text-stone-900 tabular-nums">{eur(s.price)}</div> : null}
                    </div>
                  ))}
                </div>
                {prenota ? <div className="mt-8 text-center"><Link to="/prenota" className="font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all" style={{ color: primary }}>Prenota il tuo appuntamento <ArrowRight size={17} /></Link></div> : null}
              </Sezione>
            ) : null}

            {/* Team */}
            {staff.length ? (
              <Sezione id="team" kicker="Il team" titolo="Chi si prende cura di te" primary={primary}>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {staff.map((st) => (
                    <div key={st.id} className="lc-card p-5 text-center">
                      <div className="flex justify-center mb-3"><AvatarSvg id={avatarIdFor(st)} photo={st.photo} size={88} /></div>
                      <div className="font-semibold text-stone-900">{st.name}</div>
                      {st.role ? <div className="text-xs text-stone-400 mt-0.5">{st.role}</div> : null}
                    </div>
                  ))}
                </div>
              </Sezione>
            ) : null}

            {/* Eventi */}
            {eventi.length ? (
              <Sezione id="eventi" kicker="Eventi" titolo="Prossimi appuntamenti speciali" primary={primary} alt>
                <div className="grid md:grid-cols-2 gap-4">
                  {eventi.map((ev) => (
                    <a key={ev.id} href={`/evento/${encodeURIComponent(ev.id)}`} onClick={(e) => { e.preventDefault(); vai(`/evento/${encodeURIComponent(ev.id)}`); }} className="bg-white rounded-2xl border border-stone-200 overflow-hidden lc-lift block">
                      {ev.copertina ? <img src={ev.copertina} alt={ev.titolo} className="w-full h-44 object-cover" /> : null}
                      <div className="p-5">
                        <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full text-white mb-2" style={{ background: primary }}><PartyPopper size={11} /> Evento</div>
                        <div className="font-display text-xl font-semibold text-stone-900 leading-tight">{ev.titolo}</div>
                        <div className="text-sm text-stone-500 mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span className="inline-flex items-center gap-1"><Calendar size={13} className="text-stone-400" /> {fmtData(ev.date)}</span>
                          <span className="inline-flex items-center gap-1 tabular-nums"><Clock size={13} className="text-stone-400" /> {hhmm(ev.startMin)}–{hhmm(ev.endMin)}</span>
                        </div>
                        {ev.descrizione ? <p className="text-sm text-stone-500 mt-2 leading-relaxed" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ev.descrizione}</p> : null}
                        <div className="mt-3 text-sm font-medium inline-flex items-center gap-1" style={{ color: primary }}>Scopri l'evento <ChevronRight size={14} /></div>
                      </div>
                    </a>
                  ))}
                </div>
              </Sezione>
            ) : null}

            {/* Prodotti */}
            {catalogo ? (
              <Sezione id="prodotti" kicker="Prodotti" titolo="In vendita in salone" testo="Chiedi in salone o scrivici per metterli da parte." primary={primary}>
                {[...(catalogo.categorie || []), { id: null, name: "Altro" }].map((c) => ({ ...c, items: (catalogo.prodotti || []).filter((p) => (p.categoryId || null) === c.id) })).filter((g) => g.items.length).map((g) => (
                  <div key={g.id || "altro"} className="mb-8 last:mb-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: primary }}>{g.name}</div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {g.items.map((p) => (
                        <div key={p.id} className="lc-card p-4 flex gap-3.5">
                          {p.foto ? <img src={p.foto} alt={p.name} className="w-20 h-20 rounded-xl object-cover ring-1 ring-stone-100 shrink-0" /> : <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${primary}14`, color: primary }}><ShoppingBag size={22} /></div>}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-stone-900">{p.name}</div>
                            {p.description ? <div className="text-sm text-stone-500 mt-0.5 leading-relaxed">{p.description}</div> : null}
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(p.formats || []).map((f, i) => <span key={i} className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1 ${f.disponibile ? "border-stone-200 text-stone-600 bg-stone-50" : "border-stone-100 text-stone-300"}`}>{f.label}{f.price != null ? <b className={f.disponibile ? "text-stone-800" : "text-stone-300"}>{eur(f.price)}</b> : null}</span>)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </Sezione>
            ) : null}

            {sezioniExtra.map((C, i) => <C key={i} dati={dati} />)}

            {/* Orari e contatti */}
            <Sezione id="contatti" kicker="Contatti" titolo="Vieni a trovarci" primary={primary} alt>
              <div className="grid md:grid-cols-2 gap-6">
                {sito.orari ? (
                  <div className="bg-white rounded-2xl border border-stone-200 p-6">
                    <h3 className="font-semibold text-stone-900 mb-3 flex items-center gap-2"><Clock size={16} style={{ color: primary }} /> Orari</h3>
                    <p className="text-stone-600 leading-relaxed whitespace-pre-line">{sito.orari}</p>
                  </div>
                ) : null}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-2">
                  <h3 className="font-semibold text-stone-900 mb-3 flex items-center gap-2"><Phone size={16} style={{ color: primary }} /> Contatti</h3>
                  {brand.phone ? <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 border border-stone-200 rounded-xl p-3 hover:bg-stone-50 transition"><MessageCircle size={17} className="text-green-600 shrink-0" /><span className="text-sm"><b>WhatsApp</b> · scrivici subito</span></a> : null}
                  {brand.phone ? <a href={`tel:+${wa}`} className="flex items-center gap-3 border border-stone-200 rounded-xl p-3 hover:bg-stone-50 transition"><Phone size={17} className="text-stone-500 shrink-0" /><span className="text-sm"><b>Telefono</b> · {brand.phone}</span></a> : null}
                  {brand.email ? <a href={`mailto:${brand.email}`} className="flex items-center gap-3 border border-stone-200 rounded-xl p-3 hover:bg-stone-50 transition"><Mail size={17} className="text-stone-500 shrink-0" /><span className="text-sm break-all"><b>Email</b> · {brand.email}</span></a> : null}
                  {brand.address ? <a href={`https://maps.google.com/?q=${encodeURIComponent(brand.address)}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 border border-stone-200 rounded-xl p-3 hover:bg-stone-50 transition"><MapPin size={17} className="text-stone-500 shrink-0" /><span className="text-sm"><b>Dove siamo</b> · {brand.address}</span></a> : null}
                  {[sito.instagram ? [Instagram, "Instagram", sito.instagram.startsWith("http") ? sito.instagram : `https://instagram.com/${sito.instagram.replace(/^@/, "")}`] : null,
                    sito.facebook ? [Facebook, "Facebook", sito.facebook.startsWith("http") ? sito.facebook : `https://facebook.com/${sito.facebook}`] : null,
                    sito.sitoWeb ? [Globe, "Sito web", sito.sitoWeb.startsWith("http") ? sito.sitoWeb : `https://${sito.sitoWeb}`] : null].filter(Boolean).map(([Icon, label, href], i) => (
                    <a key={i} href={href} target="_blank" rel="noreferrer" className="flex items-center gap-3 border border-stone-200 rounded-xl p-3 hover:bg-stone-50 transition"><Icon size={17} className="text-stone-500 shrink-0" /><span className="text-sm"><b>{label}</b></span></a>
                  ))}
                  {!brand.phone && !brand.email && !brand.address ? <p className="text-sm text-stone-400">Contatti in arrivo.</p> : null}
                </div>
              </div>
            </Sezione>
          </>
        )}
      </main>

      <footer className="border-t border-stone-100">
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400">
          <div className="flex items-center gap-2">{brand.logo ? <img src={brand.logo} alt="" className="h-6 w-6 rounded-md object-cover" /> : <Users size={14} />} <span>© {new Date().getFullYear()} {brand.brandName}</span></div>
          <div className="flex items-center gap-4">
            {prenota ? <Link to="/prenota" className="hover:text-stone-600">Prenota</Link> : null}
            <a href="/gestionale" className="hover:text-stone-600">Area riservata</a>
            <a href="https://lucentia-app.com" target="_blank" rel="noreferrer" className="hover:text-stone-600">Realizzato con Lucentia</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
