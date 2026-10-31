import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, Phone, Mail, MapPin, MessageCircle, Instagram, Facebook, Globe, Sparkles, ArrowRight, PartyPopper, ShoppingBag, Users, ChevronRight, AlertTriangle, Menu, X, Flower2, Leaf, Heart, Scissors, ShieldCheck, Star } from "lucide-react";
import { AvatarSvg, avatarIdFor } from "../../avatars.jsx";
import { setBrandTab } from "../../favicon.js";
import { ESTENSIONI } from "../../cliente/index.jsx";
import { PAGINE_SITO, metaPagina, testoPrivacy, testoCookie, testoNoteLegali, gruppiServizi } from "./contenuti.js";

// ============================================================================
// Il SITO del salone, servito sulla radice del suo dominio (installazioni
// cliente). È un sito a pagine: Home, Servizi, Team, Eventi, Prodotti,
// Contatti, più Privacy, Cookie e Note legali. I contenuti arrivano da
// GET /api/sito e si curano dal gestionale (Impostazioni → Sito e
// prenotazioni). Le personalizzazioni di codice entrano da ESTENSIONI.sito e
// ESTENSIONI.tema (src/cliente/index.jsx). I metadati per i motori di
// ricerca sono gli stessi che il server inietta nell'HTML (server/cliente/seo.js):
// qui si aggiornano solo navigando da una pagina all'altra.
// ============================================================================

const pad2 = (n) => String(n).padStart(2, "0");
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const GIORNI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const fmtData = (s) => { const [y, m, d] = String(s).split("-").map(Number); const dt = new Date(y, m - 1, d); return `${GIORNI[dt.getDay()]} ${dt.getDate()} ${MESI[dt.getMonth()]}`; };
const hhmm = (m) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
const eur = (n) => "€ " + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",").replace(",00", "");
const ICONE_CATEGORIA = [Flower2, Heart, Leaf, Sparkles, Star, Scissors];

