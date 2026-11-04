import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Sparkles, Calendar, Mail, Lock, Settings, Users, Phone, MapPin, Gift, LogOut, ShieldCheck, AlertTriangle, ShoppingBag, AlertCircle, BarChart3, MessageCircle, FileText, Store, Boxes, Package, Truck, Warehouse, LayoutGrid, ChevronRight, CalendarClock, Megaphone, Clock, Table2, UserCog } from "lucide-react";
import { setBrandTab } from "../../favicon.js";
import { APP_VERSION, RESELLER_CODE, uid, pad, todayStr, DAY_NAMES, MONTHS, parseDate, BRANDING, DEFAULT_CONFIG, DEFAULT_CATALOG, loadKey, saveKey, apiLoad, apiSaveVerificato, apiSave, apiSaveDebounced, loadLicense, saveLicense, licenseState, licenseOk, themeVars, eventiImpegni, buildDemoData, buildSampleData, BRAND_CSS, flagsFromModuli, ModsCtx, planName, LUCENTIA_LOGO, MAKER_LOGO } from "./comuni.jsx";
import { BACKUP_KEY, backupPayload, saveDirHandle, loadDirHandle, clearDirHandle, writeBackupToDir } from "./backup.js";
import { AgendaPage } from "./agenda.jsx";
import { ClientsView } from "./clienti.jsx";
import { GiftCardsView } from "./buoni.jsx";
import { ShopView } from "./cassa.jsx";
import { ArticoliView } from "./articoli.jsx";
import { PersonaleView } from "./personale.jsx";
import { useCassaRt, StatoCassa } from "./cassaRt.jsx";
import { StatsView } from "./statistiche.jsx";
import { MarketingView } from "./marketing.jsx";
import { SettingsView } from "./impostazioni.jsx";
import { ESTENSIONI } from "../../cliente/index.jsx";
import { useGcal } from "./google.jsx";
import { FattureView, useEffatta, bozzaDaVendita, bozzaDaAppuntamento, fattureConfig } from "./fatture.jsx";

