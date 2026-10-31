import { useState, useEffect, useRef } from "react";
import { Sparkles, User, Mail, Plus, Trash2, Check, X, Users, CalendarPlus, Image as ImageIcon, Palette, Store, Star, RefreshCw, Printer, Download, Upload, KeyRound, CalendarX2, AlertTriangle, BadgeCheck, Boxes, Layers, AlertCircle, CalendarRange, ChevronUp, ChevronDown, FolderOpen, Globe, Instagram, Facebook, DoorOpen } from "lucide-react";
import { operatoriDelServizio } from "../../orari.js";
import { AvatarSvg, AVATAR_IDS, avatarIdFor } from "../../avatars.jsx";
import { RESELLER_CODE, uid, minToStr, strToMin, todayStr, DAYS, fmtDate, fmtFullDate, DEFAULT_LOYALTY, DEFAULT_CONFIG, BLANK_BRANDING, PRESETS, DEFAULT_CATALOG, makeLicense, licenseState, fileToResizedDataURL, fileToCoverDataURL, loyaltyConfig, clientPoints, buildSampleData, useMods, LUCENTIA_LOGO, MAKER_LOGO, Field } from "./comuni.jsx";
import { printPriceList } from "./stampa.jsx";
import { exportBackup } from "./backup.js";
import { ESTENSIONI } from "../../cliente/index.jsx";

