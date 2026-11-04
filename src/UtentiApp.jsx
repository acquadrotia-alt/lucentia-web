// ============================================================================
// /utenti — l'estensione del gestionale per il telefono, pensata per chi
// lavora in salone. All'apertura chiede chi è l'operatore e poi offre tre
// funzioni: la propria agenda, la scheda dell'appuntamento in corso e un
// nuovo appuntamento (con qualunque operatore). Legge e scrive le stesse
// collezioni del gestionale (/api/data), col login del salone; con un
// accesso da operatore si consulta soltanto (il server è in sola lettura).
// ============================================================================
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { User, Calendar, ClipboardList, CalendarPlus, LogOut, ChevronLeft, ChevronRight, Phone, Mail, Check, Search, Plus, AlertTriangle, Clock, Sparkles, RefreshCw, Users, X } from "lucide-react";
import { orariPossibili, impegniServizi } from "./orari.js";
import { uid, minToStr, todayStr, addDays, fmtDate, parseDate, WDAY_SHORT, MONTHS, apiLoad, apiPatchVerificato, impostaOrigine, eventiImpegni, upsertClient, loyaltyConfig, matchPackage, STATUS, themeVars, BRAND_CSS, ModsCtx, flagsFromModuli, BRANDING, DEFAULT_CONFIG } from "./core/salone/comuni.jsx";
import { ApptCard, DettaglioAppuntamento, SlotPicker, risorseDi } from "./core/salone/agenda.jsx";
import { AvatarSvg, avatarIdFor } from "./avatars.jsx";

const CHIAVE_OP = (aid) => `lc-utenti-operatore-${aid || "x"}`;
const adessoMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

