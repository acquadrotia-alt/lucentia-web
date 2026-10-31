import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Sparkles, Calendar, Mail, Lock, Settings, Users, Phone, MapPin, Gift, LogOut, ShieldCheck, AlertTriangle, ShoppingBag, AlertCircle, BarChart3, MessageCircle } from "lucide-react";
import { setBrandTab } from "../../favicon.js";
import { APP_VERSION, RESELLER_CODE, uid, pad, todayStr, BRANDING, DEFAULT_CONFIG, DEFAULT_CATALOG, loadKey, saveKey, apiLoad, apiSaveVerificato, apiSave, apiSaveDebounced, loadLicense, saveLicense, licenseState, licenseOk, themeVars, eventiImpegni, buildDemoData, buildSampleData, BRAND_CSS, flagsFromModuli, ModsCtx, planName, LUCENTIA_LOGO, MAKER_LOGO } from "./comuni.jsx";
import { BACKUP_KEY, backupPayload, saveDirHandle, loadDirHandle, clearDirHandle, writeBackupToDir } from "./backup.js";
import { AgendaPage } from "./agenda.jsx";
import { ClientsView } from "./clienti.jsx";
import { GiftCardsView } from "./buoni.jsx";
import { ShopView } from "./cassa.jsx";
import { StatsView } from "./statistiche.jsx";
import { MarketingView } from "./marketing.jsx";
import { SettingsView } from "./impostazioni.jsx";
import { ESTENSIONI } from "../../cliente/index.jsx";

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
  const [onlineBk, setOnlineBk] = useState([]); // prenotazioni online ricevute (overlay, sola lettura)
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  const [license, setLicense] = useState(() => loadLicense()); // licenza: resta in locale, invariata
  const [session, setSession] = useState({ role: "operator", hidePartial: false }); // login gestito dal contenitore (server)
  const [view, setView] = useState("agenda");
  const enabledSections = ["agenda", "clienti", "buoni", ...(flags.vendite ? ["shop"] : []), ...(flags.statistiche ? ["stats"] : []), ...(flags.marketing ? ["marketing"] : []), ...visteExtra.map((v) => v.id), "settings"];
  useEffect(() => { if (!enabledSections.includes(view)) setView("agenda"); }, [moduli, view]);
  const impegni = useMemo(() => eventiImpegni(eventi), [eventi]);
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
  useEffect(() => { if (demoRef.current || !loadedRef.current) return; apiSaveDebounced("clients", clients); }, [clients]);
  useEffect(() => { if (demoRef.current || !loadedRef.current) return; apiSaveDebounced("catalog", catalog); }, [catalog]);
  useEffect(() => { if (demoRef.current || !loadedRef.current) return; apiSaveDebounced("sales", sales); }, [sales]);
  useEffect(() => { if (demoRef.current || !loadedRef.current) return; apiSaveDebounced("vouchers", vouchers); }, [vouchers]);
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
  dataRef.current = { config, bookings, clients, catalog, sales, eventi };
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
      if (hhmm >= bkc.time) { try { await writeBackupToDir(h, backupPayload(d.config, d.bookings, d.clients, d.catalog, d.sales, d.eventi)); const info = { date: today, at: Date.now() }; saveKey(BACKUP_KEY, info); setLastBackup(info); } catch (e) {} }
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
  useEffect(() => { setBrandTab(b.logo, b.name ? `${b.name} · ${modalita === "cliente" ? "Gestionale" : "Lucentia"}` : undefined); }, [b.logo, b.name, modalita]);
  const pickBackupDir = async () => {
    if (!window.showDirectoryPicker) { alert("La scelta della cartella non è supportata in questo ambiente. Su Windows funziona; altrimenti usa \"Esporta backup\"."); return; }
    try { const h = await window.showDirectoryPicker({ mode: "readwrite", id: "lucentia-backup" }); await saveDirHandle(h); setBackupDir(h); setBackupDirName(h.name || "cartella"); } catch (e) {}
  };
  const backupNow = async () => {
    const h = backupDirRef.current; if (!h) { alert("Scegli prima una cartella di destinazione."); return; }
    try { await writeBackupToDir(h, backupPayload(config, bookings, clients, catalog, sales, eventi)); const info = { date: todayStr(), at: Date.now() }; saveKey(BACKUP_KEY, info); setLastBackup(info); alert("Backup salvato nella cartella scelta."); } catch (e) { alert("Backup non riuscito: permesso negato o cartella non disponibile. Riprova."); }
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
  const ALL_NAV = [["agenda", "Agenda", Calendar], ["clienti", "Clienti", Users], ["buoni", "Buoni", Gift], ["shop", "Vendite", ShoppingBag], ["stats", "Statistiche", BarChart3], ["marketing", "Marketing", MessageCircle], ...visteExtra.map((v) => [v.id, v.label || v.id, v.icon || Sparkles]), ["settings", "Impostazioni", Settings]];
  const vistaExtra = visteExtra.find((v) => v.id === view);
  const propsEstensione = { config, saveConfig, bookings, setBookings, clients, setClients, catalog, setCatalog, sales, setSales, vouchers, setVouchers, eventi, setEventi, azienda, demo: isDemo };
  const canAddVoucher = !isDemo || vouchers.filter((v) => !v.seed).length < 5;
  const NAV = ALL_NAV.filter((x) => enabledSections.includes(x[0]));
  const canAddClient = !isDemo || clients.filter((c) => !c.seed).length < 2;
  const canAddBooking = !isDemo || bookings.filter((b) => !b.seed).length < 20;

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
          <nav className="flex items-center gap-0.5 shrink-0">
            {NAV.map((item) => { const k = item[0], label = item[1], Icon = item[2]; return (
              <button key={k} onClick={() => setView(k)} aria-current={view === k ? "page" : undefined} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition ${view === k ? "brand-soft brand-text" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"}`}>
                <Icon size={16} /><span className="hidden lg:inline">{label}</span>
              </button>
            ); })}
            {session.role === "reseller" ? <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium bg-stone-800 text-white px-2 py-1 rounded-lg ml-1"><ShieldCheck size={13} /> Rivenditore</span> : null}
            {isDemo ? <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-500 text-white px-2 py-1 rounded-lg ml-1"><Sparkles size={13} /> Demo</span> : null}
            <button onClick={onLogout} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-100 ml-1" title="Esci"><LogOut size={16} /><span className="hidden lg:inline">Esci</span></button>
          </nav>
        </div>
        {operatorWarn ? <div className="bg-amber-50 border-t border-amber-200 text-amber-700 text-xs text-center py-1.5 flex items-center justify-center gap-1.5"><AlertTriangle size={13} /> Licenza in scadenza tra {ls.days} giorn{ls.days === 1 ? "o" : "i"}. Contatta il rivenditore per il rinnovo.</div> : null}
      </header>

      <main key={view} className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 lc-fade-up">
        {view === "agenda" && <AgendaPage config={config} bookings={bookings} setBookings={setBookings} clients={clients} setClients={setClients} sales={sales} catalog={catalog} hidePartial={session.hidePartial} canAddBooking={canAddBooking} canAddClient={canAddClient} onlineBk={flags.online ? onlineBk : []} onImportOnline={importOnline} onCancelOnline={cancelOnline} canManageOnline={session.role !== "operator"} eventi={eventi} setEventi={setEventi} impegniEventi={impegni} aziendaId={azienda && azienda.id} />}
        {view === "clienti" && <ClientsView config={config} bookings={bookings} clients={clients} setClients={setClients} sales={sales} catalog={catalog} vouchers={vouchers} setVouchers={setVouchers} />}
        {view === "buoni" && <GiftCardsView config={config} vouchers={vouchers} setVouchers={setVouchers} clients={clients} canAddVoucher={canAddVoucher} />}
        {view === "shop" && <ShopView catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} clients={clients} setClients={setClients} branding={b} loyalty={config.loyalty} hidePartial={session.hidePartial} canAddClient={canAddClient} demo={isDemo} />}
        {view === "stats" && <StatsView config={config} bookings={bookings} clients={clients} sales={sales} catalog={catalog} vouchers={vouchers} />}
        {view === "marketing" && <MarketingView config={config} saveConfig={saveConfig} bookings={bookings} clients={clients} sales={sales} catalog={catalog} />}
        {vistaExtra ? <vistaExtra.componente {...propsEstensione} /> : null}
        {view === "settings" && (isDemo ? (
          <div>
            <div className="mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" /> In versione demo le impostazioni sono <b>visibili ma non modificabili</b>.</div>
            <fieldset disabled style={{ border: 0, margin: 0, padding: 0, minInlineSize: "auto" }}>
              <SettingsView config={config} saveConfig={saveConfig} bookings={bookings} setBookings={setBookings} clients={clients} setClients={setClients} catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} eventi={eventi} setEventi={setEventi} session={session} online={flags.online} aziendaId={azienda && azienda.id} license={license} onSaveLicense={updateLicense} backupDirName={backupDirName} onPickBackupDir={pickBackupDir} onClearBackupDir={clearBackupDir} onBackupNow={backupNow} lastBackup={lastBackup} licenza={{ plan: planName(moduli), scadenza: azienda && azienda.licenza_scadenza }} modalita={modalita} installazione={installazione} azienda={azienda} />
            </fieldset>
          </div>
        ) : (
          <SettingsView config={config} saveConfig={saveConfig} bookings={bookings} setBookings={setBookings} clients={clients} setClients={setClients} catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} eventi={eventi} setEventi={setEventi} session={session} online={flags.online} aziendaId={azienda && azienda.id} license={license} onSaveLicense={updateLicense} backupDirName={backupDirName} onPickBackupDir={pickBackupDir} onClearBackupDir={clearBackupDir} onBackupNow={backupNow} lastBackup={lastBackup} licenza={{ plan: planName(moduli), scadenza: azienda && azienda.licenza_scadenza }} modalita={modalita} installazione={installazione} azienda={azienda} />
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