// `modalita` è "hub" (salone ospitato sul portale: demo o prova) oppure
// "cliente" (installazione dedicata sul dominio del salone); `installazione`
// porta l'esito della verifica licenza col portale, solo in modalità cliente.
export default function SalonApp({ onLogout, moduli, azienda, demo, modalita = "hub", installazione = null }) {
  const flags = flagsFromModuli(moduli);
  // Viste su misura del cliente (src/cliente/index.jsx), filtrate sui moduli accesi.
  const visteExtra = (ESTENSIONI.viste || []).filter((v) => v && v.id && v.componente && (!v.modulo || flags.has(v.modulo)));
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [catalog, setCatalog] = useState(DEFAULT_CATALOG);
  const [sales, setSales] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [eventi, setEventi] = useState([]); // eventi del salone (occupano uno o più operatori)
  const [fatture, setFatture] = useState([]); // fatture elettroniche emesse (modulo fatture)
  const [acquisti, setAcquisti] = useState([]); // fatture dei fornitori scaricate da Effatta
  const [bozzaFattura, setBozzaFattura] = useState(null); // una fattura da compilare, nata da cassa o agenda
  const [personale, setPersonale] = useState(null); // ore lavorate e fogli ore (area Gestione personale)
  const [onlineBk, setOnlineBk] = useState([]); // prenotazioni online ricevute (overlay, sola lettura)
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  const [license, setLicense] = useState(() => loadLicense()); // licenza: resta in locale, invariata
  const [session, setSession] = useState({ role: "operator", hidePartial: false }); // login gestito dal contenitore (server)
  // Si torna da Google con ?gmail=<esito>: si toglie dall'indirizzo e si apre
  // Impostazioni → Google per mostrare com'è andata.
  const [esitoGoogle, setEsitoGoogle] = useState(() => {
    try { const u = new URL(window.location.href); const e = u.searchParams.get("gmail") || ""; if (e) { u.searchParams.delete("gmail"); window.history.replaceState({}, "", u.pathname + u.search + u.hash); } return e; } catch (e) { return ""; }
  });
  // Le AREE DI LAVORO: all'accesso la home mostra un riquadro per ognuna, e
  // dentro un'area si passa fra le sue sezioni (barra in alto per il Banco,
  // menù laterale per le altre). `area` nulla = home.
  const estensioniIn = (areaId) => visteExtra.filter((v) => (v.area || "banco") === areaId).map((v) => [v.id, v.label || v.id, v.icon || Sparkles]);
  const AREE = [
    { id: "banco", label: "Banco", icon: Store, desc: "Agenda, clienti, buoni regalo e vendita: il lavoro di tutti i giorni.", sezioni: [["agenda", "Agenda", Calendar], ["clienti", "Clienti", Users], ["buoni", "Buoni", Gift], ...(flags.vendite ? [["vendita", "Vendita", ShoppingBag]] : []), ...(flags.fatture ? [["fatture", "Fatture", FileText]] : []), ...estensioniIn("banco")] },
    ...(flags.vendite ? [{ id: "articoli", label: "Articoli", icon: Boxes, desc: "Catalogo dei prodotti, documenti di carico dai fornitori e magazzino.", menu: true, sezioni: [["catalogo", "Catalogo", Package], ["carichi", "Carichi", Truck], ["magazzino", "Magazzino", Warehouse], ...estensioniIn("articoli")] }] : []),
    ...(flags.marketing || flags.statistiche || estensioniIn("marketing").length ? [{ id: "marketing", label: "Marketing", icon: Megaphone, desc: "Messaggi ai clienti e statistiche dell'attività.", menu: true, sezioni: [...(flags.marketing ? [["marketing", "Messaggi", MessageCircle]] : []), ...(flags.statistiche ? [["stats", "Statistiche", BarChart3]] : []), ...estensioniIn("marketing")] }] : []),
    { id: "personale", label: "Gestione personale", icon: UserCog, desc: "Ore lavorate di ogni dipendente e fogli ore mensili per chi fa le buste paga.", menu: true, sezioni: [["fogli", "Fogli ore", Clock], ["riepilogo", "Riepilogo del mese", Table2], ["dipendenti", "Dipendenti", Users], ...estensioniIn("personale")] },
    { id: "impostazioni", label: "Impostazioni", icon: Settings, desc: "Attività, servizi, operatori e cabine, sito, integrazioni, dati e licenza.", sezioni: [["settings", "Impostazioni", Settings]] },
  ];
  // Nel programma Windows della cassa c'è solo il Banco: si apre direttamente lì, e la
  // vendita emette scontrini col registratore (impostazioni nel programma, password del tecnico).
  const cassaRt = useCassaRt();
  const soloBanco = cassaRt.attiva;
  const [area, setArea] = useState(esitoGoogle ? "impostazioni" : (soloBanco ? "banco" : null));
  const [view, setView] = useState(esitoGoogle ? "settings" : "agenda");
  const areaCorrente = AREE.find((a) => a.id === area) || null;
  useEffect(() => { if (soloBanco && area !== "banco") { setArea("banco"); setView("agenda"); } }, [soloBanco, area]);
  const vaiA = (areaId, viewId) => { const a = AREE.find((x) => x.id === areaId); if (!a) { setArea(null); return; } setArea(a.id); setView(viewId && a.sezioni.some((sz) => sz[0] === viewId) ? viewId : a.sezioni[0][0]); try { window.scrollTo({ top: 0 }); } catch (e) {} };
  useEffect(() => { if (area && !areaCorrente) setArea(null); else if (areaCorrente && !areaCorrente.sezioni.some((sz) => sz[0] === view)) setView(areaCorrente.sezioni[0][0]); }, [moduli, area, view]);
  // Google Calendar a due vie (modulo "google"): legge e scrive gli
  // appuntamenti tramite questi riferimenti, così la lista è sempre quella
  // attuale. Gli eventi nati su Google occupano l'operatore come un evento.
  const bookingsRef = useRef([]); bookingsRef.current = bookings;
  const prevBookingsRef = useRef(null);
  const google = useGcal({ attiva: flags.has("google") && !demo && !loading, leggi: () => bookingsRef.current, salva: (l) => setBookings(l), config, clients });
  useEffect(() => {
    if (!loadedRef.current) return;
    const prima = prevBookingsRef.current; prevBookingsRef.current = bookings;
    if (prima && prima !== bookings) google.dopoSalvataggio(prima, bookings);
  }, [bookings]);
  const impegni = useMemo(() => [...eventiImpegni(eventi), ...google.occupanti], [eventi, google.occupanti]);
  const [demoBanner, setDemoBanner] = useState(!!demo);
  const isDemo = !!demo;
  const demoRef = useRef(false); demoRef.current = false;
  const [backupDir, setBackupDir] = useState(null);
  const [backupDirName, setBackupDirName] = useState("");
  const [lastBackup, setLastBackup] = useState(() => loadKey(BACKUP_KEY, null));
  const backupDirRef = useRef(null); backupDirRef.current = backupDir;
  const dataRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [cfg, bk, cl, cat, sl] = await Promise.all([
        apiLoad("config", null), apiLoad("bookings", null), apiLoad("clients", null), apiLoad("catalog", null), apiLoad("sales", null),
      ]);
      if (!alive) return;
      const vch = await apiLoad("vouchers", null);
      if (alive) setVouchers(Array.isArray(vch) ? vch : []);
      const evs = await apiLoad("eventi", null);
      if (alive) setEventi(Array.isArray(evs) ? evs : []);
      const pers = await apiLoad("personale", null);
      if (alive) setPersonale(pers && typeof pers === "object" ? pers : {});
      if (flags.fatture) {
        const [ft, ac] = await Promise.all([apiLoad("fatture", null), apiLoad("acquisti", null)]);
        if (alive) { setFatture(Array.isArray(ft) ? ft : []); setAcquisti(Array.isArray(ac) ? ac : []); }
      }
      if (cfg == null && bk == null && cl == null && sl == null) {
        const s = buildSampleData();
        setConfig(DEFAULT_CONFIG); setBookings(s.bookings); setClients(s.clients); setSales(s.sales); setCatalog(DEFAULT_CATALOG);
        await Promise.all([ apiSave("config", DEFAULT_CONFIG), apiSave("bookings", s.bookings), apiSave("clients", s.clients), apiSave("sales", s.sales), apiSave("catalog", DEFAULT_CATALOG) ]);
      } else {
        setConfig(cfg ? { ...DEFAULT_CONFIG, ...cfg, branding: { ...BRANDING, ...(cfg.branding || {}) } } : DEFAULT_CONFIG);
        setBookings(Array.isArray(bk) ? bk : []);
        setClients(Array.isArray(cl) ? cl : []);
        setCatalog(cat && Array.isArray(cat.products) ? cat : DEFAULT_CATALOG);
        setSales(Array.isArray(sl) ? sl : []);
      }
      loadedRef.current = true;
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // Prenotazioni online ricevute dai clienti (overlay sull'agenda).
  const refreshOnline = useCallback(async () => {
    if (!flags.online || isDemo) { setOnlineBk([]); return; }
    try {
      const r = await fetch("/api/online-bookings", { credentials: "include" });
      const j = await r.json().catch(() => ({}));
      setOnlineBk(Array.isArray(j.items) ? j.items.map((b) => ({ ...b, serviceIds: b.serviceId ? [b.serviceId] : [], online: true })) : []);
    } catch (e) {}
  }, [flags.online, isDemo]);
  useEffect(() => { refreshOnline(); }, [refreshOnline]);
  const importOnline = async (b) => {
    const nb = { id: uid(), date: b.date, startMin: b.startMin, endMin: b.endMin, serviceIds: b.serviceIds || [], staffId: b.staffId, clientCode: b.clientCode || null, clientName: b.clientName || "", createdAt: Date.now(), fromOnline: true };
    setBookings((cur) => [...cur, nb]);
    await fetch("/api/online-bookings/" + b.id, { method: "DELETE", credentials: "include" }).catch(() => {});
    refreshOnline();
  };
  const cancelOnline = async (b) => { await fetch("/api/online-bookings/" + b.id, { method: "DELETE", credentials: "include" }).catch(() => {}); refreshOnline(); };

  useEffect(() => { if (demoRef.current || !loadedRef.current) return; apiSaveDebounced("bookings", bookings); }, [bookings]);
  // Gli appuntamenti presi da un altro dispositivo (l'app /utenti sul
  // telefono) arrivano qui da soli: ogni minuto, e quando si torna sulla
  // scheda, si legge l'elenco dal server e si aggiungono quelli che mancano.
  // Le modifiche fatte qui vincono sempre su quelle già conosciute.
  useEffect(() => {
    const unisci = async () => {
      if (demoRef.current || !loadedRef.current || document.visibilityState === "hidden") return;
      const dal = await apiLoad("bookings", null);
      if (!Array.isArray(dal)) return;
      setBookings((cur) => { const ids = new Set(cur.map((x) => x && x.id)); const nuovi = dal.filter((x) => x && x.id && !ids.has(x.id) && !x.gcal && (x.daUtenti || x.fromOnline)); return nuovi.length ? [...cur, ...nuovi] : cur; });
    };
    const t = setInterval(unisci, 60000);
    const vis = () => { if (document.visibilityState === "visible") unisci(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, []);
  useEffect(() => { if (demoRef.current || !loadedRef.current) return; apiSaveDebounced("clients", clients); }, [clients]);
  useEffect(() => { if (demoRef.current || !loadedRef.current) return; apiSaveDebounced("catalog", catalog); }, [catalog]);
  useEffect(() => { if (demoRef.current || !loadedRef.current) return; apiSaveDebounced("sales", sales); }, [sales]);
  useEffect(() => { if (demoRef.current || !loadedRef.current) return; apiSaveDebounced("vouchers", vouchers); }, [vouchers]);
  useEffect(() => { if (demoRef.current || !loadedRef.current || personale == null) return; apiSaveDebounced("personale", personale); }, [personale]);
  useEffect(() => { if (demoRef.current || !loadedRef.current || !flags.fatture) return; apiSaveDebounced("fatture", fatture); }, [fatture]);
  useEffect(() => { if (demoRef.current || !loadedRef.current || !flags.fatture) return; apiSaveDebounced("acquisti", acquisti); }, [acquisti]);
  // Effatta: esiti dello SDI ogni 2 ore e fatture dei fornitori ogni ora.
  const effatta = useEffatta({ attiva: flags.fatture && !demo && !loading, fatture, setFatture, acquisti, setAcquisti });
  // Una fattura da una vendita o da un appuntamento: si apre la vista Fatture col modulo già compilato.
  const fatturaDa = (tipo, x) => { const cfgF = fattureConfig(config); setBozzaFattura(tipo === "vendita" ? bozzaDaVendita(x, clients, cfgF) : bozzaDaAppuntamento(x, config, clients, cfgF)); vaiA("banco", "fatture"); };
  const fatturaEmessa = (f) => {
    const o = f.origine || {};
    if (o.tipo === "vendita") setSales((cur) => cur.map((s) => (s.id === o.id ? { ...s, fatturaId: f.id, fatturaNumero: f.numero } : s)));
    if (o.tipo === "appuntamento") setBookings((cur) => cur.map((b) => (b.id === o.id ? { ...b, fatturaId: f.id, fatturaNumero: f.numero } : b)));
  };
  // Gli eventi si salvano SUBITO (niente debounce) e con esito verificato: il
  // link pubblico viene condiviso a stretto giro, un salvataggio fallito e
  // silenzioso produrrebbe una pagina "evento non disponibile".
  useEffect(() => {
    if (demoRef.current || !loadedRef.current) return;
    (async () => {
      const r = await apiSaveVerificato("eventi", eventi);
      if (!r.ok) alert(`Attenzione: il salvataggio degli eventi non è riuscito (${r.error}). Se hai caricato un'immagine molto grande, riprova con una foto più leggera.`);
    })();
  }, [eventi]);
  dataRef.current = { config, bookings, clients, catalog, sales, eventi, fatture, acquisti };
  useEffect(() => { loadDirHandle().then((h) => { if (h) { setBackupDir(h); setBackupDirName(h.name || "cartella"); } }); }, []);
  useEffect(() => {
    const tick = async () => {
      if (demoRef.current) return;
      const d = dataRef.current || {}; const bkc = (d.config && d.config.backup) || {};
      if (!bkc.enabled || !bkc.time) return;
      const h = backupDirRef.current; if (!h) return;
      const today = todayStr(); const last = loadKey(BACKUP_KEY, null);
      if (last && last.date === today) return;
      const now = new Date(); const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      if (hhmm >= bkc.time) { try { await writeBackupToDir(h, backupPayload(d.config, d.bookings, d.clients, d.catalog, d.sales, d.eventi, d.fatture, d.acquisti)); const info = { date: today, at: Date.now() }; saveKey(BACKUP_KEY, info); setLastBackup(info); } catch (e) {} }
    };
    const id = setInterval(tick, 60000); const t0 = setTimeout(tick, 5000);
    return () => { clearInterval(id); clearTimeout(t0); };
  }, []);
  // La licenza è ora verificata dal server: nessun controllo locale qui.
  useEffect(() => {}, [session]);

  const saveConfig = (next) => { setConfig(next); if (!demoRef.current && loadedRef.current) apiSaveDebounced("config", next); };
  const updateLicense = (lic) => { setLicense(lic); saveLicense(lic); };
  const enterSession = (role, hidePartial) => {
    if (role === "demo") {
      const d = buildDemoData();
      setConfig(d.config); setBookings(d.bookings); setClients(d.clients); setCatalog(d.catalog); setSales(d.sales);
      setView("agenda"); setDemoBanner(true); setSession({ role: "demo", hidePartial: false }); return;
    }
    setSession({ role, hidePartial: !!hidePartial });
  };
  const logout = () => {
    const wasDemo = demoRef.current;
    setDemoBanner(false); setSession(null);
    if (wasDemo) (async () => {
      const [cfg, bk, cl, cat, sl] = await Promise.all([
        apiLoad("config", null), apiLoad("bookings", null), apiLoad("clients", null), apiLoad("catalog", null), apiLoad("sales", null),
      ]);
      setConfig(cfg ? { ...DEFAULT_CONFIG, ...cfg, branding: { ...BRANDING, ...(cfg.branding || {}) } } : DEFAULT_CONFIG);
      setBookings(Array.isArray(bk) ? bk : []); setClients(Array.isArray(cl) ? cl : []);
      setCatalog(cat && Array.isArray(cat.products) ? cat : DEFAULT_CATALOG); setSales(Array.isArray(sl) ? sl : []);
    })();
  };
  const b = config.branding;
  // Favicon + titolo scheda = brand del cliente (salone) quando si è dentro la sua pagina.
  const faviconSito = config.sito && config.sito.favicon;
  useEffect(() => { setBrandTab(faviconSito || b.logo, b.name ? `${b.name} · ${modalita === "cliente" ? "Gestionale" : "Lucentia"}` : undefined); }, [b.logo, b.name, modalita, faviconSito]);
  const pickBackupDir = async () => {
    if (!window.showDirectoryPicker) { alert("La scelta della cartella non è supportata in questo ambiente. Su Windows funziona; altrimenti usa \"Esporta backup\"."); return; }
    try { const h = await window.showDirectoryPicker({ mode: "readwrite", id: "lucentia-backup" }); await saveDirHandle(h); setBackupDir(h); setBackupDirName(h.name || "cartella"); } catch (e) {}
  };
  const backupNow = async () => {
    const h = backupDirRef.current; if (!h) { alert("Scegli prima una cartella di destinazione."); return; }
    try { await writeBackupToDir(h, backupPayload(config, bookings, clients, catalog, sales, eventi, fatture, acquisti)); const info = { date: todayStr(), at: Date.now() }; saveKey(BACKUP_KEY, info); setLastBackup(info); alert("Backup salvato nella cartella scelta."); } catch (e) { alert("Backup non riuscito: permesso negato o cartella non disponibile. Riprova."); }
  };
  const clearBackupDir = async () => { await clearDirHandle(); setBackupDir(null); setBackupDirName(""); };

  if (!session) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-800" style={themeVars(b.primary)}>
        <style>{BRAND_CSS}</style>
        <LoginGate branding={b} license={license} onUnlock={(role, hidePartial) => enterSession(role, hidePartial)} />
      </div>
    );
  }

  const ls = licenseState(license);
  const operatorWarn = session.role === "operator" && ls.state === "active" && !ls.unlimited && ls.days <= 30;
  const vistaExtra = visteExtra.find((v) => v.id === view && areaCorrente && areaCorrente.sezioni.some((sz) => sz[0] === v.id));
  const propsEstensione = { config, saveConfig, bookings, setBookings, clients, setClients, catalog, setCatalog, sales, setSales, vouchers, setVouchers, eventi, setEventi, azienda, demo: isDemo };
  const canAddVoucher = !isDemo || vouchers.filter((v) => !v.seed).length < 5;
  const canAddClient = !isDemo || clients.filter((c) => !c.seed).length < 2;
  const canAddBooking = !isDemo || bookings.filter((b) => !b.seed).length < 20;
  // numeri per i riquadri della home
  const oggi = todayStr();
  const numeri = {
    banco: `${bookings.filter((x) => x.date === oggi && x.status !== "cancelled").length} appuntament${bookings.filter((x) => x.date === oggi && x.status !== "cancelled").length === 1 ? "o" : "i"} oggi${flags.online && onlineBk.length ? ` · ${onlineBk.length} online da confermare` : ""}`,
    articoli: (() => { const sotto = (catalog.products || []).reduce((n, p) => n + p.formats.filter((f) => (Number(f.stock) || 0) <= ((f.scortaMin != null && f.scortaMin !== "" ? Number(f.scortaMin) : Number(catalog.scortaMin != null ? catalog.scortaMin : 2)) || 0)).length, 0); return sotto ? `${sotto} format${sotto === 1 ? "o" : "i"} sotto scorta` : "Giacenze a posto"; })(),
    marketing: `${clients.filter((c) => (c.phone || "").replace(/\D/g, "").length >= 6).length} clienti contattabili`,
    personale: `${config.staff.length + ((personale && personale.dipendenti) || []).filter((d) => !d.staffId && d.attivo !== false).length} dipendenti`,
    impostazioni: azienda && azienda.licenza_scadenza ? `Licenza fino al ${String(azienda.licenza_scadenza).split("-").reverse().join("/")}` : "Licenza illimitata",
  };

  return (
    <ModsCtx.Provider value={flags}>
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col" style={themeVars(b.primary)}>
      <style>{BRAND_CSS}</style>
      <header className="bg-white/80 backdrop-blur-xl border-b border-stone-200/70 sticky top-0 z-20" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 28px)", boxShadow: "var(--lc-shadow-xs)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {b.logo ? <img src={b.logo} alt="logo" className="w-9 h-9 rounded-xl object-cover shrink-0 ring-1 ring-stone-200" /> : <div className="w-9 h-9 rounded-xl brand-bg flex items-center justify-center shrink-0"><Sparkles size={18} /></div>}
            <div className="min-w-0 hidden sm:block">
              <div className="font-semibold leading-tight truncate tracking-tight">{b.name}</div>
              {b.tagline ? <div className="text-xs text-stone-400 leading-tight truncate">{b.tagline}</div> : null}
            </div>
          </div>
          <nav className="flex items-center gap-0.5 shrink-0 min-w-0">
            {areaCorrente ? <>
              {soloBanco ? <StatoCassa cfg={cassaRt.cfg} /> : <button onClick={() => setArea(null)} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition" title="Torna alle aree di lavoro"><LayoutGrid size={16} /><span className="hidden lg:inline">Aree</span></button>}
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-2 text-sm font-semibold text-stone-800"><areaCorrente.icon size={16} className="brand-accent" /> {areaCorrente.label}</span>
              {!areaCorrente.menu && areaCorrente.sezioni.length > 1 ? <span className="hidden sm:block w-px h-5 bg-stone-200 mx-1" /> : null}
              {!areaCorrente.menu && areaCorrente.sezioni.length > 1 ? areaCorrente.sezioni.map(([k, label, Icon]) => (
                <button key={k} onClick={() => setView(k)} aria-current={view === k ? "page" : undefined} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition ${view === k ? "brand-soft brand-text" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"}`}>
                  <Icon size={16} /><span className="hidden lg:inline">{label}</span>
                </button>
              )) : null}
            </> : null}
            {session.role === "reseller" ? <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium bg-stone-800 text-white px-2 py-1 rounded-lg ml-1"><ShieldCheck size={13} /> Rivenditore</span> : null}
            {isDemo ? <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-500 text-white px-2 py-1 rounded-lg ml-1"><Sparkles size={13} /> Demo</span> : null}
            {soloBanco ? <button onClick={() => { try { window.lucentiaCassa.apriImpostazioni(); } catch (e) {} }} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-100 ml-1" title="Impostazioni della cassa (password del tecnico)"><Settings size={16} /><span className="hidden lg:inline">Impostazioni</span></button> : null}
            <button onClick={onLogout} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-100 ml-1" title="Esci"><LogOut size={16} /><span className="hidden lg:inline">Esci</span></button>
          </nav>
        </div>
        {operatorWarn ? <div className="bg-amber-50 border-t border-amber-200 text-amber-700 text-xs text-center py-1.5 flex items-center justify-center gap-1.5"><AlertTriangle size={13} /> Licenza in scadenza tra {ls.days} giorn{ls.days === 1 ? "o" : "i"}. Contatta il rivenditore per il rinnovo.</div> : null}
      </header>

      <main key={`${area || "home"}-${view}`} className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 lc-fade-up">
        {!area ? <HomeAree aree={AREE} numeri={numeri} branding={b} onApri={(id) => vaiA(id)} /> : null}
        {area === "banco" && view === "agenda" && <AgendaPage config={config} bookings={bookings} setBookings={setBookings} clients={clients} setClients={setClients} sales={sales} catalog={catalog} hidePartial={session.hidePartial} canAddBooking={canAddBooking} canAddClient={canAddClient} onlineBk={flags.online ? onlineBk : []} onImportOnline={importOnline} onCancelOnline={cancelOnline} canManageOnline={session.role !== "operator"} eventi={eventi} setEventi={setEventi} impegniEventi={impegni} aziendaId={azienda && azienda.id} google={google} onFattura={flags.fatture && !isDemo ? (b) => fatturaDa("appuntamento", b) : null} cassaRt={soloBanco && !isDemo ? cassaRt : null} />}
        {area === "banco" && view === "clienti" && <ClientsView config={config} bookings={bookings} clients={clients} setClients={setClients} sales={sales} catalog={catalog} vouchers={vouchers} setVouchers={setVouchers} />}
        {area === "banco" && view === "buoni" && <GiftCardsView config={config} vouchers={vouchers} setVouchers={setVouchers} clients={clients} canAddVoucher={canAddVoucher} />}
        {area === "banco" && view === "vendita" && <ShopView catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} clients={clients} setClients={setClients} branding={b} loyalty={config.loyalty} hidePartial={session.hidePartial} canAddClient={canAddClient} demo={isDemo} onFattura={flags.fatture && !isDemo ? (s) => fatturaDa("vendita", s) : null} cassaRt={soloBanco && !isDemo ? cassaRt : null} />}
        {area === "banco" && view === "fatture" && <FattureView config={config} saveConfig={saveConfig} fatture={fatture} setFatture={setFatture} acquisti={acquisti} setAcquisti={setAcquisti} clients={clients} setClients={setClients} bozza={bozzaFattura} onBozzaUsata={() => setBozzaFattura(null)} onEmessa={fatturaEmessa} effatta={effatta} />}
        {area === "banco" && vistaExtra ? <vistaExtra.componente {...propsEstensione} /> : null}
        {area === "articoli" && areaCorrente ? (
          <AreaMenu titolo="Articoli" sezioni={areaCorrente.sezioni} sezione={view} setSezione={setView}>
            {vistaExtra ? <vistaExtra.componente {...propsEstensione} /> : <ArticoliView catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} loyalty={config.loyalty} acquisti={flags.fatture ? acquisti : []} demo={isDemo} sezione={view} setSezione={setView} />}
          </AreaMenu>
        ) : null}
        {area === "personale" && areaCorrente ? (
          <AreaMenu titolo="Gestione personale" sezioni={areaCorrente.sezioni} sezione={view} setSezione={setView}>
            {vistaExtra ? <vistaExtra.componente {...propsEstensione} /> : <PersonaleView config={config} personale={personale || {}} setPersonale={setPersonale} sezione={view} setSezione={setView} demo={isDemo} />}
          </AreaMenu>
        ) : null}
        {area === "marketing" && areaCorrente ? (
          <AreaMenu titolo="Marketing" sezioni={areaCorrente.sezioni} sezione={view} setSezione={setView}>
            {view === "stats" && <StatsView config={config} bookings={bookings} clients={clients} sales={sales} catalog={catalog} vouchers={vouchers} />}
            {view === "marketing" && <MarketingView config={config} saveConfig={saveConfig} bookings={bookings} clients={clients} sales={sales} catalog={catalog} />}
            {vistaExtra ? <vistaExtra.componente {...propsEstensione} /> : null}
          </AreaMenu>
        ) : null}
        {area === "impostazioni" && (isDemo ? (
          <div>
            <div className="mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" /> In versione demo le impostazioni sono <b>visibili ma non modificabili</b>.</div>
            <fieldset disabled style={{ border: 0, margin: 0, padding: 0, minInlineSize: "auto" }}>
              <SettingsView config={config} saveConfig={saveConfig} bookings={bookings} setBookings={setBookings} clients={clients} setClients={setClients} catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} eventi={eventi} setEventi={setEventi} session={session} online={flags.online} aziendaId={azienda && azienda.id} license={license} onSaveLicense={updateLicense} backupDirName={backupDirName} onPickBackupDir={pickBackupDir} onClearBackupDir={clearBackupDir} onBackupNow={backupNow} lastBackup={lastBackup} licenza={{ plan: planName(moduli), scadenza: azienda && azienda.licenza_scadenza }} modalita={modalita} installazione={installazione} azienda={azienda} sezioneIniziale={esitoGoogle ? "google" : "attivita"} esitoGoogle={esitoGoogle} onEsitoGoogleVisto={() => setEsitoGoogle("")} fatture={fatture} acquisti={acquisti} />
            </fieldset>
          </div>
        ) : (
          <SettingsView config={config} saveConfig={saveConfig} bookings={bookings} setBookings={setBookings} clients={clients} setClients={setClients} catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} eventi={eventi} setEventi={setEventi} session={session} online={flags.online} aziendaId={azienda && azienda.id} license={license} onSaveLicense={updateLicense} backupDirName={backupDirName} onPickBackupDir={pickBackupDir} onClearBackupDir={clearBackupDir} onBackupNow={backupNow} lastBackup={lastBackup} licenza={{ plan: planName(moduli), scadenza: azienda && azienda.licenza_scadenza }} modalita={modalita} installazione={installazione} azienda={azienda} sezioneIniziale={esitoGoogle ? "google" : "attivita"} esitoGoogle={esitoGoogle} onEsitoGoogleVisto={() => setEsitoGoogle("")} fatture={fatture} acquisti={acquisti} />
        ))}
      </main>

      {isDemo && demoBanner ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 lc-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl lc-scale-in">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles size={18} className="brand-accent lc-float" /> Demo gratuita</h3>
            <p className="text-sm text-stone-600 mt-3">Stai provando Lucentia in versione dimostrativa per <b>10 giorni</b>. Cosa tenere presente:</p>
            <ul className="text-sm text-stone-600 mt-3 space-y-2">
              <li className="flex gap-2"><AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" /><span>I tuoi dati <b>vengono salvati</b> e li ritrovi a ogni accesso entro i 10 giorni.</span></li>
              <li className="flex gap-2"><AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" /><span>Puoi creare fino a <b>2 clienti</b>, <b>20 appuntamenti</b> e <b>5 buoni</b>.</span></li>
              <li className="flex gap-2"><AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" /><span>Puoi vendere i <b>prodotti già caricati</b>; le <b>Impostazioni</b> sono in sola lettura.</span></li>
            </ul>
            <button onClick={() => setDemoBanner(false)} className="mt-5 w-full brand-bg font-medium py-2.5 rounded-lg">Ho capito, inizia</button>
          </div>
        </div>
      ) : null}

      <footer className="bg-white border-t border-stone-200">
        <div className="max-w-5xl mx-auto px-4 py-5 text-sm text-stone-500 flex flex-wrap gap-x-6 gap-y-1.5 items-center">
          <span className="font-medium text-stone-700">{b.name}</span>
          {b.phone ? <span className="flex items-center gap-1.5"><Phone size={14} className="brand-accent" /> {b.phone}</span> : null}
          {b.email ? <span className="flex items-center gap-1.5"><Mail size={14} className="brand-accent" /> {b.email}</span> : null}
          {b.address ? <span className="flex items-center gap-1.5"><MapPin size={14} className="brand-accent" /> {b.address}</span> : null}
          {/* Versione: serve a capire a colpo d'occhio se il programma si è
              aggiornato dopo un rilascio. */}
          <span className="ml-auto text-[11px] text-stone-400 tabular-nums tracking-wide select-all" title="Versione del programma">Versione {APP_VERSION}</span>
        </div>
      </footer>
    </div>
    </ModsCtx.Provider>
  );
}