export default function UtentiApp({ user, azienda, onLogout }) {
  const soloLettura = user.ruolo === "operatore";
  const flags = flagsFromModuli(azienda && azienda.moduli);
  const [config, setConfig] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [eventi, setEventi] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [operatore, setOperatore] = useState(() => { if (soloLettura) return user.staff_id || ""; try { return localStorage.getItem(CHIAVE_OP(azienda && azienda.id)) || ""; } catch (e) { return ""; } });
  const [schermo, setSchermo] = useState("menu"); // menu | agenda | scheda | nuovo
  const [avviso, setAvviso] = useState(null);

  const ricarica = useCallback(async () => {
    const [cfg, bk, cl, ev] = await Promise.all([apiLoad("config", null), apiLoad("bookings", []), apiLoad("clients", []), apiLoad("eventi", [])]);
    setConfig(cfg ? { ...DEFAULT_CONFIG, ...cfg, branding: { ...BRANDING, ...(cfg.branding || {}) } } : DEFAULT_CONFIG);
    setBookings(Array.isArray(bk) ? bk : []); setClients(Array.isArray(cl) ? cl : []); setEventi(Array.isArray(ev) ? ev : []);
    setCaricamento(false);
  }, []);
  useEffect(() => { ricarica(); const t = setInterval(() => { if (document.visibilityState !== "hidden") ricarica(); }, 60000); const vis = () => { if (document.visibilityState === "visible") ricarica(); }; document.addEventListener("visibilitychange", vis); return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); }; }, [ricarica]);

  const staff = (config && config.staff) || [];
  const op = staff.find((s) => s.id === operatore) || null;
  const scegli = (id) => { setOperatore(id); try { localStorage.setItem(CHIAVE_OP(azienda && azienda.id), id); } catch (e) {} setSchermo("menu"); };
  const cambia = () => { if (soloLettura) return; setOperatore(""); try { localStorage.removeItem(CHIAVE_OP(azienda && azienda.id)); } catch (e) {} };
  const b = (config && config.branding) || BRANDING;
  const impegniEventi = useMemo(() => eventiImpegni(eventi), [eventi]);

  // Salvataggio di un nuovo appuntamento: parte solo il record nuovo (PATCH),
  // così non si pestano le modifiche fatte dal banco nel frattempo. I clienti
  // nuovi si salvano allo stesso modo.
  useEffect(() => { impostaOrigine("telefono"); }, []);
  const salvaNuovo = async (booking, clientiNuovi) => {
    const r = await apiPatchVerificato("bookings", [...bookings.filter((x) => x && x.id !== booking.id), booking]);
    if (!r.ok) return { ok: false, error: r.error };
    if (clientiNuovi) {
      const codici = new Set(clients.map((c) => c.code));
      const aggiunti = clientiNuovi.filter((c) => !codici.has(c.code));
      if (aggiunti.length) await apiPatchVerificato("clients", [...clients, ...aggiunti]);
    }
    await ricarica();
    return { ok: true };
  };

  if (caricamento || !config) return <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-3"><div className="lc-spinner" /><div className="text-sm text-stone-400">Carico l'agenda…</div></div>;

  const Testata = ({ titolo, indietro }) => (
    <header className="bg-white/90 backdrop-blur-xl border-b border-stone-200/70 sticky top-0 z-20" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}>
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center gap-3">
        {indietro ? <button onClick={indietro} aria-label="Indietro" className="w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100"><ChevronLeft size={22} /></button> : (b.logo ? <img src={b.logo} alt="" className="w-9 h-9 rounded-xl object-cover ring-1 ring-stone-200" /> : <div className="w-9 h-9 rounded-xl brand-bg flex items-center justify-center"><Sparkles size={16} /></div>)}
        <div className="min-w-0 flex-1"><div className="font-semibold leading-tight truncate tracking-tight">{titolo}</div>{op ? <div className="text-xs text-stone-400 truncate">{op.name}{op.role ? ` · ${op.role}` : ""}</div> : <div className="text-xs text-stone-400 truncate">{b.name}</div>}</div>
        <button onClick={() => ricarica()} aria-label="Aggiorna" className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100"><RefreshCw size={17} /></button>
        <button onClick={onLogout} aria-label="Esci" className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100"><LogOut size={18} /></button>
      </div>
    </header>
  );

  return (
    <ModsCtx.Provider value={flags}>
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col" style={themeVars(b.primary)}>
      <style>{BRAND_CSS}</style>
      {!op ? (
        <>
          <Testata titolo="Chi sei?" />
          <main className="max-w-md w-full mx-auto px-4 py-6 flex-1 lc-fade-up">
            <p className="text-sm text-stone-500 mb-4">Scegli il tuo nome: vedrai la tua agenda e potrai aprire la scheda dei tuoi appuntamenti.</p>
            {staff.length === 0 ? <div className="lc-card p-8 text-center text-sm text-stone-400">Nessun operatore configurato. Aggiungili dal gestionale, in Impostazioni → Operatori e cabine.</div> : (
              <div className="grid grid-cols-2 gap-3">{staff.map((s, i) => (
                <button key={s.id} onClick={() => scegli(s.id)} style={{ animationDelay: `${i * 50}ms` }} className="lc-card lc-card-hover lc-fade-up p-4 flex flex-col items-center gap-2 text-center">
                  <AvatarSvg id={avatarIdFor(s)} photo={s.photo} size={64} ring />
                  <span className="font-semibold text-stone-900">{s.name}</span>
                  {s.role ? <span className="text-xs text-stone-400 -mt-1">{s.role}</span> : null}
                </button>
              ))}</div>
            )}
          </main>
        </>
      ) : schermo === "menu" ? (
        <>
          <Testata titolo={`Ciao ${op.name.split(" ")[0]}`} />
          <main className="max-w-md w-full mx-auto px-4 py-6 flex-1 lc-fade-up space-y-3">
            <MenuVoce icon={Calendar} titolo="La mia agenda" testo="I tuoi appuntamenti di oggi e dei prossimi giorni." sotto={riassuntoOggi(bookings, op.id)} onClick={() => setSchermo("agenda")} />
            <MenuVoce icon={ClipboardList} titolo="Scheda appuntamento" testo="Tutti i dettagli dell'appuntamento in corso: servizi, fasi, note e allergie della cliente." sotto={inCorsoTesto(bookings, op.id)} onClick={() => setSchermo("scheda")} />
            <MenuVoce icon={CalendarPlus} titolo="Nuovo appuntamento" testo={soloLettura ? "Col tuo accesso puoi solo consultare: per prenotare serve l'accesso del salone." : "Prenota per una cliente, con te o con chi vuoi."} onClick={() => !soloLettura && setSchermo("nuovo")} disabilitato={soloLettura} />
            {!soloLettura ? <button onClick={cambia} className="w-full text-sm text-stone-400 hover:text-stone-600 py-2 inline-flex items-center justify-center gap-1.5"><Users size={14} /> Non sei {op.name}? Cambia operatore</button> : null}
          </main>
        </>
      ) : schermo === "agenda" ? (
        <>
          <Testata titolo="La mia agenda" indietro={() => setSchermo("menu")} />
          <main className="max-w-md w-full mx-auto px-4 py-5 flex-1 lc-fade-up"><AgendaOperatore config={config} bookings={bookings} eventi={eventi} op={op} clients={clients} /></main>
        </>
      ) : schermo === "scheda" ? (
        <>
          <Testata titolo="Scheda appuntamento" indietro={() => setSchermo("menu")} />
          <main className="max-w-md w-full mx-auto px-4 py-5 flex-1 lc-fade-up"><SchedaInCorso config={config} bookings={bookings} op={op} clients={clients} /></main>
        </>
      ) : (
        <>
          <Testata titolo="Nuovo appuntamento" indietro={() => setSchermo("menu")} />
          <main className="max-w-md w-full mx-auto px-4 py-5 flex-1 lc-fade-up"><NuovoAppuntamento config={config} bookings={bookings} clients={clients} impegniEventi={impegniEventi} op={op} onSalva={salvaNuovo} onFatto={() => { setSchermo("agenda"); }} /></main>
        </>
      )}
      {op ? (
        <nav className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-stone-200/70" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="max-w-md mx-auto grid grid-cols-3">
            {[["agenda", "Agenda", Calendar], ["scheda", "In corso", ClipboardList], ["nuovo", "Nuovo", CalendarPlus]].map(([k, l, Icon]) => (
              <button key={k} onClick={() => { if (k === "nuovo" && soloLettura) return; setSchermo(k); }} aria-current={schermo === k ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${schermo === k ? "brand-accent" : "text-stone-400"} ${k === "nuovo" && soloLettura ? "opacity-40" : ""}`}><Icon size={20} /> {l}</button>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
    </ModsCtx.Provider>
  );
}

function MenuVoce({ icon: Icon, titolo, testo, sotto, onClick, disabilitato }) {
  return (
    <button onClick={onClick} disabled={disabilitato} className={`lc-card w-full text-left p-4 flex items-start gap-4 transition ${disabilitato ? "opacity-60" : "lc-card-hover active:scale-[0.99]"}`}>
      <span className="w-12 h-12 rounded-2xl brand-soft flex items-center justify-center shrink-0"><Icon size={24} className="brand-accent" /></span>
      <span className="flex-1 min-w-0">
        <span className="font-semibold text-stone-900 text-lg flex items-center justify-between gap-2">{titolo}<ChevronRight size={18} className="text-stone-300" /></span>
        <span className="block text-sm text-stone-500 mt-0.5 leading-relaxed">{testo}</span>
        {sotto ? <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium brand-text brand-soft px-2.5 py-1 rounded-full">{sotto}</span> : null}
      </span>
    </button>
  );
}
const mieiDelGiorno = (bookings, opId, giorno) => bookings.filter((x) => x.date === giorno && x.status !== "cancelled" && (x.staffId === opId || (Array.isArray(x.impegni) && x.impegni.some((i) => i.risorsaId === opId)))).sort((a, b2) => a.startMin - b2.startMin);
const riassuntoOggi = (bookings, opId) => { const n = mieiDelGiorno(bookings, opId, todayStr()).length; return n ? `${n} appuntament${n === 1 ? "o" : "i"} oggi` : "Oggi niente in agenda"; };
const inCorsoDi = (bookings, opId) => { const now = adessoMin(); const oggi = mieiDelGiorno(bookings, opId, todayStr()); return oggi.find((x) => x.startMin <= now && x.endMin > now) || oggi.find((x) => x.startMin > now) || null; };
const inCorsoTesto = (bookings, opId) => { const x = inCorsoDi(bookings, opId); if (!x) return ""; const now = adessoMin(); return x.startMin <= now && x.endMin > now ? `In corso: ${x.clientName} fino alle ${minToStr(x.endMin)}` : `Prossimo: ${x.clientName} alle ${minToStr(x.startMin)}`; };

// ---- La mia agenda -----------------------------------------------------------
function AgendaOperatore({ config, bookings, eventi, op, clients }) {
  const [giorno, setGiorno] = useState(todayStr());
  const [sel, setSel] = useState(null);
  const lista = mieiDelGiorno(bookings, op.id, giorno);
  const evs = (eventi || []).filter((e) => e.date === giorno && (e.staffIds || []).includes(op.id));
  const d = parseDate(giorno);
  const giorniStrip = Array.from({ length: 7 }, (_, i) => addDays(todayStr(), i));
  const conta = (g) => mieiDelGiorno(bookings, op.id, g).length;
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">{giorniStrip.map((g) => { const dd = parseDate(g); const on = g === giorno; const n = conta(g); return (
        <button key={g} onClick={() => setGiorno(g)} className={`shrink-0 w-14 py-2 rounded-xl border flex flex-col items-center transition ${on ? "brand-bg border-transparent" : "bg-white border-stone-200"}`}>
          <span className={`text-[10px] uppercase ${on ? "opacity-80" : "text-stone-400"}`}>{WDAY_SHORT[dd.getDay()]}</span>
          <span className="text-base font-semibold leading-tight">{dd.getDate()}</span>
          <span className={`text-[10px] ${on ? "opacity-80" : n ? "brand-accent font-medium" : "text-stone-300"}`}>{n || "–"}</span>
        </button>
      ); })}</div>
      <div className="flex items-center justify-between">
        <button onClick={() => setGiorno(addDays(giorno, -1))} className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500"><ChevronLeft size={18} /></button>
        <div className="text-center"><div className="font-semibold capitalize tracking-tight">{fmtDate(giorno)}</div>{giorno !== todayStr() ? <button onClick={() => setGiorno(todayStr())} className="text-xs brand-accent">Oggi</button> : <span className="text-xs text-stone-400">{lista.length} appuntament{lista.length === 1 ? "o" : "i"}</span>}</div>
        <button onClick={() => setGiorno(addDays(giorno, 1))} className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500"><ChevronRight size={18} /></button>
      </div>
      {evs.map((e) => <div key={e.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><div className="font-medium text-amber-800">{e.titolo}</div><div className="text-xs text-amber-700">{minToStr(e.startMin)}–{minToStr(e.endMin)} · evento del salone</div></div>)}
      {lista.length === 0 && !evs.length ? <div className="lc-card p-10 text-center"><Calendar size={26} className="mx-auto text-stone-300 mb-2" /><p className="text-sm text-stone-500">Nessun appuntamento</p></div>
        : <div className="space-y-2">{lista.map((x, i) => <ApptCard key={x.id} b={x} staff={config.staff} services={config.services} cabine={config.cabine} big index={i} onClick={() => setSel(x)} />)}</div>}
      {sel ? <SchedaAppuntamento b={sel} config={config} clients={clients} onClose={() => setSel(null)} /> : null}
    </div>
  );
}

// ---- Scheda dell'appuntamento in corso --------------------------------------
function SchedaInCorso({ config, bookings, op, clients }) {
  const now = adessoMin();
  const oggi = mieiDelGiorno(bookings, op.id, todayStr());
  // in corso adesso, altrimenti il prossimo, altrimenti l'ultimo della giornata
  const corrente = inCorsoDi(bookings, op.id) || oggi[oggi.length - 1] || null;
  const [sel, setSel] = useState(null);
  const mostra = sel || corrente;
  if (!oggi.length) return <div className="lc-card p-10 text-center"><ClipboardList size={26} className="mx-auto text-stone-300 mb-2" /><p className="text-sm text-stone-500">Oggi non hai appuntamenti.</p></div>;
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">{oggi.map((x) => { const on = mostra && mostra.id === x.id; const inCorso = x.startMin <= now && x.endMin > now; const passato = x.endMin <= now; return (
        <button key={x.id} onClick={() => setSel(x)} className={`shrink-0 px-3 py-2 rounded-xl border text-left transition ${on ? "brand-bg border-transparent" : passato ? "bg-stone-50 border-stone-200 text-stone-400" : "bg-white border-stone-200"}`}>
          <div className="text-xs font-semibold tabular-nums">{minToStr(x.startMin)}{inCorso ? " · ora" : ""}</div><div className="text-xs truncate max-w-[7rem]">{x.clientName}</div>
        </button>
      ); })}</div>
      {mostra ? <SchedaAppuntamento b={mostra} config={config} clients={clients} inline /> : null}
    </div>
  );
}

function SchedaAppuntamento({ b, config, clients, onClose, inline }) {
  const cl = (clients || []).find((x) => x.code === b.clientCode);
  const ris = risorseDi(b, config.staff, config.cabine);
  const names = (b.serviceIds || []).map((id) => { const s = config.services.find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  const meta = b.status ? STATUS[b.status] : null;
  const pkgs = cl && Array.isArray(cl.packages) ? cl.packages.filter((p) => (b.serviceIds || []).includes(p.serviceId)) : [];
  const wa = cl && cl.phone ? "39" + String(cl.phone).replace(/\D/g, "").replace(/^39/, "") : "";
  const corpo = (
    <>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div><div className="font-semibold text-lg leading-tight">{b.clientName}{b.clientCode ? <span className="text-sm text-stone-400 font-normal"> #{b.clientCode}</span> : null}</div><div className="text-sm text-stone-500 capitalize">{fmtDate(b.date)} · {minToStr(b.startMin)}–{minToStr(b.endMin)}</div></div>
        {onClose ? <button onClick={onClose} className="text-stone-400"><X size={20} /></button> : null}
      </div>
      <div className="bg-stone-50 rounded-xl p-3 text-sm space-y-1.5 mb-3">
        <div className="flex items-center gap-2"><Sparkles size={14} className="text-stone-400" /> {names || "—"}</div>
        <div className="flex items-center gap-2"><User size={14} className="text-stone-400" /> {ris.etichetta}</div>
        {meta ? <div className="flex items-center gap-2"><meta.Icon size={14} className="text-stone-400" /> {meta.label}</div> : null}
        {b.note ? <div className="flex items-start gap-2"><ClipboardList size={14} className="text-stone-400 mt-0.5" /> <span>{b.note}</span></div> : null}
        {b.fromOnline ? <div className="text-xs brand-accent">Prenotata online dalla cliente</div> : null}
      </div>
      <DettaglioAppuntamento b={b} config={config} />
      {cl && (cl.allergies || cl.conditions || cl.notes) ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3"><div className="flex items-center gap-1.5 text-sm font-medium text-red-800 mb-1"><AlertTriangle size={15} /> Attenzione</div><ul className="text-sm text-red-700 space-y-0.5">{cl.allergies ? <li><b>Allergie:</b> {cl.allergies}</li> : null}{cl.conditions ? <li><b>Patologie:</b> {cl.conditions}</li> : null}{cl.notes ? <li><b>Note:</b> {cl.notes}</li> : null}</ul></div>
      ) : null}
      {pkgs.length ? <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 mb-3 text-sm text-sky-800">{pkgs.map((p) => { const s = config.services.find((x) => x.id === p.serviceId); return <div key={p.id}>Pacchetto {s ? s.name : ""}: <b>{p.total - (Number(p.used) || 0)}</b> di {p.total} sedute rimaste</div>; })}</div> : null}
      {cl ? (
        <div className="grid grid-cols-2 gap-2">
          {cl.phone ? <a href={`tel:${cl.phone}`} className="flex items-center justify-center gap-1.5 text-sm font-medium border border-stone-300 text-stone-700 px-3 py-2.5 rounded-xl bg-white"><Phone size={15} /> Chiama</a> : null}
          {wa ? <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 text-sm font-medium border border-green-300 text-green-700 px-3 py-2.5 rounded-xl bg-white">WhatsApp</a> : null}
          {cl.email ? <a href={`mailto:${cl.email}`} className="col-span-2 flex items-center justify-center gap-1.5 text-sm text-stone-500 px-3 py-2"><Mail size={14} /> {cl.email}</a> : null}
        </div>
      ) : null}
    </>
  );
  if (inline) return <div className="lc-card p-4">{corpo}</div>;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5 overflow-auto lc-fade-up" style={{ maxHeight: "92vh", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }} onClick={(e) => e.stopPropagation()}>{corpo}</div>
    </div>
  );
}

// ---- Nuovo appuntamento, a passi --------------------------------------------
function NuovoAppuntamento({ config, bookings, clients, impegniEventi, op, onSalva, onFatto }) {
  const [passo, setPasso] = useState(1);
  const [q, setQ] = useState("");
  const [cliente, setCliente] = useState(null); // { code, name, phone, email, nuovo }
  const [nuovoCl, setNuovoCl] = useState({ name: "", phone: "", email: "" });
  const [servizi, setServizi] = useState([]);
  const [chi, setChi] = useState(op.id); // "" = il primo libero
  const [scelta, setScelta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [esito, setEsito] = useState(null);
  const occupati = useMemo(() => [...bookings, ...(impegniEventi || [])], [bookings, impegniEventi]);
  const trovati = useMemo(() => { const t = q.trim().toLowerCase(); if (!t) return clients.slice(0, 8); return clients.filter((c) => `${c.name || ""} ${c.phone || ""} ${c.code || ""}`.toLowerCase().includes(t)).slice(0, 12); }, [q, clients]);
  const durata = useMemo(() => impegniServizi(servizi, config.services || []).durata, [servizi, config.services]);
  const abilitati = (sid) => config.services.filter((s) => servizi.includes(s.id) || s.id === sid);
  const salva = async () => {
    if (!cliente || !servizi.length || !scelta) return;
    setBusy(true); setEsito(null);
    let code = cliente.code, listaClienti = null;
    if (cliente.nuovo) { const r = upsertClient({ name: nuovoCl.name.trim(), phone: nuovoCl.phone.trim(), email: nuovoCl.email.trim() }, clients); code = r.code; listaClienti = r.clients; }
    const booking = { id: uid(), date: scelta.date, startMin: scelta.startMin, endMin: scelta.startMin + ((scelta.slot && scelta.slot.durata) || durata), serviceIds: servizi, staffId: scelta.slot ? scelta.slot.staffId : chi, impegni: scelta.slot ? scelta.slot.impegni : undefined, clientCode: code, clientName: cliente.nuovo ? nuovoCl.name.trim() : cliente.name, clientEmail: cliente.nuovo ? nuovoCl.email.trim() : (cliente.email || ""), createdAt: Date.now(), daUtenti: op.id };
    const r = await onSalva(booking, listaClienti);
    setBusy(false);
    if (!r.ok) { setEsito({ ok: false, testo: "Non sono riuscito a salvare: " + r.error }); return; }
    setEsito({ ok: true, testo: `Prenotato: ${booking.clientName}, ${fmtDate(booking.date)} alle ${minToStr(booking.startMin)}.` });
    setTimeout(onFatto, 1200);
  };
  const Passi = () => <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-4">{["Cliente", "Servizi", "Operatore", "Orario"].map((l, i) => <span key={l} className={`px-2 py-1 rounded-full ${passo === i + 1 ? "brand-soft brand-text font-medium" : passo > i + 1 ? "text-stone-600" : ""}`}>{i + 1}. {l}</span>)}</div>;
  const inp = "w-full px-3 py-2.5 rounded-xl border border-stone-300 text-base brand-ring";
  const avanti = (ok, onClick, label = "Avanti") => <button onClick={onClick} disabled={!ok} className="w-full brand-bg font-semibold py-3 rounded-xl mt-4 disabled:opacity-40">{label}</button>;
  if (esito && esito.ok) return <div className="lc-card p-8 text-center"><div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-3"><Check size={28} /></div><p className="font-medium text-stone-900">{esito.testo}</p></div>;
  return (
    <div>
      <Passi />
      {passo === 1 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border border-stone-300 rounded-xl px-3 py-2.5 bg-white brand-ring"><Search size={17} className="text-stone-400" /><input value={q} onChange={(e) => { setQ(e.target.value); setCliente(null); }} placeholder="Cerca la cliente per nome o telefono" className="flex-1 text-base focus:outline-none" /></div>
          <div className="space-y-1.5">{trovati.map((c) => { const on = cliente && cliente.code === c.code; return <button key={c.code} onClick={() => setCliente({ ...c })} className={`w-full text-left px-3 py-2.5 rounded-xl border flex items-center gap-3 ${on ? "brand-border brand-soft" : "bg-white border-stone-200"}`}><span className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-xs font-semibold text-stone-500">{(c.name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block font-medium truncate">{c.name}</span><span className="block text-xs text-stone-400 truncate">{c.phone || "—"}</span></span>{on ? <Check size={18} className="brand-accent" /> : null}</button>; })}</div>
          <button onClick={() => setCliente({ nuovo: true })} className={`w-full text-left px-3 py-2.5 rounded-xl border border-dashed flex items-center gap-2 text-sm ${cliente && cliente.nuovo ? "brand-border brand-soft" : "border-stone-300 text-stone-500"}`}><Plus size={16} /> Nuova cliente</button>
          {cliente && cliente.nuovo ? <div className="space-y-2 lc-fade-up"><input value={nuovoCl.name} onChange={(e) => setNuovoCl({ ...nuovoCl, name: e.target.value })} placeholder="Nome e cognome" className={inp} autoFocus /><input value={nuovoCl.phone} onChange={(e) => setNuovoCl({ ...nuovoCl, phone: e.target.value })} placeholder="Telefono" type="tel" className={inp} /><input value={nuovoCl.email} onChange={(e) => setNuovoCl({ ...nuovoCl, email: e.target.value })} placeholder="Email (facoltativa)" type="email" className={inp} /></div> : null}
          {avanti(cliente && (!cliente.nuovo || nuovoCl.name.trim()), () => setPasso(2))}
        </div>
      ) : passo === 2 ? (
        <div className="space-y-3">
          <p className="text-sm text-stone-500">Tocca i servizi, anche più di uno.{servizi.length ? ` Durata totale ${durata} min.` : ""}</p>
          <div className="space-y-1.5">{config.services.map((s) => { const on = servizi.includes(s.id); return <button key={s.id} onClick={() => { setServizi(on ? servizi.filter((x) => x !== s.id) : [...servizi, s.id]); setScelta(null); }} className={`w-full text-left px-3 py-2.5 rounded-xl border flex items-center gap-3 ${on ? "brand-border brand-soft" : "bg-white border-stone-200"}`}><span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? "brand-bg border-transparent" : "border-stone-300"}`}>{on ? <Check size={13} /> : null}</span><span className="flex-1 min-w-0"><span className="block font-medium truncate">{s.name}</span><span className="block text-xs text-stone-400">{s.durationMin} min{s.price ? ` · ${Number(s.price).toFixed(2).replace(".", ",")} €` : ""}</span></span></button>; })}</div>
          {avanti(servizi.length > 0, () => setPasso(3))}
        </div>
      ) : passo === 3 ? (
        <div className="space-y-3">
          <p className="text-sm text-stone-500">Con chi? Il primo libero sceglie da solo chi può fare questi servizi.</p>
          <div className="space-y-1.5">
            {[{ id: "", name: "Il primo libero", role: "chi è disponibile" }, ...config.staff].map((s) => { const on = chi === s.id; return <button key={s.id || "any"} onClick={() => { setChi(s.id); setScelta(null); }} className={`w-full text-left px-3 py-2.5 rounded-xl border flex items-center gap-3 ${on ? "brand-border brand-soft" : "bg-white border-stone-200"}`}>{s.id ? <AvatarSvg id={avatarIdFor(s)} photo={s.photo} size={36} /> : <span className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center shrink-0"><Users size={16} className="text-stone-400" /></span>}<span className="flex-1 min-w-0"><span className="block font-medium truncate">{s.name}{s.id === op.id ? " (tu)" : ""}</span><span className="block text-xs text-stone-400">{s.role || ""}</span></span>{on ? <Check size={18} className="brand-accent" /> : null}</button>; })}
          </div>
          {avanti(true, () => setPasso(4))}
        </div>
      ) : (
        <div className="space-y-3">
          <SlotPicker config={config} serviceIds={servizi} staffFilter={chi || undefined} bookings={occupati} value={scelta} onChange={setScelta} startDate={todayStr()} />
          {scelta ? <div className="lc-card p-3 text-sm"><div className="font-medium">{cliente.nuovo ? nuovoCl.name : cliente.name}</div><div className="text-stone-500">{servizi.map((id) => (config.services.find((s) => s.id === id) || {}).name).filter(Boolean).join(", ")}</div><div className="text-stone-500 capitalize">{fmtDate(scelta.date)} alle {minToStr(scelta.startMin)}{scelta.slot && scelta.slot.staffId ? ` · con ${(config.staff.find((s) => s.id === scelta.slot.staffId) || {}).name || ""}` : ""}</div></div> : null}
          {esito && !esito.ok ? <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle size={15} /> {esito.testo}</p> : null}
          {avanti(!!scelta && !busy, salva, busy ? "Salvo…" : "Conferma appuntamento")}
        </div>
      )}
      {passo > 1 ? <button onClick={() => setPasso(passo - 1)} className="w-full text-sm text-stone-400 py-3">Indietro</button> : null}
    </div>
  );
}