export function LicensePanel({ license, onSave }) {
  const st = licenseState(license);
  const [code, setCode] = useState(license && license.code ? license.code : "");
  const [unlimited, setUnlimited] = useState(license ? !!license.code && license.expiry == null : false);
  const [months, setMonths] = useState(license && license.months ? license.months : 12);
  const [saved, setSaved] = useState(false);
  const gen = () => {
    const c = code.trim(); if (!c) return;
    onSave(makeLicense(c, unlimited ? 0 : months));
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  let banner = null;
  if (st.state === "none") banner = <div className="bg-stone-50 text-stone-500 rounded-lg px-3 py-2 text-sm">Nessuna licenza cliente configurata. Imposta un codice e una durata, poi consegna il codice al cliente.</div>;
  else if (st.state === "tampered") banner = <div className="bg-red-50 text-red-600 rounded-lg px-3 py-2 text-sm flex items-center gap-1.5"><AlertTriangle size={15} /> Licenza non valida o manomessa. Rigenerala.</div>;
  else if (st.state === "expired") banner = <div className="bg-red-50 text-red-600 rounded-lg px-3 py-2 text-sm flex items-center gap-1.5"><CalendarX2 size={15} /> Scaduta il {fmtFullDate(st.expiry)}. Genera una nuova licenza per riattivare l'accesso.</div>;
  else if (st.unlimited) banner = <div className="bg-green-50 text-green-700 rounded-lg px-3 py-2 text-sm flex items-center gap-1.5"><BadgeCheck size={15} /> Licenza attiva — senza scadenza.</div>;
  else banner = <div className={`rounded-lg px-3 py-2 text-sm flex items-center gap-1.5 ${st.days <= 30 ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}><BadgeCheck size={15} /> Attiva fino al {fmtFullDate(st.expiry)} · {st.days} giorni rimanenti.</div>;

  return (
    <section className="bg-white rounded-2xl border-2 brand-border p-5 shadow-sm">
      <h3 className="font-semibold flex items-center gap-2 mb-1"><KeyRound size={16} className="brand-accent" /> Licenza cliente <span className="text-xs font-normal text-stone-400">(solo rivenditore)</span></h3>
      <p className="text-xs text-stone-400 mb-3">Sezione visibile solo con il codice rivenditore <span className="font-semibold">{RESELLER_CODE}</span>. Il cliente non la vede e non può rinnovarsi da solo.</p>
      <div className="mb-4">{banner}</div>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <Field label="Codice cliente"><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="es. 1234" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm tracking-widest brand-ring" /></Field>
        <Field label="Durata (mesi)"><input type="number" min={1} step={1} value={months} disabled={unlimited} onChange={(e) => setMonths(Math.max(1, Number(e.target.value) || 1))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring disabled:opacity-50 disabled:cursor-not-allowed" /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-600 mb-4 cursor-pointer"><input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} /> Senza scadenza (licenza illimitata)</label>
      <div className="flex items-center gap-3 flex-wrap">
        <button disabled={!code.trim()} onClick={gen} className="brand-bg disabled:opacity-40 disabled:cursor-not-allowed font-medium px-4 py-2.5 rounded-lg transition inline-flex items-center gap-2"><KeyRound size={16} /> {st.state === "none" ? "Genera licenza" : "Rigenera / rinnova"}</button>
        {saved ? <span className="text-sm text-green-600 inline-flex items-center gap-1"><Check size={15} /> Salvata.</span> : null}
      </div>
      <p className="text-xs text-stone-400 mt-4 leading-relaxed">Alla scadenza il cliente non potrà più accedere finché non generi una nuova licenza da qui. Il rinnovo riparte da oggi.<br />Accesso ridotto: il cliente può entrare col proprio codice seguito da <span className="font-medium text-stone-500">01</span> (es. codice 1234 → 123401) per usare il gestionale senza vedere le vendite e gli appuntamenti segnati come "parziale".</p>
    </section>
  );
}
export function BookingLinkCard({ aziendaId, config, saveConfig, cliente = false }) {
  const ob = config.onlineBooking || {};
  // Sul dominio del salone il link è semplicemente /prenota; sul portale
  // resta il link col codice dell'attività.
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}${cliente ? "/prenota" : `/?prenota=${aziendaId}`}`;
  const [copied, setCopied] = useState(false);
  const save = (patch) => saveConfig({ ...config, onlineBooking: { ...ob, ...patch } });
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) {} };
  return (
    <section className="lc-card p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-1 text-stone-900 tracking-tight"><CalendarPlus size={16} className="brand-accent" /> Prenotazioni online</h3>
      <p className="text-sm text-stone-500 mb-3">Condividi questo link con i clienti (sito, Google, Instagram, WhatsApp): potranno prenotare da soli.</p>
      <div className="flex items-center gap-2 border border-stone-200 rounded-lg px-3 py-2 bg-stone-50">
        <input readOnly value={url} onFocus={(e) => e.target.select()} className="flex-1 text-sm bg-transparent focus:outline-none text-stone-600 truncate" />
        <button onClick={copy} className="text-xs font-medium brand-bg px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 shrink-0">{copied ? <><Check size={13} /> Copiato</> : "Copia"}</button>
        <a href={url} target="_blank" rel="noreferrer" className="text-xs font-medium border border-stone-300 text-stone-600 px-2.5 py-1.5 rounded-lg hover:bg-white shrink-0">Apri</a>
      </div>
      <div className="mt-4">
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wide block mb-1.5">Come proporre gli orari</span>
        <div className="grid sm:grid-cols-3 gap-2">
          {[["antivuoto", "Anti-vuoto", "Orari consecutivi: partono dall'apertura e si incastrano dopo gli appuntamenti. Niente buchi in agenda."], ["griglia", "A griglia", "Orari liberi a intervalli fissi: il cliente sceglie l'ora che preferisce. Più libertà, può lasciare qualche buco."], ["ottimizzata", "Disponibilità ottimizzata", "Evita i buchi inutilizzabili: propone gli orari che tengono la giornata compatta, misurati sulle durate dei servizi prenotabili online."]].map(([val, title, desc]) => { const on = (ob.mode || "antivuoto") === val; return (
            <button key={val} type="button" onClick={() => save({ mode: val })} className="text-left rounded-xl border p-3 transition" style={on ? { borderColor: "var(--brand)", background: "var(--brand-soft)" } : { borderColor: "#e7e5e4" }}>
              <div className="text-sm font-medium text-stone-900 flex items-center gap-1.5">{on ? <Check size={14} className="brand-accent" /> : null} {title}</div>
              <div className="text-[11px] text-stone-500 mt-1 leading-relaxed">{desc}</div>
            </button>
          ); })}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <label className="text-sm block"><span className="text-xs font-medium text-stone-400 uppercase tracking-wide block mb-1">Preavviso minimo</span>
          <select value={ob.leadHours != null ? ob.leadHours : 2} onChange={(e) => save({ leadHours: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring">{[0, 1, 2, 4, 12, 24, 48].map((h) => <option key={h} value={h}>{h === 0 ? "Nessuno" : `${h} or${h === 1 ? "a" : "e"}`}</option>)}</select>
        </label>
        <label className="text-sm block"><span className="text-xs font-medium text-stone-400 uppercase tracking-wide block mb-1">Giorni prenotabili in avanti</span>
          <select value={ob.horizonDays || 30} onChange={(e) => save({ horizonDays: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring">{[7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>{d} giorni</option>)}</select>
        </label>
      </div>
      <label className="flex items-center gap-2.5 mt-4 cursor-pointer">
        <input type="checkbox" checked={!ob.paused} onChange={(e) => save({ paused: !e.target.checked })} style={{ accentColor: "var(--brand)" }} className="w-4 h-4" />
        <span className="text-sm text-stone-700">Prenotazioni online attive {ob.paused ? <span className="text-amber-600 text-xs font-medium">· attualmente sospese</span> : null}</span>
      </label>
    </section>
  );
}

// Personalizzazione del mini-sito pubblico (il link di prenotazione è una
// pagina web dell'attività: descrizione, copertina, orari, social, sezioni).
export function SitoWebCard({ config, saveConfig, cliente = false }) {
  const sito = config.sito || {};
  const save = (patch) => saveConfig({ ...config, sito: { ...sito, ...patch } });
  const [caricando, setCaricando] = useState(false);
  const onCover = async (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    setCaricando(true);
    try { save({ copertina: await fileToCoverDataURL(file, 1600) }); } catch (err) { alert("Impossibile caricare l'immagine."); }
    setCaricando(false); e.target.value = "";
  };
  const sezioni = Array.isArray(sito.sezioni) ? sito.sezioni : [];
  const addSezione = () => save({ sezioni: [...sezioni, { id: uid(), titolo: "", testo: "" }] });
  const editSezione = (id, patch) => save({ sezioni: sezioni.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const delSezione = (id) => save({ sezioni: sezioni.filter((s) => s.id !== id) });
  return (
    <section className="lc-card p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-1 text-stone-900 tracking-tight"><Globe size={16} className="brand-accent" /> {cliente ? "Contenuti del tuo sito" : "Il tuo mini-sito"}</h3>
      <p className="text-sm text-stone-500 mb-4">{cliente ? "Il sito sul tuo dominio si aggiorna da qui: copertina, presentazione, orari, social e sezioni personalizzate. Servizi, operatori ed eventi futuri compaiono da soli." : "Il link di prenotazione è una vera pagina web della tua attività: qui personalizzi copertina, presentazione, orari, social e contenuti. Gli eventi futuri compaiono da soli."}</p>

      <div className="space-y-4">
        <div>
          <span className="text-xs font-medium text-stone-400 uppercase tracking-wide block mb-1.5">Foto di copertina</span>
          {sito.copertina ? (
            <div className="relative rounded-xl overflow-hidden border border-stone-200">
              <img src={sito.copertina} alt="Copertina del mini-sito" className="w-full h-36 object-cover" />
              <button type="button" onClick={() => save({ copertina: null })} className="absolute top-2 right-2 bg-white/90 text-stone-600 rounded-lg p-1.5 shadow-sm hover:text-red-500" title="Rimuovi copertina"><Trash2 size={15} /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-stone-200 rounded-xl py-5 text-sm text-stone-400 cursor-pointer hover:border-stone-300 hover:text-stone-500 transition">
              <ImageIcon size={16} /> {caricando ? "Caricamento…" : "Carica una foto orizzontale del tuo salone"}
              <input type="file" accept="image/*" className="hidden" onChange={onCover} />
            </label>
          )}
        </div>

        <label className="text-sm block"><span className="text-xs font-medium text-stone-400 uppercase tracking-wide block mb-1">Presentazione dell'attività</span>
          <textarea value={sito.descrizione || ""} onChange={(e) => save({ descrizione: e.target.value })} rows={2} placeholder="Es. Dal 1998 ci prendiamo cura dei tuoi capelli nel cuore di Oleggio…" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
        </label>

        <label className="text-sm block"><span className="text-xs font-medium text-stone-400 uppercase tracking-wide block mb-1">Orari di apertura <span className="normal-case text-stone-300">· una riga per giorno</span></span>
          <textarea value={sito.orari || ""} onChange={(e) => save({ orari: e.target.value })} rows={3} placeholder={"Mar–Ven · 9:00–18:00\nSabato · 8:30–17:00\nLunedì e Domenica · chiuso"} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
        </label>

        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-sm block"><span className="text-xs font-medium text-stone-400 uppercase tracking-wide block mb-1 flex items-center gap-1"><Instagram size={12} /> Instagram</span>
            <input value={sito.instagram || ""} onChange={(e) => save({ instagram: e.target.value })} placeholder="@iltuosalone" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
          </label>
          <label className="text-sm block"><span className="text-xs font-medium text-stone-400 uppercase tracking-wide block mb-1 flex items-center gap-1"><Facebook size={12} /> Facebook</span>
            <input value={sito.facebook || ""} onChange={(e) => save({ facebook: e.target.value })} placeholder="nomepagina" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
          </label>
          <label className="text-sm block"><span className="text-xs font-medium text-stone-400 uppercase tracking-wide block mb-1 flex items-center gap-1"><Globe size={12} /> Sito web</span>
            <input value={sito.sitoWeb || ""} onChange={(e) => save({ sitoWeb: e.target.value })} placeholder="www.iltuosalone.it" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">Sezioni personalizzate <span className="normal-case text-stone-300">· es. «Chi siamo», «I nostri servizi», «Promozioni»</span></span>
            <button type="button" onClick={addSezione} className="text-xs font-medium brand-accent inline-flex items-center gap-1 hover:underline"><Plus size={13} /> Aggiungi</button>
          </div>
          {sezioni.length === 0 ? <p className="text-xs text-stone-300">Nessuna sezione: aggiungi i contenuti che vuoi mostrare {cliente ? "nella home del sito" : "nella pagina «Info» del mini-sito"}.</p> : (
            <div className="space-y-2">{sezioni.map((s) => (
              <div key={s.id} className="rounded-xl border border-stone-200 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input value={s.titolo} onChange={(e) => editSezione(s.id, { titolo: e.target.value })} placeholder="Titolo sezione" className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
                  <button type="button" onClick={() => delSezione(s.id)} className="p-2 text-stone-400 hover:text-red-500 shrink-0"><Trash2 size={15} /></button>
                </div>
                <textarea value={s.testo} onChange={(e) => editSezione(s.id, { testo: e.target.value })} rows={2} placeholder="Testo della sezione" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
              </div>
            ))}</div>
          )}
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={sito.mostraEventi !== false} onChange={(e) => save({ mostraEventi: e.target.checked })} style={{ accentColor: "var(--brand)" }} className="w-4 h-4" />
          <span className="text-sm text-stone-700">Mostra gli eventi futuri sul {cliente ? "sito" : "mini-sito"}</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={sito.mostraCatalogo === true} onChange={(e) => save({ mostraCatalogo: e.target.checked })} style={{ accentColor: "var(--brand)" }} className="w-4 h-4" />
          <span className="text-sm text-stone-700">Mostra il catalogo prodotti sul {cliente ? "sito" : "mini-sito"} <span className="text-xs text-stone-400">· nomi, formati e prezzi di listino (mai le giacenze)</span></span>
        </label>
      </div>
    </section>
  );
}

export function SettingsView({ config, saveConfig, bookings, setBookings, clients, setClients, catalog, setCatalog, sales, setSales, eventi, setEventi, session, online, aziendaId, license, onSaveLicense, backupDirName, onPickBackupDir, onClearBackupDir, onBackupNow, lastBackup, licenza, modalita = "hub", installazione = null, azienda = null }) {
  const cliente = modalita === "cliente";
  // Sezioni su misura del cliente (src/cliente/index.jsx), filtrate sui moduli accesi.
  const sezioniExtra = (ESTENSIONI.impostazioni || []).filter((s) => s && s.id && s.componente && (!s.modulo || F.has(s.modulo)));
  const F = useMods();
  const services = config.services, staff = config.staff, branding = config.branding;
  const isReseller = session && session.role === "reseller";
  const [seqAperta, setSeqAperta] = useState(null);
  // Le voci del menù laterale. Quelle legate a un modulo compaiono solo se
  // il modulo è attivo, così non si aprono sezioni vuote.
  const SEZIONI = [
    { id: "attivita", label: "Attività", icon: Store },
    { id: "servizi", label: "Servizi", icon: Sparkles },
    { id: "risorse", label: "Operatori e cabine", icon: Users },
    // Su un'installazione cliente il sito esiste sempre (è il suo dominio):
    // la sezione resta, con le prenotazioni online solo se il modulo è acceso.
    ...(cliente && aziendaId ? [{ id: "online", label: "Sito e prenotazioni", icon: Globe }] : (online && aziendaId ? [{ id: "online", label: "Prenotazioni online", icon: CalendarPlus }] : [])),
    ...sezioniExtra.map((s) => ({ id: s.id, label: s.label || s.id, icon: s.icon || Sparkles })),
    { id: "dati", label: "Dati e backup", icon: Download },
    { id: "licenza", label: "Licenza", icon: BadgeCheck },
  ];
  const [sezione, setSezione] = useState("attivita");
  const menuRef = useRef(null);
  // Cambiando sezione si resterebbe a metà pagina, con davanti uno spazio
  // vuoto: la vista torna in cima al menù. Sul desktop la colonna è fissa e
  // non serve, quindi si muove solo quando il menù è sopra il contenuto.
  const vaiA = (id) => {
    setSezione(id);
    if (typeof window === "undefined" || window.innerWidth >= 1024) return;
    const el = menuRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const updServices = (next) => saveConfig({ ...config, services: next });
  const updStaff = (next) => saveConfig({ ...config, staff: next });
  const updBranding = (patch) => saveConfig({ ...config, branding: { ...branding, ...patch } });
  const addService = () => updServices([...services, { id: uid(), name: "Nuovo servizio", durationMin: 30 }]);
  const editService = (id, patch) => updServices(services.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  // Un solo saveConfig: due chiamate di fila partirebbero entrambe dallo stesso
  // config e la seconda rimetterebbe la lista servizi di prima, annullando la
  // cancellazione.
  const delService = (id) => saveConfig({
    ...config,
    services: services.filter((s) => s.id !== id),
    // il vecchio legame va comunque ripulito, per i saloni non ancora aggiornati
    staff: staff.map((st) => (Array.isArray(st.serviceIds) ? { ...st, serviceIds: st.serviceIds.filter((x) => x !== id) } : st)),
  });
  const cabine = config.cabine || [];
  const updCabine = (next) => saveConfig({ ...config, cabine: next });
  const addCabina = () => updCabine([...cabine, { id: uid(), name: "Nuova cabina", quantita: 1, availability: {}, off: [] }]);
  const editCabina = (id, patch) => updCabine(cabine.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  // Togliendo una cabina vanno ripuliti i riferimenti, altrimenti resterebbero
  // servizi e operatori legati a una cabina che non esiste più.
  const delCabina = (id) => saveConfig({
    ...config,
    cabine: cabine.filter((c) => c.id !== id),
    staff: staff.map((st) => (st.cabinaId === id ? { ...st, cabinaId: null } : st)),
    services: services.map((sv) => {
      const imp = Array.isArray(sv.impegni) ? sv.impegni.map((x) => (x.cabinaId === id ? { ...x, cabinaId: null } : x)) : sv.impegni;
      return { ...sv, cabinaId: sv.cabinaId === id ? null : sv.cabinaId, ...(imp ? { impegni: imp } : {}) };
    }),
  });
  const addStaff = () => updStaff([...staff, { id: uid(), name: "Nuovo operatore", role: "", availability: {} }]);
  const editStaff = (id, patch) => updStaff(staff.map((st) => (st.id === id ? { ...st, ...patch } : st)));
  // Togliendo un operatore va tolto anche dalle liste dei servizi e delle fasi,
  // altrimenti resterebbero abilitazioni verso una persona che non c'è più.
  const delStaff = (id) => saveConfig({
    ...config,
    staff: staff.filter((st) => st.id !== id),
    services: services.map((sv) => {
      const senza = (l) => (Array.isArray(l) ? l.filter((x) => x !== id) : l);
      const imp = Array.isArray(sv.impegni) ? sv.impegni.map((x) => ({ ...x, ...(Array.isArray(x.operatori) ? { operatori: senza(x.operatori) } : {}) })) : sv.impegni;
      return { ...sv, ...(Array.isArray(sv.operatori) ? { operatori: senza(sv.operatori) } : {}), ...(imp ? { impegni: imp } : {}) };
    }),
  });
  const onLogo = async (e) => { const file = e.target.files && e.target.files[0]; if (!file) return; try { const url = await fileToResizedDataURL(file, 256); updBranding({ logo: url }); } catch (err) { alert("Impossibile caricare l'immagine."); } e.target.value = ""; };
  const reset = () => { if (confirm("Caricare i dati di esempio (clienti, appuntamenti e vendite di prova)? I dati attuali verranno sostituiti. La licenza non viene toccata.")) { const s = buildSampleData(); saveConfig(DEFAULT_CONFIG); setClients(s.clients); setBookings(s.bookings); setSales(s.sales); setCatalog(DEFAULT_CATALOG); alert("Dati di esempio caricati."); } };
  const azzeraGiacenze = () => { if (confirm("Azzerare TUTTE le giacenze a 0? Prodotti, formati e prezzi restano invariati: solo le quantità in magazzino verranno messe a zero. L'operazione non è reversibile.")) { setCatalog({ ...catalog, products: catalog.products.map((p) => ({ ...p, formats: p.formats.map((f) => ({ ...f, stock: 0 })) })) }); alert("Giacenze azzerate."); } };
  const importBackup = async (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    try { const text = await file.text(); const d = JSON.parse(text); if (d.config) saveConfig({ ...DEFAULT_CONFIG, ...d.config }); if (Array.isArray(d.bookings)) setBookings(d.bookings); if (Array.isArray(d.clients)) setClients(d.clients); if (d.catalog && Array.isArray(d.catalog.products)) setCatalog(d.catalog); if (Array.isArray(d.sales)) setSales(d.sales); if (Array.isArray(d.eventi)) setEventi(d.eventi); alert("Backup importato."); } catch (err) { alert("File di backup non valido."); }
    e.target.value = "";
  };
  const azzeraTutto = () => { if (confirm("Azzerare COMPLETAMENTE la configurazione (servizi, operatori, clienti, appuntamenti, catalogo, vendite e dati dell'attività)? Da usare per preparare una nuova installazione cliente. Operazione non reversibile.")) { saveConfig({ ...DEFAULT_CONFIG, services: [], staff: [], branding: BLANK_BRANDING, loyalty: DEFAULT_LOYALTY }); setBookings([]); setClients([]); setCatalog({ categories: [], products: [] }); setSales([]); setEventi([]); alert("Configurazione azzerata. Puoi impostare il salone da zero."); } };
  const loyalty = loyaltyConfig(config);
  const updLoyalty = (patch) => saveConfig({ ...config, loyalty: { ...loyalty, ...patch } });
  const addReward = () => updLoyalty({ rewards: [...loyalty.rewards, { id: uid(), points: 5, label: "Nuovo premio" }] });
  const editReward = (id, patch) => updLoyalty({ rewards: loyalty.rewards.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const delReward = (id) => updLoyalty({ rewards: loyalty.rewards.filter((r) => r.id !== id) });
  const [editAspect, setEditAspect] = useState(false);
  const closures = config.closures || [];
  const [clFrom, setClFrom] = useState("");
  const [clTo, setClTo] = useState("");
  const [clLabel, setClLabel] = useState("");
  const addClosure = () => { if (!clFrom) return; const to = clTo || clFrom; const from = clFrom; saveConfig({ ...config, closures: [...closures, { id: uid(), from: from <= to ? from : to, to: from <= to ? to : from, label: clLabel.trim() }] }); setClFrom(""); setClTo(""); setClLabel(""); };
  const delClosure = (id) => saveConfig({ ...config, closures: closures.filter((c) => c.id !== id) });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap"><h2 className="text-xl font-semibold tracking-tight text-stone-900">Impostazioni</h2>{isReseller ? <div className="flex items-center gap-2"><button onClick={reset} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"><RefreshCw size={14} /> Ripristina demo</button><button onClick={azzeraTutto} className="flex items-center gap-1.5 text-sm text-red-600 border border-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-50"><AlertTriangle size={14} /> Azzera tutto</button></div> : null}</div>

      {/* Menù di sezione: colonna a sinistra da tablet in su, striscia
          scorrevole sul telefono, dove una colonna mangerebbe mezzo schermo. */}
      <div className="lg:grid lg:grid-cols-[13.5rem_1fr] lg:gap-6 lg:items-start">
        <nav ref={menuRef} aria-label="Sezioni delle impostazioni" className="lg:sticky lg:top-4 mb-4 lg:mb-0 scroll-mt-4">
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 lg:mx-0 lg:px-0">
            {SEZIONI.map((s) => {
              const on = s.id === sezione;
              return (
                <button key={s.id} onClick={() => vaiA(s.id)} aria-current={on ? "page" : undefined}
                  className={`shrink-0 lg:w-full flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg whitespace-nowrap transition text-left ${on ? "lc-navpill-active" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"}`}>
                  <s.icon size={16} className="shrink-0" /> {s.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="space-y-6 min-w-0">
          {sezione === "attivita" ? <>
        <section className="lc-card p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold flex items-center gap-2"><Store size={16} className="brand-accent" /> Attività e aspetto</h3><button onClick={() => setEditAspect((e) => !e)} className="text-sm brand-accent border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50">{editAspect ? "Chiudi" : "Modifica"}</button></div>
          {!editAspect ? (
            <div className="flex items-center gap-3 text-sm text-stone-500">{branding.logo ? <img src={branding.logo} alt="logo" className="w-10 h-10 rounded-xl object-cover border border-stone-200" /> : <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-300"><ImageIcon size={18} /></div>}<span className="font-medium text-stone-700">{branding.name || "—"}</span>{branding.tagline ? <span className="text-stone-400">· {branding.tagline}</span> : null}</div>
          ) : (
          <>
          <div className="flex items-start gap-4 mb-5">
            <div className="shrink-0">{branding.logo ? <img src={branding.logo} alt="logo" className="w-20 h-20 rounded-2xl object-cover border border-stone-200" /> : <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-300"><ImageIcon size={26} /></div>}</div>
            <div className="flex-1">
              <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Logo</div>
              <div className="flex gap-2"><label className="cursor-pointer text-sm brand-bg px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"><ImageIcon size={15} /> Carica<input type="file" accept="image/*" onChange={onLogo} className="hidden" /></label>{branding.logo ? <button onClick={() => updBranding({ logo: null })} className="text-sm text-stone-500 hover:text-red-500 px-3 py-1.5 rounded-lg border border-stone-200">Rimuovi</button> : null}</div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            <Field label="Nome attività"><input value={branding.name} onChange={(e) => updBranding({ name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            <Field label="Sottotitolo"><input value={branding.tagline} onChange={(e) => updBranding({ tagline: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            <Field label="Telefono"><input value={branding.phone} onChange={(e) => updBranding({ phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            <Field label="Email"><input value={branding.email} onChange={(e) => updBranding({ email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            <Field label="Indirizzo"><input value={branding.address} onChange={(e) => updBranding({ address: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          </div>
          <div>
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Palette size={13} /> Colore principale</div>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESETS.map((c) => <button key={c} onClick={() => updBranding({ primary: c })} className={`w-9 h-9 rounded-full transition ${branding.primary.toLowerCase() === c ? "ring-2 ring-offset-2 ring-stone-400" : ""}`} style={{ background: c }} aria-label={c} />)}
              <label className="w-9 h-9 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center cursor-pointer overflow-hidden relative" title="Colore personalizzato"><Plus size={16} className="text-stone-400" /><input type="color" value={branding.primary} onChange={(e) => updBranding({ primary: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" /></label>
            </div>
          </div>
          </>
          )}
        </section>

        <section className="lc-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><CalendarRange size={16} className="brand-accent" /> Chiusure salone (ferie / festività)</h3>
          {closures.length > 0 ? (
            <div className="space-y-2 mb-4">{closures.slice().sort((a, b) => (a.from > b.from ? 1 : -1)).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 border border-stone-200 rounded-xl p-3">
                <div className="min-w-0"><div className="font-medium text-sm truncate">{c.label || "Chiusura"}</div><div className="text-xs text-stone-400">{c.from === c.to ? fmtDate(c.from) : `${fmtDate(c.from)} → ${fmtDate(c.to)}`}</div></div>
                <button onClick={() => delClosure(c.id)} className="p-2 text-stone-400 hover:text-red-500 shrink-0"><Trash2 size={16} /></button>
              </div>
            ))}</div>
          ) : <p className="text-sm text-stone-400 mb-4">Nessuna chiusura programmata.</p>}
          <div className="border-t border-stone-100 pt-3">
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Aggiungi chiusura</div>
            <div className="flex flex-wrap items-end gap-2">
              <div><div className="text-[11px] text-stone-400 mb-1">Dal</div><input type="date" value={clFrom} onChange={(e) => setClFrom(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
              <div><div className="text-[11px] text-stone-400 mb-1">Al (facoltativo)</div><input type="date" value={clTo} onChange={(e) => setClTo(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
              <input value={clLabel} onChange={(e) => setClLabel(e.target.value)} placeholder="Motivo (es. Ferie estive)" className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
              <button onClick={addClosure} disabled={!clFrom} className="brand-bg text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-40">Aggiungi</button>
            </div>
            <p className="text-xs text-stone-400 mt-2">Nei giorni di chiusura non sarà possibile prendere appuntamenti.</p>
          </div>
        </section>
          </> : null}

          {sezione === "servizi" ? <>
        <section className="lc-card p-5">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap"><h3 className="font-semibold flex items-center gap-2"><Sparkles size={16} className="brand-accent" /> Servizi, durate e prezzi</h3><div className="flex items-center gap-2"><button onClick={() => printPriceList(config)} className="flex items-center gap-1 text-sm border border-stone-300 text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-50"><Printer size={15} /> Listino PDF</button><button onClick={addService} className="flex items-center gap-1 text-sm brand-bg px-3 py-1.5 rounded-lg"><Plus size={15} /> Aggiungi</button></div></div>
          <div className="space-y-2">{services.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2">
              <input value={s.name} onChange={(e) => editService(s.id, { name: e.target.value })} className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
              <div className="flex items-center gap-1"><input type="number" min={5} step={5} value={s.durationMin} onChange={(e) => editService(s.id, { durationMin: Math.max(5, Number(e.target.value) || 5) })} className="w-16 px-2 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" title="Durata" /><span className="text-xs text-stone-400">min</span></div>
              <div className="flex items-center gap-1"><input type="number" min={0} step={0.5} value={s.price != null ? s.price : ""} onChange={(e) => editService(s.id, { price: e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0) })} placeholder="—" className="w-20 px-2 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" title="Prezzo" /><span className="text-xs text-stone-400">€</span></div>
              {F.fidelity && loyalty.mode === "perService" ? <div className="flex items-center gap-1"><input type="number" min={0} step={1} value={s.points != null ? s.points : 1} onChange={(e) => editService(s.id, { points: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="w-14 px-2 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" title="Punti fedeltà" /><span className="text-xs text-stone-400">pt</span></div> : null}
              <button onClick={() => setSeqAperta((v) => (v === s.id ? null : s.id))} title="Sequenza degli impegni" className={`p-2 rounded-lg transition ${seqAperta === s.id || Array.isArray(s.impegni) ? "brand-soft brand-accent" : "text-stone-400 hover:text-stone-600"}`}><Layers size={16} /></button>
              <button onClick={() => delService(s.id)} className="p-2 text-stone-400 hover:text-red-500"><Trash2 size={16} /></button>
              {seqAperta === s.id ? <div className="w-full"><ImpegniEditor svc={s} cabine={cabine} staff={staff} operatoriServizio={operatoriDelServizio(s, services, staff)} onChange={(patch) => editService(s.id, patch)} /></div> : null}
            </div>
          ))}</div>
          <p className="text-xs text-stone-400 mt-3">Con <Layers size={12} className="inline align--1" /> imposti come il servizio occupa le risorse: una posa che libera l'operatore, due operatori diversi, o una cabina senza nessun operatore.</p>
        </section>

  {F.fidelity && (
        <section className="lc-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-4"><Star size={16} className="brand-accent" /> Programma fedeltà</h3>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Come si guadagnano i punti</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={() => updLoyalty({ mode: "flat" })} className={`flex-1 text-left text-sm border rounded-lg px-3 py-2 transition ${loyalty.mode !== "perService" ? "brand-soft brand-border" : "bg-white border-stone-200"}`}><div className="font-medium">1 punto per servizio</div><div className="text-xs text-stone-400">Ogni servizio completato vale 1 punto.</div></button>
                <button onClick={() => updLoyalty({ mode: "perService" })} className={`flex-1 text-left text-sm border rounded-lg px-3 py-2 transition ${loyalty.mode === "perService" ? "brand-soft brand-border" : "bg-white border-stone-200"}`}><div className="font-medium">Punti per servizio</div><div className="text-xs text-stone-400">Imposti i punti di ogni servizio qui sotto.</div></button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={loyalty.fromSales} onChange={(e) => updLoyalty({ fromSales: e.target.checked })} className="w-4 h-4" /> Genera punti anche dalle vendite <span className="text-stone-400">(imposti i punti per prodotto nel Catalogo)</span></label>
            <div>
              <div className="flex items-center justify-between mb-2"><div className="text-xs font-medium text-stone-400 uppercase tracking-wide">Premi a punti</div><button onClick={addReward} className="text-sm brand-accent flex items-center gap-1"><Plus size={14} /> Aggiungi premio</button></div>
              <div className="space-y-2">{loyalty.rewards.length === 0 ? <p className="text-sm text-stone-400">Nessun premio. Aggiungine uno (es. 5 punti → omaggio, 10 punti → sconto 10%).</p> : loyalty.rewards.map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-1"><input type="number" min={1} step={1} value={r.points} onChange={(e) => editReward(r.id, { points: Math.max(1, Math.round(Number(e.target.value) || 1)) })} className="w-20 px-2 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-xs text-stone-400">pt</span></div>
                  <input value={r.label} onChange={(e) => editReward(r.id, { label: e.target.value })} placeholder="Descrizione premio" className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
                  <button onClick={() => delReward(r.id)} className="p-2 text-stone-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              ))}</div>
            </div>
            <p className="text-xs text-stone-400">I clienti accumulano punti senza limiti. Dalla scheda di ogni cliente puoi riscattare un premio: i punti usati vengono scalati automaticamente.</p>
          </div>
        </section>
        )}
          </> : null}

          {sezione === "risorse" ? <>
        <section className="lc-card p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold flex items-center gap-2"><Users size={16} className="brand-accent" /> Operatori {F.maxOperatori !== Infinity ? <span className="text-xs font-normal text-stone-400">· max {F.maxOperatori}</span> : null}</h3><button onClick={addStaff} disabled={staff.length >= F.maxOperatori} title={staff.length >= F.maxOperatori ? "Limite operatori raggiunto per questo piano" : ""} className="flex items-center gap-1 text-sm brand-bg px-3 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={15} /> Aggiungi</button></div>
          <div className="space-y-4">{staff.map((st) => <StaffEditor key={st.id} st={st} services={services} cabine={cabine} tuttoStaff={staff} onEdit={(patch) => editStaff(st.id, patch)} onDelete={() => delStaff(st.id)} />)}</div>
        </section>

        <section className="lc-card p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold flex items-center gap-2"><DoorOpen size={16} className="brand-accent" /> Cabine</h3><button onClick={addCabina} className="flex items-center gap-1 text-sm brand-bg px-3 py-1.5 rounded-lg"><Plus size={15} /> Aggiungi</button></div>
          {cabine.length === 0
            ? <p className="text-sm text-stone-400">Nessuna cabina. Servono ai servizi che occupano uno spazio del salone — la lampada, la sala spa — anche quando non impegnano nessun operatore.</p>
            : <>
              <div className="space-y-3">{cabine.map((c) => <CabinaEditor key={c.id} c={c} onEdit={(patch) => editCabina(c.id, patch)} onDelete={() => { if (confirm(`Eliminare la cabina "${c.name}"? I servizi e gli operatori collegati resteranno senza cabina.`)) delCabina(c.id); }} />)}</div>
              <p className="text-xs text-stone-400 mt-3">Il numero accanto al nome è quante postazioni di quel tipo hai: con due lettini abbronzanti il secondo cliente entra lo stesso mentre il primo è dentro.</p>
            </>}
        </section>

        {F.maxOperatori > 1 ? <OperatorAccounts staff={staff} /> : null}
          </> : null}

          {sezione === "online" ? <>
        {cliente && aziendaId ? <SitoClienteCard /> : null}
        {online && aziendaId ? <BookingLinkCard aziendaId={aziendaId} config={config} saveConfig={saveConfig} cliente={cliente} /> : null}
        {cliente && !online ? <section className="lc-card p-5 text-sm text-stone-500"><h3 className="font-semibold flex items-center gap-2 mb-1 text-stone-900 tracking-tight"><CalendarPlus size={16} className="brand-accent" /> Prenotazioni online</h3>Il modulo non è attivo: il sito mostra servizi, eventi e contatti ma non permette di prenotare. Per attivarlo contatta il fornitore.</section> : null}

        {(online || cliente) && aziendaId ? <SitoWebCard config={config} saveConfig={saveConfig} cliente={cliente} /> : null}
          </> : null}

          {sezioniExtra.map((s) => (sezione === s.id ? <s.componente key={s.id} config={config} saveConfig={saveConfig} azienda={azienda} /> : null))}

          {sezione === "dati" ? <>
        <section className="lc-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Download size={16} className="brand-accent" /> Backup dei dati</h3>
          <p className="text-sm text-stone-500 mb-3">I dati sono salvati su questo PC. Esporta regolarmente un backup per sicurezza. (La licenza non è inclusa nel backup.)</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => exportBackup(config, bookings, clients, catalog, sales, eventi)} className="text-sm brand-bg px-3 py-2 rounded-lg inline-flex items-center gap-2"><Download size={15} /> Esporta backup</button>
            <label className="text-sm border border-stone-300 text-stone-700 px-3 py-2 rounded-lg inline-flex items-center gap-2 cursor-pointer hover:bg-stone-50"><Upload size={15} /> Importa backup<input type="file" accept="application/json" onChange={importBackup} className="hidden" /></label>
          </div>
        </section>

        <section className="lc-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><RefreshCw size={16} className="brand-accent" /> Backup automatico</h3>
          <label className="flex items-center gap-2 text-sm cursor-pointer mb-3"><input type="checkbox" checked={!!(config.backup && config.backup.enabled)} onChange={(e) => saveConfig({ ...config, backup: { time: (config.backup && config.backup.time) || "20:00", enabled: e.target.checked } })} className="w-4 h-4" /> Salva automaticamente un backup ogni giorno</label>
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <div><div className="text-[11px] text-stone-400 mb-1">Orario</div><input type="time" value={(config.backup && config.backup.time) || "20:00"} onChange={(e) => saveConfig({ ...config, backup: { enabled: !!(config.backup && config.backup.enabled), time: e.target.value } })} className="px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
            <div className="flex-1 min-w-[180px]"><div className="text-[11px] text-stone-400 mb-1">Cartella di destinazione</div><div className="flex items-center gap-2"><button onClick={onPickBackupDir} className="text-sm brand-bg px-3 py-2 rounded-lg inline-flex items-center gap-1.5"><FolderOpen size={15} /> Scegli cartella</button>{backupDirName ? <span className="text-sm text-stone-600 truncate">{backupDirName}</span> : <span className="text-sm text-stone-400">nessuna</span>}{backupDirName ? <button onClick={onClearBackupDir} className="text-stone-400 hover:text-red-500" title="Rimuovi"><X size={16} /></button> : null}</div></div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={onBackupNow} className="text-sm border border-stone-300 text-stone-700 px-3 py-2 rounded-lg inline-flex items-center gap-1.5 hover:bg-stone-50"><Download size={15} /> Backup ora</button>
            {lastBackup ? <span className="text-xs text-stone-400">Ultimo backup: {fmtFullDate(lastBackup.at)}</span> : <span className="text-xs text-stone-400">Nessun backup ancora.</span>}
          </div>
          <p className="text-xs text-stone-400 mt-3">Scegli una volta la cartella sul PC: l'app vi salverà il file <code className="bg-stone-100 px-1 rounded">lucentia-backup-AAAA-MM-GG.json</code> all'orario impostato (occorre che l'app sia aperta a quell'ora). Funziona su Windows; su Android usa "Esporta backup".</p>
        </section>

  {F.vendite && (
        <section className="lc-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Boxes size={16} className="brand-accent" /> Magazzino</h3>
          <p className="text-sm text-stone-500 mb-3">Azzera la giacenza di tutti i prodotti (prodotti, formati e prezzi restano invariati). Utile prima di un nuovo inventario da ricaricare con la scheda Carico.</p>
          <button onClick={azzeraGiacenze} className="text-sm border border-red-300 text-red-600 px-3 py-2 rounded-lg inline-flex items-center gap-2 hover:bg-red-50"><AlertCircle size={15} /> Azzera giacenze</button>
        </section>
        )}

        <ResetZone clients={clients} setClients={setClients} bookings={bookings} setBookings={setBookings} sales={sales} setSales={setSales} config={config} saveConfig={saveConfig} catalog={catalog} setCatalog={setCatalog} />
          </> : null}

          {sezione === "licenza" ? <>
        {cliente ? <LicenzaClienteCard licenza={licenza} installazione={installazione} azienda={azienda} moduli={F.moduli} /> : (
        <section className="lc-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><BadgeCheck size={16} className="brand-accent" /> La tua licenza</h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-stone-50 rounded-xl p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide">Piano</div><div className="font-semibold mt-0.5">{(licenza && licenza.plan) || "—"}</div></div>
            <div className="bg-stone-50 rounded-xl p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide">Scadenza</div><div className="font-semibold mt-0.5">{licenza && licenza.scadenza ? String(licenza.scadenza).split("-").reverse().join("/") : "Illimitata"}</div></div>
          </div>
          <p className="text-[11px] text-stone-400 mt-3">Per cambiare piano o rinnovare la licenza contatta il tuo fornitore.</p>
        </section>
        )}

        {isReseller ? <LicensePanel license={license} onSave={onSaveLicense} /> : null}
          </> : null}
        </div>
      </div>

      <div className="text-center py-4 space-y-2">
        <img src={LUCENTIA_LOGO} alt="Lucentia" className="h-6 w-auto mx-auto opacity-70" />
        <div className="text-[11px] text-stone-300 flex items-center justify-center gap-1.5">Realizzato da <img src={MAKER_LOGO} alt="Office Solution" className="h-3.5 w-auto inline-block opacity-70" /></div>
      </div>
    </div>
  );
}
export function ResetZone({ clients, setClients, bookings, setBookings, sales, setSales, config, saveConfig, catalog, setCatalog }) {
  const [sel, setSel] = useState(null);
  const [pw, setPw] = useState("");
  const [chk, setChk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const OPZ = {
    punti: { label: "Azzera punti fedeltà", desc: "Riporta a zero i punti fedeltà di tutti i clienti. Anagrafiche, appuntamenti e vendite restano invariati." },
    vendite: { label: "Azzera vendite e appuntamenti", desc: "Elimina tutti gli appuntamenti e le vendite. I clienti e i loro punti fedeltà attuali vengono mantenuti." },
    totale: { label: "Ripristino totale", desc: "Elimina clienti, operatori, appuntamenti, vendite, catalogo e fidelity. Restano solo i servizi e l'aspetto del salone." },
  };
  const apply = (tipo) => {
    if (tipo === "punti") {
      setClients((cs) => cs.map((c) => ({ ...c, bonusPoints: -clientPoints(c.code, bookings, sales, config, catalog), redeemedPoints: 0, redemptions: [] })));
    } else if (tipo === "vendite") {
      setClients((cs) => cs.map((c) => { const bal = clientPoints(c.code, bookings, sales, config, catalog) + (Number(c.bonusPoints) || 0) - (Number(c.redeemedPoints) || 0); return { ...c, bonusPoints: bal, redeemedPoints: 0, redemptions: [] }; }));
      setBookings([]); setSales([]);
    } else if (tipo === "totale") {
      saveConfig({ ...config, staff: [], loyalty: DEFAULT_LOYALTY });
      setClients([]); setBookings([]); setSales([]); setCatalog({ categories: [], products: [] });
    }
  };
  const esegui = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/verify-password", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) { setErr("Password non corretta."); setBusy(false); return; }
    } catch (e) { setErr("Errore di rete."); setBusy(false); return; }
    apply(sel); setBusy(false); setSel(null); setPw(""); setChk(false);
    alert("Ripristino eseguito.");
  };
  return (
    <section className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm">
      <h3 className="font-semibold flex items-center gap-2 mb-1 text-red-600"><AlertTriangle size={16} /> Zona ripristino</h3>
      <p className="text-sm text-stone-500 mb-3">Operazioni irreversibili. Richiedono la tua password.</p>
      <div className="space-y-2">
        {Object.keys(OPZ).map((k) => (
          <button key={k} onClick={() => { setSel(k); setPw(""); setChk(false); setErr(""); }} className={`w-full text-left border rounded-xl p-3 transition ${sel === k ? "border-red-300 bg-red-50" : "border-stone-200 hover:bg-stone-50"}`}>
            <div className="font-medium text-sm">{OPZ[k].label}</div>
            <div className="text-xs text-stone-400">{OPZ[k].desc}</div>
          </button>
        ))}
      </div>
      {sel ? (
        <div className="mt-3 border border-red-300 rounded-xl p-3 bg-red-50/40">
          <div className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1.5"><AlertTriangle size={14} /> "{OPZ[sel].label}" — operazione irreversibile</div>
          <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} placeholder="La tua password" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm mb-2 brand-ring" />
          <label className="flex items-start gap-2 text-sm text-stone-600 cursor-pointer mb-2"><input type="checkbox" checked={chk} onChange={(e) => setChk(e.target.checked)} className="w-4 h-4 mt-0.5" /> Confermo di voler procedere: l'operazione non è reversibile e i dati eliminati non potranno essere recuperati.</label>
          {err ? <p className="text-xs text-red-600 mb-2">{err}</p> : null}
          <div className="flex items-center gap-2">
            <button onClick={esegui} disabled={busy || !pw || !chk} className="text-sm font-medium text-white px-3 py-2 rounded-lg bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"><Trash2 size={14} /> {busy ? "Esecuzione…" : "Esegui ripristino"}</button>
            <button onClick={() => { setSel(null); setPw(""); setChk(false); setErr(""); }} className="text-sm text-stone-500 px-3 py-2">Annulla</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function OperatorAccounts({ staff }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [resetFor, setResetFor] = useState(null);
  const [resetPw, setResetPw] = useState("");
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 3000); };

  const api = async (path, method, body) => {
    try {
      const r = await fetch("/api" + path, { method: method || "GET", credentials: "include", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const data = await r.json().catch(() => ({}));
      return { ok: r.ok, data };
    } catch (e) { return { ok: false, data: {} }; }
  };
  const load = async () => { setLoading(true); const r = await api("/operatori"); setItems(r.ok && r.data.items ? r.data.items : []); setLoading(false); };
  useEffect(() => { load(); }, []);

  const crea = async () => {
    if (!staffId) { flash("Scegli a quale operatore."); return; }
    if (!email.trim() || pw.length < 6) { flash("Email e password (min 6)."); return; }
    const r = await api("/operatori", "POST", { email: email.trim(), password: pw, staff_id: staffId });
    if (r.ok) { setEmail(""); setPw(""); setStaffId(""); flash("Accesso creato."); load(); }
    else flash(r.data.error || "Errore nella creazione.");
  };
  const reset = async (id) => { if (resetPw.length < 6) { flash("Password troppo corta."); return; } const r = await api(`/operatori/${id}`, "PATCH", { nuovaPassword: resetPw }); if (r.ok) { setResetFor(null); setResetPw(""); flash("Password aggiornata."); } else flash(r.data.error || "Errore."); };
  const elimina = async (o) => { if (!confirm(`Eliminare l'accesso ${o.email}?`)) return; const r = await api(`/operatori/${o.id}`, "DELETE"); if (r.ok) { flash("Accesso eliminato."); load(); } else flash(r.data.error || "Errore."); };
  const nameOf = (sid) => { const s = staff.find((x) => x.id === sid); return s ? s.name : "— (operatore rimosso)"; };

  return (
    <section className="lc-card p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-1"><KeyRound size={16} className="brand-accent" /> Accessi operatori</h3>
      <p className="text-sm text-stone-500 mb-3">Crea un accesso per ogni operatore: entrerà con le proprie credenziali e vedrà soltanto la propria agenda, in sola lettura.</p>
      {msg ? <div className="text-sm bg-stone-800 text-white rounded-lg px-3 py-2 inline-flex items-center gap-2 mb-3"><Check size={14} /> {msg}</div> : null}

      {loading ? <p className="text-sm text-stone-400">Caricamento…</p> : items.length === 0 ? <p className="text-sm text-stone-400 mb-3">Nessun accesso operatore creato.</p> : (
        <div className="space-y-2 mb-4">{items.map((o) => (
          <div key={o.id} className="border border-stone-200 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0"><div className="font-medium truncate">{nameOf(o.staff_id)}</div><div className="text-xs text-stone-400 truncate flex items-center gap-1"><Mail size={12} /> {o.email}</div></div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setResetFor(resetFor === o.id ? null : o.id); setResetPw(""); }} className="text-xs border border-stone-300 text-stone-600 px-2 py-1.5 rounded-lg inline-flex items-center gap-1 hover:bg-stone-50"><KeyRound size={13} /> Password</button>
                <button onClick={() => elimina(o)} className="text-xs border border-red-300 text-red-600 px-2 py-1.5 rounded-lg inline-flex items-center gap-1 hover:bg-red-50"><Trash2 size={13} /> Elimina</button>
              </div>
            </div>
            {resetFor === o.id ? (
              <div className="mt-2 flex items-center gap-2">
                <input value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder="Nuova password (min 6)" className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-sm brand-ring" />
                <button onClick={() => reset(o.id)} className="text-sm font-medium brand-bg px-3 py-1.5 rounded-lg">Salva</button>
                <button onClick={() => { setResetFor(null); setResetPw(""); }} className="text-stone-400"><X size={16} /></button>
              </div>
            ) : null}
          </div>
        ))}</div>
      )}

      <div className="border-t border-stone-100 pt-3">
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Nuovo accesso</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring"><option value="">Operatore…</option>{staff.map((s) => { const used = items.some((o) => o.staff_id === s.id); return <option key={s.id} value={s.id} disabled={used}>{s.name}{used ? " (già attivo)" : ""}</option>; })}</select>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email accesso" className="px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
          <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password (min 6)" className="px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
          <button onClick={crea} className="brand-bg text-sm font-medium px-3 py-2 rounded-lg inline-flex items-center justify-center gap-1.5"><Plus size={15} /> Crea accesso</button>
        </div>
      </div>
    </section>
  );
}

// Orari settimanali di una risorsa (operatore o cabina): stessa forma per
// entrambi, così l'editor è uno solo.
export function OrariSettimana({ availability, onChange, titolo, vuoto }) {
  const av = availability || {};
  const setRanges = (day, ranges) => onChange({ ...av, [day]: ranges });
  const addRange = (day) => setRanges(day, [...(av[day] || []), [540, 780]]);
  const editRange = (day, i, idx, val) => { const r = (av[day] || []).map((x) => x.slice()); r[i][idx] = strToMin(val); setRanges(day, r); };
  const delRange = (day, i) => setRanges(day, (av[day] || []).filter((_, j) => j !== i));
  return (
    <div>
      <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">{titolo || "Orari di disponibilità"}</div>
      <div className="space-y-1.5">{DAYS.map((dd) => { const k = dd.k, l = dd.l; const ranges = av[k] || []; return (
        <div key={k} className="flex items-start gap-2 text-sm">
          <span className="w-9 pt-1.5 text-stone-500 font-medium">{l}</span>
          <div className="flex-1 flex flex-wrap items-center gap-2">
            {ranges.length === 0 ? <span className="text-xs text-stone-300 pt-1.5">{vuoto || "Chiuso"}</span> : null}
            {ranges.map((r, i) => (
              <div key={i} className="flex items-center gap-1 bg-stone-50 rounded-lg px-1.5 py-1">
                <input type="time" value={minToStr(r[0])} step={900} onChange={(e) => editRange(k, i, 0, e.target.value)} className="text-xs bg-transparent focus:outline-none" />
                <span className="text-stone-300">–</span>
                <input type="time" value={minToStr(r[1])} step={900} onChange={(e) => editRange(k, i, 1, e.target.value)} className="text-xs bg-transparent focus:outline-none" />
                <button onClick={() => delRange(k, i)} className="text-stone-300 hover:text-red-500"><X size={13} /></button>
              </div>
            ))}
            <button onClick={() => addRange(k)} className="text-xs brand-accent hover:opacity-70 flex items-center gap-0.5 pt-1"><Plus size={13} /> fascia</button>
          </div>
        </div>
      ); })}</div>
    </div>
  );
}

// Periodi in cui la risorsa non è disponibile: ferie e malattia per gli
// operatori, manutenzione o chiusura per le cabine.
export function Assenze({ off, onChange, titolo, vuoto }) {
  const lista = off || [];
  const add = () => onChange([...lista, { id: uid(), from: todayStr(), to: todayStr() }]);
  const edit = (id, patch) => onChange(lista.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const del = (id) => onChange(lista.filter((o) => o.id !== id));
  return (
    <div className="mt-3">
      <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">{titolo || "Assenze (malattia / ferie)"}</div>
      <div className="space-y-1.5">
        {lista.length === 0 ? <span className="text-xs text-stone-300">{vuoto || "Nessuna assenza programmata."}</span> : null}
        {lista.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center gap-1.5 text-sm bg-stone-50 rounded-lg px-2 py-1.5">
            <span className="text-xs text-stone-400">dal</span><input type="date" value={o.from} onChange={(e) => edit(o.id, { from: e.target.value })} className="text-xs bg-transparent focus:outline-none" />
            <span className="text-xs text-stone-400">al</span><input type="date" value={o.to} onChange={(e) => edit(o.id, { to: e.target.value })} className="text-xs bg-transparent focus:outline-none" />
            <button onClick={() => del(o.id)} className="text-stone-300 hover:text-red-500 ml-auto"><X size={14} /></button>
          </div>
        ))}
      </div>
      <button onClick={add} className="text-xs brand-accent hover:opacity-70 flex items-center gap-0.5 mt-1.5"><Plus size={13} /> aggiungi periodo</button>
    </div>
  );
}

// Una cabina è una risorsa come l'operatore: ha orari propri e periodi di
// fermo. Serve ai servizi che occupano uno spazio del salone (lampada, spa)
// anche quando non impegnano nessuna persona.
export function CabinaEditor({ c, onEdit, onDelete }) {
  const [aperta, setAperta] = useState(false);
  const suoiOrari = c.availability && Object.keys(c.availability).length;
  const quantita = Math.max(1, Number(c.quantita) || 1);
  return (
    <div className="border border-stone-200 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 brand-soft brand-accent"><DoorOpen size={17} /></div>
        <input value={c.name} onChange={(e) => onEdit({ name: e.target.value })} placeholder="Nome cabina" className="font-medium px-2 py-1.5 rounded-lg border border-stone-300 text-sm brand-ring min-w-0 flex-1" />
        <div className="flex items-center gap-1 shrink-0" title="Quante cabine di questo tipo esistono">
          <span className="text-[11px] text-stone-400">×</span>
          <input type="number" min={1} step={1} value={quantita} onChange={(e) => onEdit({ quantita: Math.max(1, Math.round(Number(e.target.value) || 1)) })} className="w-14 px-2 py-1.5 rounded-lg border border-stone-300 text-sm text-right brand-ring" />
        </div>
        <button onClick={() => setAperta((o) => !o)} className="text-xs font-medium border border-stone-300 text-stone-600 px-2.5 py-1.5 rounded-lg hover:bg-stone-50 shrink-0">{aperta ? "Chiudi" : "Orari"}</button>
        <button onClick={onDelete} className="p-2 text-stone-400 hover:text-red-500 shrink-0"><Trash2 size={16} /></button>
      </div>
      {!aperta ? <p className="text-[11px] text-stone-400 mt-1.5">{quantita > 1 ? `${quantita} postazioni di questo tipo · ` : ""}{suoiOrari ? "Con orari propri." : "Disponibile quando è aperto il salone."}</p> : null}
      {aperta ? (
        <div className="mt-3">
          <OrariSettimana availability={c.availability} onChange={(av) => onEdit({ availability: av })} titolo="Orari propri (lascia vuoto per seguire il salone)" vuoto="Come il salone" />
          <Assenze off={c.off} onChange={(off) => onEdit({ off })} titolo="Fermi (manutenzione)" vuoto="Nessun fermo programmato." />
        </div>
      ) : null}
    </div>
  );
}

// Sequenza di impegni di un servizio: chi e cosa occupa, e in quali minuti.
// Senza sequenza il servizio occupa un operatore per tutta la durata, com'è
// sempre stato.
// Elenco di operatori selezionabili a pastiglie. Vuoto = "quelli del servizio".
export function ScegliOperatori({ staff, valore, onChange, ereditati, etichetta }) {
  const sel = Array.isArray(valore) ? valore : [];
  const attivo = sel.length > 0;
  const toggle = (id) => {
    const base = attivo ? sel : (ereditati || []);
    const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    onChange(next);
  };
  return (
    <div>
      <div className="text-[11px] font-medium text-stone-400 uppercase tracking-wide mb-1.5">{etichetta}</div>
      <div className="flex flex-wrap gap-1.5">
        {(staff || []).length === 0 ? <span className="text-xs text-stone-400">Nessun operatore configurato.</span> : null}
        {(staff || []).map((st) => {
          const on = attivo ? sel.includes(st.id) : (ereditati || []).includes(st.id);
          return <button key={st.id} type="button" onClick={() => toggle(st.id)} className={`px-2.5 py-1 rounded-lg text-xs border transition ${on ? "brand-bg border-transparent" : "bg-white border-stone-200 text-stone-500 brand-hover"}`}>{st.name}</button>;
        })}
        {attivo && ereditati ? <button type="button" onClick={() => onChange(null)} className="px-2 py-1 rounded-lg text-xs text-stone-400 hover:text-stone-600">↺ come il servizio</button> : null}
      </div>
    </div>
  );
}

export function ImpegniEditor({ svc, cabine, staff, operatoriServizio, onChange }) {
  const durata = Math.max(0, Number(svc.durationMin) || 0);
  const seq = Array.isArray(svc.impegni) ? svc.impegni : null;
  const attiva = () => onChange({ impegni: [{ tipo: "operatore", posto: 1, da: 0, durata }] });
  const disattiva = () => onChange({ impegni: null });
  const set = (i, patch) => onChange({ impegni: seq.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const del = (i) => onChange({ impegni: seq.filter((_, j) => j !== i) });
  const fine = seq ? seq.reduce((m, x) => Math.max(m, (Number(x.da) || 0) + (Number(x.durata) || 0)), 0) : durata;
  // Le lettere distinguono persone diverse. Con un solo posto non servono:
  // scriverlo "Operatore A" farebbe solo pensare a una persona precisa.
  const posti = seq ? [...new Set(seq.filter((x) => x.tipo !== "cabina").map((x) => Number(x.posto) || 1))] : [];
  const lettera = (n) => String.fromCharCode(64 + (Number(n) || 1));
  const nomeDi = (id) => ((staff || []).find((x) => x.id === id) || {}).name;
  // Chi può davvero coprire un posto: l'intersezione delle liste delle sue fasi,
  // o in mancanza quella del servizio.
  const abilitatiDelPosto = (posto) => {
    const n = Number(posto) || 1; // la chiave della barra di riepilogo è una stringa
    let lista = null;
    for (const f of (seq || []).filter((x) => x.tipo !== "cabina" && (Number(x.posto) || 1) === n)) {
      const l = Array.isArray(f.operatori) && f.operatori.length ? f.operatori : (operatoriServizio || []);
      lista = lista === null ? l : lista.filter((id) => l.includes(id));
    }
    return lista || [];
  };
  // Se il posto è ristretto a qualcuno in particolare, meglio dirne il nome che
  // una lettera: è l'informazione che serve davvero leggendo la sequenza.
  const nomePosto = (posto) => {
    const n = Number(posto) || 1;
    const nomi = abilitatiDelPosto(n).map(nomeDi).filter(Boolean);
    if (nomi.length && nomi.length < (operatoriServizio || []).length) return nomi.slice(0, 3).join(", ") + (nomi.length > 3 ? "…" : "");
    return posti.length > 1 ? `Operatore ${lettera(n)}` : "Operatore";
  };
  // La cabina in cui lavorano gli operatori scelti, quando è la stessa per
  // tutti: è la stanza dove stanno di casa, tanto vale occuparla da subito.
  const cabinaAbituale = (ids) => {
    const lista = (Array.isArray(ids) && ids.length ? ids : (operatoriServizio || []));
    if (!lista.length) return null;
    const cabs = lista.map((id) => (((staff || []).find((x) => x.id === id) || {}).cabinaId) || null);
    return cabs.every((c) => c && c === cabs[0]) && cabine.some((c) => c.id === cabs[0]) ? cabs[0] : null;
  };
  const nomeCabina = (id) => ((cabine || []).find((c) => c.id === id) || {}).name || "Cabina";
  // Selezionando un operatore che ha una cabina abituale la cabina entra già
  // nella sequenza, purché non ce ne sia già una: resta togliibile con la ✕.
  const conCabinaAbituale = (impegni, ids) => {
    if (impegni.some((x) => x.tipo === "cabina")) return null;
    const cid = cabinaAbituale(ids);
    if (!cid) return null;
    const lungo = impegni.reduce((m, x) => Math.max(m, (Number(x.da) || 0) + (Number(x.durata) || 0)), durata);
    return [...impegni, { tipo: "cabina", cabinaId: cid, da: 0, durata: Math.max(lungo, 5) }];
  };
  const [avviso, setAvviso] = useState(null);
  const applica = (impegni, ids) => {
    const conCab = conCabinaAbituale(impegni, ids);
    if (conCab) setAvviso(nomeCabina(cabinaAbituale(ids)));
    else setAvviso(null);
    return conCab || impegni;
  };
  // Riordino: l'ordine non cambia gli orari, ma è quello in cui si legge la
  // sequenza — meglio poterla mettere nell'ordine in cui si svolge.
  const sposta = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= seq.length) return;
    const next = seq.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ impegni: next });
  };
  // Una cabina che copre tutto il servizio sta sullo sfondo: nell'ordine di
  // lettura resta in fondo, non conta come "fuori sequenza".
  const sfondo = (x) => x.tipo === "cabina" && (Number(x.da) || 0) === 0 && (Number(x.durata) || 0) >= fine;
  const inFila = seq ? seq.filter((x) => !sfondo(x)) : [];
  const perOrario = () => onChange({ impegni: [...inFila.slice().sort((a, b) => (Number(a.da) || 0) - (Number(b.da) || 0) || (Number(a.durata) || 0) - (Number(b.durata) || 0)), ...seq.filter(sfondo)] });
  const inOrdine = inFila.every((x, i) => i === 0 || (Number(inFila[i - 1].da) || 0) <= (Number(x.da) || 0));
  // Un impegno aggiunto parte dove finisce l'ultimo, così non si accavalla da
  // solo; una cabina invece copre di norma tutto il servizio.
  const add = (tipo) => onChange({ impegni: [...seq, tipo === "cabina"
    ? { tipo: "cabina", cabinaId: cabinaAbituale(svc.operatori) || (cabine[0] && cabine[0].id) || null, da: 0, durata: Math.max(durata, fine) }
    : { tipo: "operatore", posto: 1, da: fine, durata: 15 }] });
  const scala = Math.max(durata, fine, 1);

  const chiLoFa = (
    <div className="mt-2 border border-stone-200 rounded-xl p-3 bg-stone-50/60">
      <ScegliOperatori staff={staff} valore={svc.operatori} ereditati={operatoriServizio}
        onChange={(v) => onChange(seq ? { operatori: v, impegni: applica(seq, v) } : { operatori: v })} etichetta="Operatori abilitati a questo servizio" />
      <p className="text-[11px] text-stone-400 mt-2">Chi non è selezionato non potrà eseguirlo, né in negozio né online.</p>
    </div>
  );

  if (!seq) return (
    <div>
      {chiLoFa}
      <div className="mt-2 text-xs text-stone-500 flex items-center gap-2 flex-wrap">
        <span>Occupa un operatore per tutti i {durata} minuti.</span>
        <button onClick={attiva} className="brand-accent hover:opacity-70 font-medium">Personalizza la sequenza →</button>
      </div>
      {cabinaAbituale(svc.operatori) ? (
        <p className="text-[11px] text-stone-500 mt-1.5 flex items-center gap-1.5 flex-wrap">
          <DoorOpen size={12} className="text-stone-400" />
          Chi lo esegue lavora in {nomeCabina(cabinaAbituale(svc.operatori))}.
          <button onClick={() => onChange({ impegni: [{ tipo: "operatore", posto: 1, da: 0, durata }, { tipo: "cabina", cabinaId: cabinaAbituale(svc.operatori), da: 0, durata }] })} className="brand-accent hover:opacity-70 font-medium">Occupala anche per questo servizio</button>
        </p>
      ) : null}
    </div>
  );
  return (
    <div>
      {chiLoFa}
    <div className="mt-2 border border-stone-200 rounded-xl p-3 bg-stone-50/60">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-xs font-medium text-stone-500">Sequenza degli impegni</div>
        <button onClick={disattiva} className="text-xs text-stone-400 hover:text-stone-700">Torna al servizio semplice</button>
      </div>
      {/* Barra di riepilogo: si legge a colpo d'occhio dove la risorsa è libera */}
      <div className="space-y-1 mb-2.5">
        {[...new Set(seq.map((x) => (x.tipo === "cabina" ? `cabina:${x.cabinaId || ""}` : `operatore:${x.posto || 1}`)))].map((chiave) => {
          const [tipo, val] = chiave.split(":");
          const nome = tipo === "cabina" ? ((cabine.find((c) => c.id === val) || {}).name || "Cabina") : nomePosto(val);
          const parti = seq.filter((x) => (x.tipo === "cabina" ? `cabina:${x.cabinaId || ""}` : `operatore:${x.posto || 1}`) === chiave);
          return (
            <div key={chiave} className="flex items-center gap-2">
              <span className="text-[11px] text-stone-500 w-24 shrink-0 truncate flex items-center gap-1">
                {tipo === "cabina" ? <DoorOpen size={11} className="text-stone-400 shrink-0" /> : <User size={11} className="text-stone-400 shrink-0" />}{nome}
              </span>
              <div className="relative flex-1 h-3 rounded bg-stone-200/70 overflow-hidden">
                {parti.map((x, i) => (
                  <div key={i} className="absolute top-0 bottom-0 rounded-sm" title={`${Number(x.da) || 0}–${(Number(x.da) || 0) + (Number(x.durata) || 0)} min`}
                    style={{ left: `${((Number(x.da) || 0) / scala) * 100}%`, width: `${((Number(x.durata) || 0) / scala) * 100}%`,
                      background: tipo === "cabina" ? "#a8a29e" : "var(--brand)" }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-stone-400 mb-2">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--brand)" }} /> operatore</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#a8a29e" }} /> cabina</span>
        {!inOrdine ? <button onClick={perOrario} className="ml-auto brand-accent hover:opacity-70 font-medium">Ordina per orario</button> : null}
      </div>
      <div className="space-y-1.5">
        {seq.map((x, i) => (
          <div key={i} className={`flex flex-wrap items-center gap-1.5 text-sm bg-white rounded-lg px-2 py-1.5 border ${x.tipo === "cabina" ? "border-stone-300 border-l-4 border-l-stone-400" : "border-stone-200 border-l-4"}`} style={x.tipo === "cabina" ? undefined : { borderLeftColor: "var(--brand)" }}>
            <div className="flex flex-col -my-1 mr-0.5 shrink-0">
              <button onClick={() => sposta(i, -1)} disabled={i === 0} title="Sposta su" className="text-stone-400 hover:text-stone-700 disabled:opacity-25 disabled:hover:text-stone-400 leading-none"><ChevronUp size={13} /></button>
              <button onClick={() => sposta(i, 1)} disabled={i === seq.length - 1} title="Sposta giù" className="text-stone-400 hover:text-stone-700 disabled:opacity-25 disabled:hover:text-stone-400 leading-none"><ChevronDown size={13} /></button>
            </div>
            <select value={x.tipo === "cabina" ? "cabina" : "operatore"} onChange={(e) => set(i, e.target.value === "cabina" ? { tipo: "cabina", posto: null, cabinaId: (cabine[0] && cabine[0].id) || null } : { tipo: "operatore", posto: 1, cabinaId: null })} className="text-xs px-1.5 py-1 rounded border border-stone-200 bg-white">
              <option value="operatore">Operatore</option>
              <option value="cabina">Cabina</option>
            </select>
            {x.tipo === "cabina" ? (
              <select value={x.cabinaId || ""} onChange={(e) => set(i, { cabinaId: e.target.value || null })} className="text-xs px-1.5 py-1 rounded border border-stone-200 bg-white">
                <option value="">Quella dell'operatore</option>
                {cabine.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <select value={x.posto || 1} onChange={(e) => set(i, { posto: Number(e.target.value) })} className="text-xs px-1.5 py-1 rounded border border-stone-200 bg-white">
                {[1, 2, 3].map((n) => <option key={n} value={n}>persona {lettera(n)}</option>)}
              </select>
            )}
            <span className="text-xs text-stone-400">dal minuto</span>
            <input type="number" min={0} step={5} value={Number(x.da) || 0} onChange={(e) => set(i, { da: Math.max(0, Number(e.target.value) || 0) })} className="w-16 text-xs px-1.5 py-1 rounded border border-stone-200 text-right" />
            <span className="text-xs text-stone-400">per</span>
            <input type="number" min={5} step={5} value={Number(x.durata) || 0} onChange={(e) => set(i, { durata: Math.max(0, Number(e.target.value) || 0) })} className="w-16 text-xs px-1.5 py-1 rounded border border-stone-200 text-right" />
            <span className="text-xs text-stone-400">min</span>
            <button onClick={() => del(i)} className="text-stone-300 hover:text-red-500 ml-auto"><X size={14} /></button>
            {x.tipo !== "cabina" ? (
              <div className="w-full pt-1.5 border-t border-stone-100">
                <ScegliOperatori staff={staff} valore={x.operatori} ereditati={operatoriServizio}
                  onChange={(v) => onChange({ impegni: applica(seq.map((y, j) => (j === i ? { ...y, operatori: v } : y)), v) })}
                  etichetta={`Chi può fare questa fase${Array.isArray(x.operatori) && x.operatori.length ? "" : " · ora tutti quelli del servizio"}`} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <button onClick={() => add("operatore")} className="text-xs brand-accent hover:opacity-70 flex items-center gap-0.5"><Plus size={13} /> operatore</button>
        {cabine.length ? <button onClick={() => add("cabina")} className="text-xs brand-accent hover:opacity-70 flex items-center gap-0.5"><Plus size={13} /> cabina</button> : null}
        {fine > durata ? <span className="text-[11px] text-amber-700 ml-auto">La sequenza arriva a {fine} min: il servizio durerà {fine} minuti.</span> : null}
        {!seq.some((x) => x.tipo === "operatore") ? <span className="text-[11px] text-stone-500 ml-auto">Nessun operatore: il servizio occupa solo la cabina.</span> : null}
      </div>
      {avviso ? <p className="text-[11px] text-stone-500 mt-2 flex items-center gap-1.5"><DoorOpen size={12} className="text-stone-400 shrink-0" /> Aggiunta {avviso}, la cabina in cui lavora chi hai scelto. Se non serve, toglila con la ✕.</p> : null}
      {posti.length ? <p className="text-[11px] text-stone-400 mt-2">Gli intervalli non coperti restano liberi: durante una posa l'operatore può prendere un altro cliente.</p> : null}
      {posti.length > 1 ? <p className="text-[11px] text-stone-400 mt-1">Le lettere non indicano una persona precisa: dicono solo se una parte la fa la stessa persona (stessa lettera) o un'altra (lettera diversa). Chi la farà viene scelto al momento della prenotazione fra chi è abilitato e libero, e lo leggi sull'appuntamento in agenda.</p> : null}
    </div>
    </div>
  );
}

export function StaffEditor({ st, services, cabine, tuttoStaff, onEdit, onDelete }) {
  const F = useMods();
  const [picker, setPicker] = useState(false);
  const onPhoto = async (e) => { const file = e.target.files && e.target.files[0]; if (!file) return; try { const url = await fileToResizedDataURL(file, 256); onEdit({ photo: url }); } catch (err) {} };
  // Quali servizi sa fare: non è più un dato dell'operatore, si ricava da ciò
  // che i servizi dichiarano. Qui viene solo mostrato, per orientarsi.
  const sa = (services || []).filter((sv) => operatoriDelServizio(sv, services, tuttoStaff).includes(st.id)).map((sv) => sv.name);
  return (
    <div className="border border-stone-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <button type="button" onClick={() => setPicker((p) => !p)} title="Avatar / foto (prenotazioni online)" className="shrink-0 rounded-full transition hover:opacity-90 active:scale-95"><AvatarSvg id={avatarIdFor(st)} photo={st.photo} size={40} /></button>
        <input value={st.name} onChange={(e) => onEdit({ name: e.target.value })} className="font-medium px-2 py-1.5 rounded-lg border border-stone-300 text-sm brand-ring min-w-0 flex-1" /><input value={st.role} onChange={(e) => onEdit({ role: e.target.value })} placeholder="Ruolo" className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-stone-300 text-stone-500 brand-ring min-w-0" /><button onClick={onDelete} className="p-2 text-stone-400 hover:text-red-500 shrink-0"><Trash2 size={16} /></button>
      </div>
      {picker ? (
        <div className="mb-3 rounded-xl border border-stone-200 p-3 bg-stone-50/70">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="text-xs font-medium text-stone-500">Avatar / foto per le prenotazioni online</div>
            <div className="flex items-center gap-2">
              {st.photo ? <button onClick={() => onEdit({ photo: null })} className="text-xs text-stone-500 hover:text-red-500 inline-flex items-center gap-1"><X size={12} /> Rimuovi foto</button> : null}
              <label className="cursor-pointer text-xs font-medium brand-bg px-2.5 py-1 rounded-lg inline-flex items-center gap-1"><ImageIcon size={13} /> Carica foto<input type="file" accept="image/*" onChange={onPhoto} className="hidden" /></label>
            </div>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">{AVATAR_IDS.map((aid) => { const on = !st.photo && avatarIdFor(st) === aid; return (
            <button key={aid} type="button" onClick={() => onEdit({ avatar: aid, photo: null })} className="rounded-full transition hover:scale-105" style={on ? { boxShadow: "0 0 0 2px var(--brand)" } : {}}><AvatarSvg id={aid} size={38} /></button>
          ); })}</div>
        </div>
      ) : null}
      {(sa || []).length ? (
        <div className="mb-3">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Servizi che può eseguire</div>
          <div className="flex flex-wrap gap-1.5">{sa.map((n) => <span key={n} className="px-2.5 py-1 rounded-lg text-xs bg-stone-100 text-stone-600">{n}</span>)}</div>
          <p className="text-[11px] text-stone-400 mt-1.5">Si imposta sul servizio, non qui: nella sezione Servizi ogni voce dice chi la può fare.</p>
        </div>
      ) : <p className="text-[11px] text-stone-400 mb-3">Nessun servizio ancora abilitato. Si imposta nella sezione Servizi, su ciascuna voce.</p>}
      {(cabine || []).length ? (
        <div className="mb-3">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Cabina abituale</div>
          <select value={st.cabinaId || ""} onChange={(e) => onEdit({ cabinaId: e.target.value || null })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring">
            <option value="">Nessuna</option>
            {(cabine || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <p className="text-[11px] text-stone-400 mt-1">Usata dai servizi che richiedono una cabina senza indicarne una precisa.</p>
        </div>
      ) : null}
      <OrariSettimana availability={st.availability} onChange={(av) => onEdit({ availability: av })} />
      <Assenze off={st.off} onChange={(off) => onEdit({ off })} />
    </div>
  );
}

// Solo installazioni cliente: dove si trova il sito e il gestionale.
export function SitoClienteCard() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <section className="lc-card p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-1 text-stone-900 tracking-tight"><Globe size={16} className="brand-accent" /> Il tuo sito</h3>
      <p className="text-sm text-stone-500 mb-3">Il sito pubblico della tua attività è su questo stesso dominio; il gestionale risponde su <code className="bg-stone-100 px-1 rounded">/gestionale</code>.</p>
      <div className="flex flex-wrap gap-2 text-sm">
        <a href={origin + "/"} target="_blank" rel="noreferrer" className="border border-stone-300 text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Globe size={14} /> Apri il sito</a>
        <a href={origin + "/prenota"} target="_blank" rel="noreferrer" className="border border-stone-300 text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><CalendarPlus size={14} /> Pagina prenotazioni</a>
      </div>
    </section>
  );
}

// Solo installazioni cliente: la licenza arriva dal portale Lucentia.
export function LicenzaClienteCard({ licenza, installazione, azienda, moduli }) {
  const [busy, setBusy] = useState(false);
  const [esito, setEsito] = useState(installazione && installazione.licenza ? installazione.licenza : null);
  const verifica = async () => {
    setBusy(true);
    try { const r = await fetch("/api/licenza/verifica-ora", { method: "POST", credentials: "include" }); const j = await r.json().catch(() => ({})); if (j.licenza) setEsito(j.licenza); } catch (e) {}
    setBusy(false);
  };
  const quando = esito && esito.verificata_il ? new Date(esito.verificata_il) : null;
  const ETICHETTE = { fidelity: "Fidelity & premi", vendite: "Vendite & magazzino", statistiche: "Statistiche", marketing: "Marketing", allergeni: "Allergeni e patologie", pacchetti: "Pacchetti sedute", online: "Prenotazioni online", op3: "Fino a 3 operatori", opinf: "Operatori illimitati" };
  const attivi = Array.isArray(moduli) ? moduli : [];
  const portale = installazione && installazione.portale;
  return (
    <section className="lc-card p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-3"><BadgeCheck size={16} className="brand-accent" /> La tua licenza</h3>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-stone-50 rounded-xl p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide">Scadenza</div><div className="font-semibold mt-0.5">{licenza && licenza.scadenza ? String(licenza.scadenza).split("-").reverse().join("/") : "Illimitata"}</div></div>
        <div className="bg-stone-50 rounded-xl p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide">Stato</div><div className="font-semibold mt-0.5">{azienda && azienda.stato === "active" ? "Attiva" : "Non attiva"}</div></div>
      </div>
      <div className="mt-4">
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Moduli attivi</div>
        {attivi.length === 0 ? <p className="text-sm text-stone-400">Nessun modulo aggiuntivo: agenda e clienti.</p> : (
          <div className="flex flex-wrap gap-1.5">{attivi.map((k) => <span key={k} className="text-xs px-2.5 py-1 rounded-full brand-soft brand-text">{ETICHETTE[k] || ((ESTENSIONI.moduli || []).find((m) => m.key === k) || {}).label || k}</span>)}</div>
        )}
      </div>
      <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-3 text-xs text-stone-400">
        {portale ? <span>Licenza verificata con Lucentia{quando ? ` il ${quando.toLocaleDateString("it-IT")} alle ${quando.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}` : ""}{esito && esito.stato && esito.stato !== "ok" ? <b className="text-amber-700"> · {esito.stato === "rifiutata" ? "installazione non riconosciuta" : "portale non raggiungibile"}</b> : null}</span> : <span>Licenza gestita localmente (nessun portale configurato).</span>}
        {portale ? <button onClick={verifica} disabled={busy} className="ml-auto text-xs font-medium border border-stone-300 text-stone-600 px-2.5 py-1.5 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1 disabled:opacity-50"><RefreshCw size={12} className={busy ? "animate-spin" : ""} /> {busy ? "Verifico…" : "Verifica ora"}</button> : null}
      </div>
      <p className="text-[11px] text-stone-400 mt-3">Per rinnovare la licenza o attivare altri moduli contatta il tuo fornitore: le modifiche arrivano qui da sole.</p>
    </section>
  );
}