// Un colore esadecimale con trasparenza (per sfondi tenui).
const tinta = (hex, a) => (/^#[0-9a-f]{6}$/i.test(hex || "") ? hex + Math.round(a * 255).toString(16).padStart(2, "0") : hex);

function Eyebrow({ children }) { return <div className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: "var(--accento)" }}>{children}</div>; }
function Titolo({ children, className = "" }) { return <h2 className={`font-display text-3xl sm:text-[2.6rem] sm:leading-[1.15] font-semibold text-stone-900 ${className}`}>{children}</h2>; }
function Bottone({ to, onClick, children, tono = "pieno", className = "", Link, ...rest }) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold text-sm px-6 py-3 rounded-full transition hover:-translate-y-0.5 ";
  const stile = tono === "pieno" ? { background: "var(--brand)", color: "#fff", boxShadow: "0 10px 24px -12px var(--brand)" } : tono === "chiaro" ? { background: "#fff", color: "var(--brand)", border: "1px solid rgba(0,0,0,0.08)" } : { background: "transparent", color: "var(--brand)", border: "1px solid var(--brand)" };
  if (to && Link) return <Link to={to} className={base + className} style={stile} {...rest}>{children}</Link>;
  if (to) return <a href={to} className={base + className} style={stile} {...rest}>{children}</a>;
  return <button type="button" onClick={onClick} className={base + className} style={stile} {...rest}>{children}</button>;
}
// Card dal profilo "a cartellina" come nel riferimento: angolo in alto a
// sinistra più stretto, sfondo pastello.
function CardMorbida({ children, sfondo, className = "", ...rest }) {
  return <div className={`relative rounded-[1.75rem] rounded-tl-lg p-6 ${className}`} style={{ background: sfondo }} {...rest}>{children}</div>;
}
function Sezione({ id, children, className = "", sfondo }) {
  return (
    <section id={id} className={`scroll-mt-24 ${className}`} style={sfondo ? { background: sfondo } : undefined}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">{children}</div>
    </section>
  );
}
function Intestazione({ eyebrow, titolo, testo, centro }) {
  return (
    <div className={`mb-10 sm:mb-14 ${centro ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}`}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Titolo>{titolo}</Titolo>
      {testo ? <p className="mt-4 text-stone-500 leading-relaxed">{testo}</p> : null}
    </div>
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
      } catch (e) { setStato("errore"); }
    })();
  }, []);

  const brand = (dati && dati.salone) || (inst && inst.salone) || {};
  const tema = ESTENSIONI.tema || {};
  const primary = tema.primary || brand.primary || "#b8893b";
  const accento = tema.accento || primary;
  const secondario = tema.secondario || accento;
  const crema = tema.sfondoAlternato || "#faf7f2";
  const fontTitoli = tema.fontTitoli || null;
  const fontTesto = tema.fontTesto || null;
  // I font passano da fonts.bunny.net, che non registra gli indirizzi dei
  // visitatori: niente trasferimento di dati verso Google.
  const fontUrl = useMemo(() => {
    const fam = [fontTitoli, fontTesto].filter(Boolean).filter((f, i, a) => a.indexOf(f) === i);
    return fam.length ? `https://fonts.bunny.net/css?family=${fam.map((f) => f.toLowerCase().replace(/\s+/g, "-") + ":400,500,600,700").join("|")}&display=swap` : null;
  }, [fontTitoli, fontTesto]);

  const sito = (dati && dati.sito) || {};
  const pagina = useMemo(() => {
    const p = String(path || "/").replace(/\/+$/, "") || "/";
    return PAGINE_SITO.find((x) => x.path === p) ? p : (p.startsWith("/evento/") ? "/eventi" : "/");
  }, [path]);

  // Titolo della scheda e descrizione cambiano con la pagina (il server li ha
  // già messi nell'HTML iniziale: questo serve navigando senza ricaricare).
  useEffect(() => {
    if (!dati) return;
    const m = metaPagina(pagina, { brand, sito, listino: dati.listino || [] });
    setBrandTab(sito.favicon || brand.logo, m.title);
    const d = document.head.querySelector('meta[name="description"]'); if (d) d.setAttribute("content", m.description);
  }, [pagina, dati]);

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

  const eventi = Array.isArray(dati.eventi) ? dati.eventi : [];
  const catalogo = dati.catalogo && Array.isArray(dati.catalogo.prodotti) && dati.catalogo.prodotti.length ? dati.catalogo : null;
  const listino = Array.isArray(dati.listino) ? dati.listino : [];
  const staff = Array.isArray(dati.staff) ? dati.staff : [];
  const prenota = !!dati.prenotazioniOnline;
  const legale = sito.legale || {};
  const pagineExtra = (ESTENSIONI.sito && Array.isArray(ESTENSIONI.sito.pagine) ? ESTENSIONI.sito.pagine : []).filter((p) => p && p.path && p.componente);
  const wa = brand.phone ? "39" + String(brand.phone).replace(/\D/g, "") : "";
  const gruppi = gruppiServizi(listino);
  const pastelli = [tinta(secondario, 0.28), crema, tinta(accento, 0.22)];

  const NAV = [
    ["/", "Home", true],
    ["/servizi", "Servizi", listino.length > 0],
    ["/team", "Il team", staff.length > 0],
    ["/eventi", "Eventi", eventi.length > 0],
    ["/prodotti", "Prodotti", !!catalogo],
    ...pagineExtra.map((p) => [p.path, p.label || p.path, true]),
    ["/contatti", "Contatti", true],
  ].filter((n) => n[2]);

  const Link = ({ to, className = "", children, ...rest }) => <a href={to} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.button !== 0) return; e.preventDefault(); setMenu(false); vai(to); }} className={className} {...rest}>{children}</a>;
  const Prenota = ({ className = "", servizio }) => (prenota ? <Bottone Link={Link} to={servizio ? `/prenota?servizio=${encodeURIComponent(servizio)}` : "/prenota"} className={className}><Calendar size={16} /> Prenota ora</Bottone> : (brand.phone ? <Bottone to={`tel:+${wa}`} className={className}><Phone size={16} /> Chiamaci</Bottone> : null));

  const paginaExtra = pagineExtra.find((p) => p.path === pagina) || pagineExtra.find((p) => p.path === path);
  const HomeCliente = ESTENSIONI.sito && ESTENSIONI.sito.Home;
  const sezioniExtra = ESTENSIONI.sito && Array.isArray(ESTENSIONI.sito.sezioni) ? ESTENSIONI.sito.sezioni : [];
  const comuni = { brand, sito, listino, gruppi, staff, eventi, catalogo, prenota, wa, Link, Prenota, pastelli, legale, vai, dati };

  return (
    <div className="min-h-screen bg-white text-stone-800 lc-sito" lang="it" style={{ "--brand": primary, "--accento": accento, "--secondario": secondario, "--crema": crema, ...(fontTesto ? { fontFamily: `'${fontTesto}', 'Hanken Grotesk', system-ui, sans-serif` } : {}) }}>
      {fontUrl ? <link rel="stylesheet" href={fontUrl} /> : null}
      <style>{`${fontTitoli ? `.lc-sito .font-display{font-family:'${fontTitoli}','Playfair Display',Georgia,serif}` : ""} .lc-sito a:focus-visible,.lc-sito button:focus-visible{outline:2px solid var(--brand);outline-offset:3px}`}</style>
      <a href="#contenuto" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow">Vai al contenuto</a>

      {/* Intestazione */}
      <header className="sticky top-0 z-30 backdrop-blur border-b border-stone-100/80" style={{ background: "rgba(255,255,255,0.85)" }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5 min-w-0" aria-label={`${brand.brandName} — home`}>
            {sito.logoEsteso ? <img src={sito.logoEsteso} alt={brand.brandName} width="260" height="64" className="h-14 sm:h-16 w-auto max-w-[260px] object-contain" /> : <>
              {brand.logo ? <img src={brand.logo} alt="" width="36" height="36" className="h-9 w-9 rounded-xl object-cover" /> : <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white" style={{ background: primary }}><Sparkles size={18} /></div>}
              <span className="font-display text-lg font-semibold text-stone-900 truncate">{brand.brandName}</span>
            </>}
          </Link>
          <nav className="hidden md:flex items-center gap-7" aria-label="Principale">
            {NAV.map(([to, label]) => <Link key={to} to={to} aria-current={pagina === to ? "page" : undefined} className={`text-sm transition ${pagina === to ? "font-semibold text-stone-900" : "text-stone-500 hover:text-stone-900"}`}>{label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block"><Prenota className="!py-2.5 !px-5" /></div>
            <button onClick={() => setMenu((m) => !m)} className="md:hidden p-2 text-stone-600" aria-label={menu ? "Chiudi il menu" : "Apri il menu"} aria-expanded={menu}>{menu ? <X size={22} /> : <Menu size={22} />}</button>
          </div>
        </div>
        {menu ? (
          <nav className="md:hidden border-t border-stone-100 px-5 py-4 flex flex-col gap-3 bg-white" aria-label="Principale">
            {NAV.map(([to, label]) => <Link key={to} to={to} className={`text-base py-1 ${pagina === to ? "font-semibold text-stone-900" : "text-stone-600"}`}>{label}</Link>)}
            <div className="pt-2"><Prenota className="w-full" /></div>
          </nav>
        ) : null}
      </header>

      <main id="contenuto">
        {paginaExtra ? <paginaExtra.componente dati={dati} vai={vai} /> :
          pagina === "/servizi" ? <PaginaServizi {...comuni} /> :
          pagina === "/team" ? <PaginaTeam {...comuni} /> :
          pagina === "/eventi" ? <PaginaEventi {...comuni} /> :
          pagina === "/prodotti" ? <PaginaProdotti {...comuni} /> :
          pagina === "/contatti" ? <PaginaContatti {...comuni} /> :
          pagina === "/privacy" ? <PaginaLegale titolo="Informativa sulla privacy" testo={testoPrivacy(brand, legale, { prenota })} /> :
          pagina === "/cookie" ? <PaginaLegale titolo="Cookie" testo={testoCookie(brand, legale)} /> :
          pagina === "/note-legali" ? <PaginaLegale titolo="Note legali" testo={testoNoteLegali(brand, legale)} /> :
          HomeCliente ? <HomeCliente dati={dati} vai={vai} /> : <PaginaHome {...comuni} sezioniExtra={sezioniExtra} />}
      </main>

      <PiePagina {...comuni} NAV={NAV} />
    </div>
  );
}

// ---- Home ------------------------------------------------------------------
function PaginaHome({ brand, sito, listino, gruppi, staff, eventi, prenota, wa, Link, Prenota, pastelli, sezioniExtra, dati }) {
  const sezioni = Array.isArray(sito.sezioni) ? sito.sezioni : [];
  const prima = sezioni[0]; const altre = sezioni.slice(1);
  const conCategorie = gruppi.length > 1 || (gruppi[0] && gruppi[0].nome);
  const daPrezzo = (items) => { const p = items.map((s) => s.price).filter((x) => x != null); return p.length ? Math.min(...p) : null; };
  return (
    <>
      {/* Copertina: testo a sinistra, immagine a destra, su un fondo pastello sfumato */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(120deg, var(--crema) 0%, ${tinta(sito.coloreCopertina || "", 0) || "transparent"} 0%, color-mix(in srgb, var(--secondario) 28%, white) 55%, color-mix(in srgb, var(--accento) 26%, white) 100%)` }}>
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-24 w-[32rem] h-[32rem] rounded-full opacity-60 blur-3xl" style={{ background: "color-mix(in srgb, var(--secondario) 45%, white)" }} />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-20 w-[28rem] h-[28rem] rounded-full opacity-60 blur-3xl" style={{ background: "color-mix(in srgb, var(--accento) 40%, white)" }} />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-14 pb-16 sm:pt-20 sm:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          <div className="lc-fade-up">
            {brand.tagline ? <Eyebrow>{brand.tagline}</Eyebrow> : null}
            <h1 className="font-display text-[2.6rem] leading-[1.08] sm:text-6xl sm:leading-[1.05] font-semibold text-stone-900">{sito.titoloHome || <>Il tuo momento<br />di bellezza,<br /><span style={{ color: "var(--brand)" }}>ogni giorno.</span></>}</h1>
            {sito.descrizione ? <p className="mt-6 text-stone-600 text-base sm:text-lg leading-relaxed max-w-xl">{sito.descrizione}</p> : null}
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <Prenota />
              {listino.length ? <Bottone Link={Link} to="/servizi" tono="chiaro">Scopri i servizi <ArrowRight size={16} /></Bottone> : null}
            </div>
            <div className="mt-9 flex items-center gap-6 text-xs text-stone-500 flex-wrap">
              {prenota ? <span className="inline-flex items-center gap-1.5"><Calendar size={14} style={{ color: "var(--accento)" }} /> Prenotazione online 24/7</span> : null}
              {staff.length ? <span className="inline-flex items-center gap-1.5"><Users size={14} style={{ color: "var(--accento)" }} /> {staff.length} professionist{staff.length === 1 ? "a" : "i"}</span> : null}
              {listino.length ? <span className="inline-flex items-center gap-1.5"><Sparkles size={14} style={{ color: "var(--accento)" }} /> {listino.length} trattamenti</span> : null}
            </div>
          </div>
          <div className="relative lc-fade-in">
            {sito.copertina ? (
              <div className="relative">
                <img src={sito.copertina} alt={`${brand.brandName}: il nostro salone`} width="900" height="1000" fetchPriority="high" className="w-full max-h-[560px] object-cover rounded-[2.5rem] rounded-tl-[6rem] shadow-2xl" />
                {brand.logo ? <img src={brand.logo} alt="" width="72" height="72" className="absolute -bottom-5 left-8 h-[72px] w-[72px] rounded-2xl object-cover ring-4 ring-white shadow-lg" /> : null}
              </div>
            ) : (
              <div className="relative flex items-center justify-center min-h-[340px] sm:min-h-[460px]">
                <div aria-hidden="true" className="absolute inset-6 rounded-[3rem] rounded-tl-[7rem]" style={{ background: "rgba(255,255,255,0.55)", boxShadow: "0 40px 80px -40px rgba(0,0,0,0.25)" }} />
                {sito.logoEsteso ? <img src={sito.logoEsteso} alt={brand.brandName} width="640" height="440" fetchPriority="high" className="relative w-[78%] max-w-[560px] h-auto object-contain drop-shadow-sm" /> : brand.logo ? <img src={brand.logo} alt={brand.brandName} width="260" height="260" className="relative h-52 w-52 rounded-[2.5rem] object-cover shadow-xl ring-8 ring-white" /> : <Sparkles size={120} className="relative" style={{ color: "var(--brand)" }} />}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Categorie di servizi */}
      {listino.length ? (
        <Sezione id="servizi">
          <Intestazione centro eyebrow="I nostri servizi" titolo="Prenditi cura di te" testo={conCategorie ? "Scegli l'area che ti interessa: ogni trattamento ha durata e prezzo chiari, e si prenota in pochi tocchi." : "Durata e prezzo di ogni trattamento sono chiari, e si prenota in pochi tocchi."} />
          {conCategorie ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {gruppi.map((g, i) => { const Icona = ICONE_CATEGORIA[i % ICONE_CATEGORIA.length]; const da = daPrezzo(g.items); return (
                <Link key={g.nome} to={`/servizi#${slug(g.nome)}`} className="group block">
                  <CardMorbida sfondo={pastelli[i % pastelli.length]} className="h-full min-h-[200px] flex flex-col transition-transform duration-300 group-hover:-translate-y-1">
                    <div className="w-11 h-11 rounded-2xl bg-white/80 flex items-center justify-center mb-5" style={{ color: "var(--brand)" }}><Icona size={20} /></div>
                    <h3 className="font-display text-2xl font-semibold text-stone-900 leading-tight">{g.nome}</h3>
                    <p className="text-sm text-stone-600 mt-2 flex-1">{g.items.length} trattament{g.items.length === 1 ? "o" : "i"}{da != null ? ` · da ${eur(da)}` : ""}</p>
                    <div className="mt-4 text-sm font-semibold inline-flex items-center gap-1" style={{ color: "var(--brand)" }}>Vedi tutti <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" /></div>
                  </CardMorbida>
                </Link>
              ); })}
            </div>
          ) : (
            <ListaServizi items={listino} Link={Link} prenota={prenota} />
          )}
          <div className="mt-10 text-center"><Bottone Link={Link} to="/servizi" tono="bordo">Tutto il listino <ArrowRight size={16} /></Bottone></div>
        </Sezione>
      ) : null}

      {/* Chi siamo: testo a destra, immagine a sinistra */}
      {prima ? (
        <Sezione sfondo="var(--crema)">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 lg:order-1">
              {sito.fotoChiSiamo || sito.copertina ? <img src={sito.fotoChiSiamo || sito.copertina} alt={prima.titolo || brand.brandName} loading="lazy" width="800" height="700" className="w-full max-h-[480px] object-cover rounded-[2.5rem] rounded-br-[6rem] shadow-xl" /> : (
                <div className="rounded-[2.5rem] rounded-br-[6rem] p-10 flex items-center justify-center min-h-[280px]" style={{ background: "color-mix(in srgb, var(--secondario) 30%, white)" }}>
                  {sito.logoEsteso ? <img src={sito.logoEsteso} alt="" loading="lazy" width="480" height="330" className="w-3/4 h-auto object-contain opacity-90" /> : <Flower2 size={96} style={{ color: "var(--brand)" }} />}
                </div>
              )}
            </div>
            <div className="order-1 lg:order-2">
              <Eyebrow>{brand.brandName}</Eyebrow>
              <Titolo>{prima.titolo || "Chi siamo"}</Titolo>
              <p className="mt-5 text-stone-600 leading-relaxed whitespace-pre-line">{prima.testo}</p>
              <div className="mt-8 flex gap-3 flex-wrap">{staff.length ? <Bottone Link={Link} to="/team" tono="chiaro"><Users size={16} /> Conosci il team</Bottone> : null}<Bottone Link={Link} to="/contatti" tono="bordo">Dove siamo <ArrowRight size={16} /></Bottone></div>
            </div>
          </div>
        </Sezione>
      ) : null}

      {/* Altre sezioni personalizzate */}
      {altre.length ? (
        <Sezione>
          <div className={`grid gap-6 ${altre.length > 1 ? "md:grid-cols-2" : "max-w-3xl"}`}>
            {altre.map((s, i) => (
              <CardMorbida key={i} sfondo={pastelli[(i + 1) % pastelli.length]} className="p-8">
                {s.titolo ? <h3 className="font-display text-2xl font-semibold text-stone-900 mb-3">{s.titolo}</h3> : null}
                {s.testo ? <p className="text-stone-700 leading-relaxed whitespace-pre-line">{s.testo}</p> : null}
              </CardMorbida>
            ))}
          </div>
        </Sezione>
      ) : null}

      {/* Team in breve */}
      {staff.length ? (
        <Sezione id="team" sfondo={altre.length ? "var(--crema)" : undefined}>
          <Intestazione centro eyebrow="Il team" titolo="Chi si prende cura di te" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {staff.slice(0, 4).map((st, i) => (
              <Link key={st.id} to="/team" className="block">
                <CardMorbida sfondo={pastelli[i % pastelli.length]} className="text-center h-full transition-transform duration-300 hover:-translate-y-1">
                  <div className="flex justify-center mb-4"><AvatarSvg id={avatarIdFor(st)} photo={st.photo} size={96} /></div>
                  <div className="font-semibold text-stone-900">{st.name}</div>
                  {st.role ? <div className="text-xs text-stone-600 mt-1 leading-snug">{st.role}</div> : null}
                </CardMorbida>
              </Link>
            ))}
          </div>
        </Sezione>
      ) : null}

      {/* Eventi in breve */}
      {eventi.length ? (
        <Sezione id="eventi">
          <Intestazione eyebrow="Eventi" titolo="Prossimi appuntamenti speciali" />
          <div className="grid md:grid-cols-2 gap-5">{eventi.slice(0, 2).map((ev, i) => <CardEvento key={ev.id} ev={ev} sfondo={pastelli[i % pastelli.length]} vai={(to) => Link && undefined} Link={Link} />)}</div>
          {eventi.length > 2 ? <div className="mt-8 text-center"><Bottone Link={Link} to="/eventi" tono="bordo">Tutti gli eventi <ArrowRight size={16} /></Bottone></div> : null}
        </Sezione>
      ) : null}

      {sezioniExtra.map((C, i) => <C key={i} dati={dati} />)}

      {/* Invito finale */}
      <Sezione>
        <div className="rounded-[2.5rem] px-8 py-14 sm:px-16 sm:py-20 text-center text-white relative overflow-hidden" style={{ background: "var(--brand)" }}>
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ background: "var(--secondario)" }} />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ background: "var(--accento)" }} />
          <h2 className="relative font-display text-3xl sm:text-5xl font-semibold leading-tight">Ti aspettiamo da {brand.brandName}</h2>
          <p className="relative mt-4 text-white/80 max-w-xl mx-auto">{prenota ? "Scegli il trattamento, la persona e l'orario che preferisci: la conferma arriva subito." : "Chiamaci o scrivici: troviamo insieme il momento giusto per te."}</p>
          <div className="relative mt-8 flex items-center justify-center gap-3 flex-wrap">
            {prenota ? <Bottone Link={Link} to="/prenota" tono="chiaro"><Calendar size={16} /> Prenota ora</Bottone> : null}
            {brand.phone ? <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-full border border-white/40 hover:bg-white/10 transition"><MessageCircle size={16} /> Scrivici su WhatsApp</a> : null}
          </div>
        </div>
      </Sezione>
    </>
  );
}