// La home del gestionale: un riquadro per ogni area di lavoro.
export function HomeAree({ aree, numeri, branding, onApri }) {
  const d = new Date();
  const ora = d.getHours();
  const saluto = ora < 13 ? "Buongiorno" : ora < 18 ? "Buon pomeriggio" : "Buonasera";
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900">{saluto}{branding && branding.name ? `, ${branding.name}` : ""}</h2>
        <p className="text-sm text-stone-400 mt-1"><span className="capitalize">{DAY_NAMES[d.getDay()]} {d.getDate()} {MONTHS[d.getMonth()]} {d.getFullYear()}</span> · scegli un'area di lavoro</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {aree.map((a, i) => (
          <button key={a.id} onClick={() => onApri(a.id)} style={{ animationDelay: `${i * 60}ms` }} className="lc-card lc-card-hover lc-fade-up group text-left p-5 flex items-start gap-4 transition">
            <span className="w-12 h-12 rounded-2xl brand-soft flex items-center justify-center shrink-0 group-hover:scale-105 transition"><a.icon size={24} className="brand-accent" /></span>
            <span className="flex-1 min-w-0">
              <span className="font-semibold text-lg text-stone-900 tracking-tight flex items-center justify-between gap-2">{a.label} <ChevronRight size={18} className="text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5 transition" /></span>
              <span className="block text-sm text-stone-500 mt-0.5 leading-relaxed">{a.desc}</span>
              {numeri && numeri[a.id] ? <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium brand-text brand-soft px-2.5 py-1 rounded-full">{numeri[a.id]}</span> : null}
              <span className="block mt-3 text-[11px] text-stone-400 truncate">{a.sezioni.map((sz) => sz[1]).join(" · ")}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Un'area con il menù delle sezioni a sinistra (colonna da tablet in su,
// striscia scorrevole sul telefono), come le Impostazioni.
export function AreaMenu({ titolo, sezioni, sezione, setSezione, children }) {
  const menuRef = useRef(null);
  const vaiA = (id) => {
    setSezione(id);
    if (typeof window === "undefined" || window.innerWidth >= 1024) return;
    const el = menuRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold tracking-tight text-stone-900">{titolo}</h2>
      <div className="lg:grid lg:grid-cols-[13.5rem_1fr] lg:gap-6 lg:items-start">
        <nav ref={menuRef} aria-label={`Sezioni di ${titolo}`} className="lg:sticky lg:top-24 mb-4 lg:mb-0 scroll-mt-4">
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 lg:mx-0 lg:px-0">
            {sezioni.map(([id, label, Icon]) => { const on = id === sezione; return (
              <button key={id} onClick={() => vaiA(id)} aria-current={on ? "page" : undefined} className={`shrink-0 lg:w-full flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg whitespace-nowrap transition text-left ${on ? "lc-navpill-active" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"}`}>
                <Icon size={16} className="shrink-0" /> {label}
              </button>
            ); })}
          </div>
        </nav>
        <div className="space-y-6 min-w-0">{children}</div>
      </div>
    </div>
  );
}
export function LoginGate({ branding, license, onUnlock }) {
  const [v, setV] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    const code = v.trim();
    if (!code) return;
    if (code === RESELLER_CODE) { onUnlock("reseller", false); return; }
    if (code === "1234") { onUnlock("demo", false); return; }
    if (license && license.code) {
      const isFull = code === license.code;
      const isReduced = code === license.code + "01"; // accesso ridotto: nasconde vendite e appuntamenti parziali
      if (isFull || isReduced) {
        if (licenseOk(license)) { onUnlock("operator", isReduced); return; }
        setErr("expired"); setV(""); return;
      }
    }
    setErr("wrong"); setV("");
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4 lc-fade-in">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden lc-scale-in">
        <div className="px-6 pt-8 pb-5 text-center border-b border-stone-100">
          <img src={LUCENTIA_LOGO} alt="Lucentia" className="h-11 w-auto mx-auto lc-pop-in" />
          <div className="text-xs text-stone-400 mt-2">Gestionale per centri estetici e parrucchieri</div>
          {branding.name ? <div className="text-xs text-stone-300 mt-0.5">per {branding.name}</div> : null}
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-600 mb-1"><Lock size={15} className="brand-accent" /> Accesso operatori</div>
          <p className="text-xs text-stone-400 mb-4">Inserisci il codice di accesso per usare il gestionale.</p>
          <input type="password" value={v} autoFocus onChange={(e) => { setV(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Codice di accesso" className={`w-full text-center tracking-widest text-lg px-3 py-2.5 rounded-lg border brand-ring ${err ? "border-red-400 bg-red-50" : "border-stone-300"}`} />
          {err === "wrong" ? <p className="text-xs text-red-500 mt-2 text-center">Codice non valido.</p> : null}
          {err === "expired" ? <p className="text-xs text-red-500 mt-2 text-center flex items-center justify-center gap-1"><AlertTriangle size={13} /> Licenza scaduta. Contatta il rivenditore per il rinnovo.</p> : null}
          <button onClick={submit} className="mt-4 w-full brand-bg font-medium py-2.5 rounded-lg transition">Entra</button>
        </div>
        <div className="px-6 pb-5 pt-1 text-center border-t border-stone-100">
          <div className="text-[10px] uppercase tracking-widest text-stone-300 mb-1.5 mt-3">Realizzato da</div>
          <img src={MAKER_LOGO} alt="Office Solution" className="h-7 w-auto mx-auto opacity-80" />
          <p className="text-[11px] text-stone-300 mt-3 select-none tracking-wide">V {APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
}