// ---- Servizi ---------------------------------------------------------------
export function slug(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "servizi"; }
function ListaServizi({ items, Link, prenota }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((s) => (
        <div key={s.id} className="bg-white rounded-2xl border border-stone-200/80 p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-stone-900">{s.name}</div>
            <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">{s.durationMin ? <span className="inline-flex items-center gap-1"><Clock size={11} /> {s.durationMin} min</span> : null}{s.price != null ? <span className="font-semibold text-stone-800">{eur(s.price)}</span> : null}</div>
          </div>
          {prenota ? <Link to={`/prenota?servizio=${encodeURIComponent(s.id)}`} className="shrink-0 text-xs font-semibold px-3.5 py-2 rounded-full transition hover:brightness-110" style={{ background: "color-mix(in srgb, var(--brand) 10%, white)", color: "var(--brand)" }}>Prenota</Link> : null}
        </div>
      ))}
    </div>
  );
}
function PaginaServizi({ brand, gruppi, listino, Link, prenota, Prenota, pastelli }) {
  const conCategorie = gruppi.length > 1 || (gruppi[0] && gruppi[0].nome);
  useEffect(() => { const h = typeof window !== "undefined" ? window.location.hash.slice(1) : ""; if (h) setTimeout(() => { const el = document.getElementById(h); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60); }, []);
  return (
    <>
      <TestataPagina eyebrow="Listino" titolo="I nostri servizi" testo={`Tutti i trattamenti di ${brand.brandName}, con durata e prezzo. ${prenota ? "Ogni voce si prenota online." : "Chiamaci per fissare il tuo appuntamento."}`} sfondo={pastelli[1]} />
      {conCategorie ? (
        <div className="sticky top-20 z-20 bg-white/90 backdrop-blur border-b border-stone-100">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3 flex gap-2 overflow-x-auto no-scrollbar">
            {gruppi.map((g) => <a key={g.nome} href={`#${slug(g.nome)}`} onClick={(e) => { e.preventDefault(); const el = document.getElementById(slug(g.nome)); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="shrink-0 text-xs font-semibold px-3.5 py-2 rounded-full border border-stone-200 text-stone-600 hover:border-stone-400 whitespace-nowrap">{g.nome}</a>)}
          </div>
        </div>
      ) : null}
      <Sezione>
        {gruppi.map((g, i) => (
          <div key={g.nome || "_"} id={slug(g.nome)} className="scroll-mt-40 mb-14 last:mb-0">
            {g.nome ? <div className="flex items-end justify-between gap-4 mb-5"><h2 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 flex items-center gap-3"><span className="inline-block w-10 h-1 rounded-full" style={{ background: pastelli[i % pastelli.length], filter: "saturate(1.4)" }} />{g.nome}</h2><span className="text-xs text-stone-400">{g.items.length} trattament{g.items.length === 1 ? "o" : "i"}</span></div> : null}
            <ListaServizi items={g.items} Link={Link} prenota={prenota} />
          </div>
        ))}
        {!listino.length ? <p className="text-stone-500">Il listino è in aggiornamento.</p> : null}
        <div className="mt-14 text-center"><Prenota /></div>
      </Sezione>
    </>
  );
}
function TestataPagina({ eyebrow, titolo, testo, sfondo }) {
  return (
    <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, var(--crema) 0%, ${sfondo || "white"} 100%)` }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 pb-12 sm:pt-20 sm:pb-16">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-stone-900 leading-tight">{titolo}</h1>
        {testo ? <p className="mt-4 text-stone-600 max-w-2xl leading-relaxed">{testo}</p> : null}
      </div>
    </section>
  );
}

// ---- Team ------------------------------------------------------------------
function PaginaTeam({ brand, staff, listino, pastelli, Prenota }) {
  const nomeServizio = (id) => (listino.find((s) => s.id === id) || {}).name;
  return (
    <>
      <TestataPagina eyebrow="Il team" titolo="Le persone di cui fidarti" testo={`Chi lavora da ${brand.brandName}, cosa fa e in cosa è specializzato.`} sfondo={pastelli[2]} />
      <Sezione>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((st, i) => { const svc = (st.serviceIds || []).map(nomeServizio).filter(Boolean); return (
            <CardMorbida key={st.id} sfondo={pastelli[i % pastelli.length]} className="p-8">
              <div className="flex items-center gap-4">
                <AvatarSvg id={avatarIdFor(st)} photo={st.photo} size={84} />
                <div><div className="font-display text-2xl font-semibold text-stone-900">{st.name}</div>{st.role ? <div className="text-sm text-stone-600 mt-0.5">{st.role}</div> : null}</div>
              </div>
              {svc.length ? <div className="mt-5"><div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2">Si occupa di</div><div className="flex flex-wrap gap-1.5">{svc.slice(0, 8).map((n) => <span key={n} className="text-xs bg-white/80 text-stone-700 px-2.5 py-1 rounded-full">{n}</span>)}{svc.length > 8 ? <span className="text-xs text-stone-500 px-1 py-1">e altri {svc.length - 8}</span> : null}</div></div> : null}
            </CardMorbida>
          ); })}
        </div>
        <div className="mt-14 text-center"><Prenota /></div>
      </Sezione>
    </>
  );
}

// ---- Eventi ----------------------------------------------------------------
function CardEvento({ ev, sfondo, Link }) {
  return (
    <Link to={`/evento/${encodeURIComponent(ev.id)}`} className="block group">
      <CardMorbida sfondo={sfondo} className="h-full overflow-hidden p-0">
        {ev.copertina ? <img src={ev.copertina} alt={ev.titolo} loading="lazy" className="w-full h-48 object-cover rounded-t-[1.75rem] rounded-tl-lg" /> : null}
        <div className="p-6">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full text-white mb-3" style={{ background: "var(--brand)" }}><PartyPopper size={11} /> Evento</div>
          <h3 className="font-display text-2xl font-semibold text-stone-900 leading-tight">{ev.titolo}</h3>
          <div className="text-sm text-stone-600 mt-2 flex flex-wrap gap-x-3 gap-y-0.5"><span className="inline-flex items-center gap-1"><Calendar size={13} /> {fmtData(ev.date)}</span><span className="inline-flex items-center gap-1 tabular-nums"><Clock size={13} /> {hhmm(ev.startMin)}–{hhmm(ev.endMin)}</span></div>
          {ev.descrizione ? <p className="text-sm text-stone-600 mt-3 leading-relaxed" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ev.descrizione}</p> : null}
          <div className="mt-4 text-sm font-semibold inline-flex items-center gap-1" style={{ color: "var(--brand)" }}>Scopri l'evento <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" /></div>
        </div>
      </CardMorbida>
    </Link>
  );
}
function PaginaEventi({ brand, eventi, pastelli, Link }) {
  return (
    <>
      <TestataPagina eyebrow="Eventi" titolo="Serate, corsi e open day" testo={`Gli appuntamenti speciali di ${brand.brandName}. Ogni evento ha la sua pagina da condividere.`} sfondo={pastelli[0]} />
      <Sezione>
        {eventi.length ? <div className="grid md:grid-cols-2 gap-6">{eventi.map((ev, i) => <CardEvento key={ev.id} ev={ev} sfondo={pastelli[i % pastelli.length]} Link={Link} />)}</div> : <p className="text-stone-500">Nessun evento in programma al momento. Torna a trovarci presto.</p>}
      </Sezione>
    </>
  );
}

// ---- Prodotti --------------------------------------------------------------
function PaginaProdotti({ brand, catalogo, pastelli }) {
  const gruppi = catalogo ? [...(catalogo.categorie || []), { id: null, name: "Altro" }].map((c) => ({ ...c, items: (catalogo.prodotti || []).filter((p) => (p.categoryId || null) === c.id) })).filter((g) => g.items.length) : [];
  return (
    <>
      <TestataPagina eyebrow="Prodotti" titolo="In vendita in salone" testo="I prodotti che usiamo e consigliamo. Chiedi in salone o scrivici per metterli da parte." sfondo={pastelli[1]} />
      <Sezione>
        {gruppi.length ? gruppi.map((g, gi) => (
          <div key={g.id || "altro"} className="mb-12 last:mb-0">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 mb-5">{g.name}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {g.items.map((p, i) => (
                <CardMorbida key={p.id} sfondo={pastelli[(gi + i) % pastelli.length]} className="flex gap-4">
                  {p.foto ? <img src={p.foto} alt={p.name} loading="lazy" className="w-24 h-24 rounded-2xl object-cover shrink-0 bg-white" /> : <div className="w-24 h-24 rounded-2xl bg-white/80 flex items-center justify-center shrink-0" style={{ color: "var(--brand)" }}><ShoppingBag size={26} /></div>}
                  <div className="min-w-0">
                    <div className="font-semibold text-stone-900">{p.name}</div>
                    {p.description ? <p className="text-sm text-stone-600 mt-1 leading-relaxed">{p.description}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-1.5">{(p.formats || []).map((f, k) => <span key={k} className={`text-xs px-2.5 py-1 rounded-full ${f.disponibile ? "bg-white/80 text-stone-700" : "bg-white/40 text-stone-400"}`}>{f.label}{f.price != null ? <b className="ml-1">{eur(f.price)}</b> : null}{!f.disponibile ? " · esaurito" : ""}</span>)}</div>
                  </div>
                </CardMorbida>
              ))}
            </div>
          </div>
        )) : <p className="text-stone-500">Il catalogo non è ancora pubblicato.</p>}
      </Sezione>
    </>
  );
}

// ---- Contatti --------------------------------------------------------------
function PaginaContatti({ brand, sito, wa, pastelli, Prenota }) {
  const social = [
    sito.instagram ? [Instagram, "Instagram", sito.instagram.startsWith("http") ? sito.instagram : `https://instagram.com/${sito.instagram.replace(/^@/, "")}`] : null,
    sito.facebook ? [Facebook, "Facebook", sito.facebook.startsWith("http") ? sito.facebook : `https://facebook.com/${sito.facebook}`] : null,
    sito.sitoWeb ? [Globe, "Sito web", sito.sitoWeb.startsWith("http") ? sito.sitoWeb : `https://${sito.sitoWeb}`] : null,
  ].filter(Boolean);
  const Voce = ({ href, Icona, titolo, testo, esterno }) => (
    <a href={href} {...(esterno ? { target: "_blank", rel: "noreferrer" } : {})} className="flex items-center gap-4 bg-white rounded-2xl p-4 hover:shadow-md transition-shadow">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, var(--accento) 22%, white)", color: "var(--brand)" }}><Icona size={19} /></div>
      <div className="min-w-0"><div className="font-semibold text-stone-900 text-sm">{titolo}</div><div className="text-sm text-stone-600 break-words">{testo}</div></div>
    </a>
  );
  return (
    <>
      <TestataPagina eyebrow="Contatti" titolo="Vieni a trovarci" testo="Orari, indirizzo e tutti i modi per raggiungerci." sfondo={pastelli[2]} />
      <Sezione>
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8">
          <CardMorbida sfondo={pastelli[1]} className="p-8">
            <h2 className="font-display text-2xl font-semibold text-stone-900 mb-4 flex items-center gap-2"><Clock size={20} style={{ color: "var(--brand)" }} /> Orari di apertura</h2>
            {sito.orari ? <p className="text-stone-700 leading-loose whitespace-pre-line">{sito.orari}</p> : <p className="text-stone-500">Chiamaci per conoscere gli orari.</p>}
            <div className="mt-8"><Prenota /></div>
          </CardMorbida>
          <div className="grid sm:grid-cols-2 gap-3 content-start">
            {brand.phone ? <Voce href={`tel:+${wa}`} Icona={Phone} titolo="Telefono" testo={brand.phone} /> : null}
            {brand.phone ? <Voce href={`https://wa.me/${wa}`} Icona={MessageCircle} titolo="WhatsApp" testo="Scrivici un messaggio" esterno /> : null}
            {brand.email ? <Voce href={`mailto:${brand.email}`} Icona={Mail} titolo="Email" testo={brand.email} /> : null}
            {brand.address ? <Voce href={`https://maps.google.com/?q=${encodeURIComponent(brand.address)}`} Icona={MapPin} titolo="Dove siamo" testo={brand.address} esterno /> : null}
            {social.map(([Icona, titolo, href]) => <Voce key={titolo} href={href} Icona={Icona} titolo={titolo} testo="Seguici" esterno />)}
            {!brand.phone && !brand.email && !brand.address && !social.length ? <p className="text-stone-500 text-sm">I contatti saranno pubblicati a breve.</p> : null}
          </div>
        </div>
      </Sezione>
    </>
  );
}

// ---- Pagine legali -----------------------------------------------------------
function PaginaLegale({ titolo, testo }) {
  // `testo` è un elenco di blocchi { h, p } o stringhe.
  return (
    <>
      <TestataPagina eyebrow="Informazioni" titolo={titolo} />
      <Sezione>
        <article className="max-w-3xl prose-lucentia">
          {testo.map((b, i) => (typeof b === "string" ? <p key={i} className="text-stone-700 leading-relaxed mb-4 whitespace-pre-line">{b}</p> : (
            <div key={i} className="mb-8">
              {b.h ? <h2 className="font-display text-2xl font-semibold text-stone-900 mb-3">{b.h}</h2> : null}
              {(Array.isArray(b.p) ? b.p : [b.p]).filter(Boolean).map((p, k) => <p key={k} className="text-stone-700 leading-relaxed mb-3 whitespace-pre-line">{p}</p>)}
              {Array.isArray(b.lista) ? <ul className="list-disc pl-5 space-y-1 text-stone-700">{b.lista.map((v, k) => <li key={k}>{v}</li>)}</ul> : null}
            </div>
          )))}
        </article>
      </Sezione>
    </>
  );
}

// ---- Piè di pagina -----------------------------------------------------------
function PiePagina({ brand, sito, legale, NAV, Link, prenota, wa }) {
  const anno = new Date().getFullYear();
  const righeLegali = [legale.ragioneSociale || brand.brandName, legale.piva ? `P.IVA ${legale.piva}` : null, legale.codiceFiscale && legale.codiceFiscale !== legale.piva ? `C.F. ${legale.codiceFiscale}` : null, legale.sede || brand.address || null].filter(Boolean);
  return (
    <footer className="text-white" style={{ background: "color-mix(in srgb, var(--brand) 88%, black)" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 pb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            {sito.logoEsteso ? <div className="inline-block bg-white/95 rounded-2xl px-4 py-3 mb-4"><img src={sito.logoEsteso} alt={brand.brandName} loading="lazy" width="180" height="40" className="h-10 w-auto object-contain" /></div> : <div className="font-display text-2xl font-semibold mb-3">{brand.brandName}</div>}
            {brand.tagline ? <p className="text-sm text-white/70">{brand.tagline}</p> : null}
            {sito.descrizione ? <p className="text-sm text-white/60 mt-3 leading-relaxed">{sito.descrizione}</p> : null}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3">Pagine</div>
            <ul className="space-y-2 text-sm">{NAV.map(([to, label]) => <li key={to}><Link to={to} className="text-white/85 hover:text-white">{label}</Link></li>)}{prenota ? <li><Link to="/prenota" className="text-white/85 hover:text-white">Prenota online</Link></li> : null}</ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3">Contatti</div>
            <ul className="space-y-2 text-sm text-white/85">
              {brand.phone ? <li><a href={`tel:+${wa}`} className="hover:text-white inline-flex items-center gap-2"><Phone size={14} /> {brand.phone}</a></li> : null}
              {brand.email ? <li><a href={`mailto:${brand.email}`} className="hover:text-white inline-flex items-center gap-2 break-all"><Mail size={14} /> {brand.email}</a></li> : null}
              {brand.address ? <li className="inline-flex items-start gap-2"><MapPin size={14} className="mt-1 shrink-0" /> <span>{brand.address}</span></li> : null}
              {sito.orari ? <li className="text-white/60 whitespace-pre-line pt-1 text-xs leading-relaxed">{sito.orari}</li> : null}
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3">Informazioni</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="text-white/85 hover:text-white">Privacy</Link></li>
              <li><Link to="/cookie" className="text-white/85 hover:text-white">Cookie</Link></li>
              <li><Link to="/note-legali" className="text-white/85 hover:text-white">Note legali</Link></li>
              <li><a href="/gestionale" className="text-white/60 hover:text-white inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Area riservata</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/15 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-white/60">
          <div>© {anno} {righeLegali.join(" · ")}</div>
          <a href="https://lucentia-app.com" target="_blank" rel="noreferrer" className="hover:text-white">Sito e gestionale realizzati con Lucentia</a>
        </div>
      </div>
    </footer>
  );
}
