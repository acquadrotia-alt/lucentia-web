import { useState, useMemo } from "react";
import { Sparkles, Calendar, Clock, User, Mail, Plus, Trash2, Check, ChevronLeft, ChevronRight, X, Users, CalendarPlus, Phone, Image as ImageIcon, Sunrise, Sun, Moon, Search, Gift, Hash, Ban, UserX, Undo2, Timer, CalendarClock, Wallet, AlertTriangle, Tag, Boxes, Layers, AlertCircle, CalendarRange, CalendarDays, PartyPopper, Share2, Pencil, DoorOpen } from "lucide-react";
import { orariPossibili, durataServizio, impegniServizio, senzaOperatore, impegniBooking, operatoriDelServizio } from "../../orari.js";
import { ESTENSIONI } from "../../cliente/index.jsx";
import { ADVANCE_DAYS, uid, minToStr, strToMin, pd, todayStr, parseDate, addDays, WDAY_SHORT, MONTHS, fmtDate, eur, fileToCoverDataURL, qualifiedStaff, staffOff, salonClosure, upsertClient, loyaltyConfig, clientBalance, matchPackage, STATUS, useMods, FieldIcon, Row } from "./comuni.jsx";

export function SlotPicker({ config, serviceIds, staffFilter, bookings, value, onChange, startDate }) {
  const [weekStart, setWeekStart] = useState(startDate);
  const [date, setDate] = useState(startDate);
  const maxDate = pd(new Date(Date.now() + ADVANCE_DAYS * 864e5));
  const cerca = (ds) => orariPossibili(config, serviceIds, ds, bookings, { staffFilter: staffFilter || undefined, earliest: ds === todayStr() ? new Date().getHours() * 60 + new Date().getMinutes() + 15 : -1 });
  const proposti = useMemo(() => cerca(date), [config, serviceIds, staffFilter, bookings, date]);
  const perOrario = useMemo(() => new Map(proposti.map((x) => [x.start, x])), [proposti]);
  const slotTimes = useMemo(() => proposti.map((x) => x.start), [proposti]);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const d0 = parseDate(weekDays[0]); const d6 = parseDate(weekDays[6]);
  const rangeLabel = `${d0.getDate()} – ${d6.getDate()} ${MONTHS[d6.getMonth()]} ${d6.getFullYear()}`;
  const groups = [
    { label: "Mattina", Icon: Sunrise, times: slotTimes.filter((t) => t < 720) },
    { label: "Pomeriggio", Icon: Sun, times: slotTimes.filter((t) => t >= 720 && t < 1020) },
    { label: "Sera", Icon: Moon, times: slotTimes.filter((t) => t >= 1020) },
  ].filter((g) => g.times.length);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button disabled={weekStart <= todayStr()} onClick={() => setWeekStart((w) => { const p = addDays(w, -7); return p < todayStr() ? todayStr() : p; })} className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ChevronLeft size={18} /></button>
        <span className="text-sm font-medium capitalize">{rangeLabel}</span>
        <button disabled={addDays(weekStart, 7) > maxDate} onClick={() => setWeekStart((w) => addDays(w, 7))} className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((ds) => { const d = parseDate(ds); const beyond = ds > maxDate; const has = !beyond && cerca(ds).length > 0; const isSel = ds === date; return (
          <button key={ds} disabled={!has} onClick={() => { setDate(ds); onChange(null); }} className={`flex flex-col items-center py-2 rounded-xl border transition ${isSel ? "brand-bg border-transparent" : has ? "bg-white border-stone-200 brand-hover" : "bg-stone-50 border-stone-100 text-stone-300 cursor-not-allowed"}`}>
            <span className={`text-xs uppercase ${isSel ? "opacity-80" : "text-stone-400"}`}>{WDAY_SHORT[d.getDay()]}</span>
            <span className="text-base font-semibold leading-tight">{d.getDate()}</span>
          </button>
        ); })}
      </div>
      <div className="mt-5">
        {slotTimes.length === 0 ? <p className="text-sm text-stone-400 bg-stone-50 rounded-lg p-3 text-center">Nessuno slot disponibile per <span className="font-medium">{fmtDate(date)}</span>.</p> : (
          <div className="space-y-4">{groups.map((g) => (
            <div key={g.label}>
              <div className="flex items-center gap-1.5 text-xs font-medium text-stone-400 uppercase tracking-wide mb-2"><g.Icon size={13} className="brand-accent" /> {g.label}</div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">{g.times.map((t) => { const on = value && value.date === date && value.startMin === t; return <button key={t} onClick={() => onChange({ date, startMin: t, slot: perOrario.get(t) })} className={`py-2 rounded-lg border text-sm font-medium transition ${on ? "brand-bg border-transparent" : "bg-white border-stone-200 brand-hover"}`}>{minToStr(t)}</button>; })}</div>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}

export function RescheduleModal({ booking, config, bookings, impegniEventi, onClose, onSave }) {
  const services = config.services, staff = config.staff;
  const dur = booking.endMin - booking.startMin;
  const st = staff.find((s) => s.id === booking.staffId);
  const others = useMemo(() => [...bookings.filter((b) => b.id !== booking.id), ...(impegniEventi || [])], [bookings, booking.id, impegniEventi]);
  const start = booking.date >= todayStr() ? booking.date : todayStr();
  const [pick, setPick] = useState(null);
  const names = booking.serviceIds.map((id) => { const s = services.find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 overflow-auto" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold flex items-center gap-2"><CalendarClock size={16} className="brand-accent" /> Sposta appuntamento</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>
        <p className="text-sm text-stone-400 mb-4">{names} · {st ? st.name : "operatore"} — attuale: {fmtDate(booking.date)} {minToStr(booking.startMin)}</p>
        <SlotPicker config={config} serviceIds={booking.serviceIds} staffFilter={booking.staffId} bookings={others} value={pick} onChange={setPick} startDate={start} />
        <button disabled={!pick} onClick={() => onSave(pick.date, pick.startMin, pick.slot)} className="w-full brand-bg disabled:opacity-40 disabled:cursor-not-allowed font-medium py-2.5 rounded-lg transition mt-5">Conferma nuovo orario</button>
      </div>
    </div>
  );
}

// ---- Eventi del salone -----------------------------------------------------
// Un evento (corso, serata, formazione, open day…) occupa uno o più operatori
// in una fascia oraria: quegli orari non risultano prenotabili. Ogni evento ha
// una pagina pubblica condivisibile via link (?evento=<azienda>:<id>).

export function EventForm({ config, eventi, setEventi, editing, onDone }) {
  const staff = config.staff || [];
  const ev = editing || null;
  const [titolo, setTitolo] = useState(ev ? ev.titolo : "");
  const [date, setDate] = useState(ev ? ev.date : todayStr());
  const [dalle, setDalle] = useState(ev ? minToStr(ev.startMin) : "18:00");
  const [alle, setAlle] = useState(ev ? minToStr(ev.endMin) : "20:00");
  const [staffIds, setStaffIds] = useState(ev ? (ev.staffIds || []) : []);
  const [copertina, setCopertina] = useState(ev ? ev.copertina || null : null);
  const [descrizione, setDescrizione] = useState(ev ? ev.descrizione || "" : "");
  const [dettagli, setDettagli] = useState(ev && Array.isArray(ev.dettagli) ? ev.dettagli : []);
  const [ospiti, setOspiti] = useState(ev && Array.isArray(ev.ospiti) ? ev.ospiti : []);
  const [caricando, setCaricando] = useState(false);
  const toggleStaff = (id) => setStaffIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const onCover = async (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    setCaricando(true);
    try { setCopertina(await fileToCoverDataURL(file, 1000)); } catch (err) { alert("Impossibile caricare l'immagine."); }
    setCaricando(false); e.target.value = "";
  };
  const addDettaglio = () => setDettagli((p) => [...p, { id: uid(), label: "", testo: "" }]);
  const editDettaglio = (id, patch) => setDettagli((p) => p.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const delDettaglio = (id) => setDettagli((p) => p.filter((d) => d.id !== id));
  const addOspite = () => setOspiti((p) => [...p, { id: uid(), nome: "", ruolo: "", foto: null }]);
  const editOspite = (id, patch) => setOspiti((p) => p.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const delOspite = (id) => setOspiti((p) => p.filter((o) => o.id !== id));
  const onFotoOspite = (id) => async (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    try { editOspite(id, { foto: await fileToCoverDataURL(file, 320) }); } catch (err) { alert("Impossibile caricare la foto."); }
    e.target.value = "";
  };
  const startMin = strToMin(dalle), endMin = strToMin(alle);
  const valido = titolo.trim() && date && Number.isFinite(startMin) && Number.isFinite(endMin) && endMin > startMin && staffIds.length > 0;
  const save = () => {
    if (!valido) return;
    const pulito = { id: ev ? ev.id : uid(), titolo: titolo.trim(), date, startMin, endMin, staffIds, copertina, descrizione: descrizione.trim(), dettagli: dettagli.filter((d) => d.label.trim() || d.testo.trim()), ospiti: ospiti.filter((o) => o.nome.trim()), createdAt: ev ? ev.createdAt : Date.now() };
    setEventi(ev ? eventi.map((x) => (x.id === ev.id ? pulito : x)) : [...eventi, pulito]);
    onDone();
  };
  return (
    <div className="bg-white rounded-2xl border-2 brand-border p-5 shadow-sm space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><PartyPopper size={16} className="brand-accent" /> {ev ? "Modifica evento" : "Nuovo evento"}</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Titolo *</div>
          <input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Serata colore & consulenza" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
        </div>
        <div>
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Giorno *</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Dalle *</div>
            <input type="time" value={dalle} step={900} onChange={(e) => setDalle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
          </div>
          <div>
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Alle *</div>
            <input type="time" value={alle} step={900} onChange={(e) => setAlle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
          </div>
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Operatori coinvolti * <span className="normal-case text-stone-300">· i loro orari risulteranno occupati</span></div>
        <div className="flex flex-wrap gap-1.5">{staff.map((st) => { const on = staffIds.includes(st.id); return <button key={st.id} type="button" onClick={() => toggleStaff(st.id)} className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${on ? "brand-bg border-transparent" : "bg-white border-stone-200 text-stone-600 brand-hover"}`}>{st.name}{st.role ? ` · ${st.role}` : ""}</button>; })}</div>
      </div>
      <div>
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Immagine di copertina</div>
        {copertina ? (
          <div className="relative rounded-xl overflow-hidden border border-stone-200">
            <img src={copertina} alt="Copertina evento" className="w-full h-40 object-cover" />
            <button type="button" onClick={() => setCopertina(null)} className="absolute top-2 right-2 bg-white/90 text-stone-600 rounded-lg p-1.5 shadow-sm hover:text-red-500" title="Rimuovi copertina"><Trash2 size={15} /></button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-stone-200 rounded-xl py-6 text-sm text-stone-400 cursor-pointer hover:border-stone-300 hover:text-stone-500 transition">
            <ImageIcon size={17} /> {caricando ? "Caricamento…" : "Carica un'immagine (orizzontale, verrà mostrata sulla pagina dell'evento)"}
            <input type="file" accept="image/*" className="hidden" onChange={onCover} />
          </label>
        )}
      </div>
      <div>
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Descrizione</div>
        <textarea value={descrizione} onChange={(e) => setDescrizione(e.target.value)} rows={3} placeholder="Racconta l'evento: cosa succede, per chi è, come partecipare…" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide">Ospiti dell'evento <span className="normal-case text-stone-300">· es. formatori, artisti, brand ambassador</span></div>
          <button type="button" onClick={addOspite} className="text-xs font-medium brand-accent inline-flex items-center gap-1 hover:underline"><Plus size={13} /> Aggiungi</button>
        </div>
        {ospiti.length === 0 ? <p className="text-xs text-stone-300 mb-3">Nessun ospite: aggiungi chi sarà presente oltre al tuo team — comparirà sulla pagina dell'evento.</p> : (
          <div className="space-y-2 mb-3">{ospiti.map((o) => (
            <div key={o.id} className="flex gap-2 items-center">
              <label className="w-10 h-10 rounded-full border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center cursor-pointer shrink-0 hover:border-stone-300" title="Foto dell'ospite (facoltativa)">
                {o.foto ? <img src={o.foto} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={15} className="text-stone-300" />}
                <input type="file" accept="image/*" className="hidden" onChange={onFotoOspite(o.id)} />
              </label>
              <input value={o.nome} onChange={(e) => editOspite(o.id, { nome: e.target.value })} placeholder="Nome ospite" className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring min-w-0" />
              <input value={o.ruolo} onChange={(e) => editOspite(o.id, { ruolo: e.target.value })} placeholder="Ruolo (es. Color specialist)" className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring min-w-0" />
              <button type="button" onClick={() => delOspite(o.id)} className="p-2 text-stone-400 hover:text-red-500 shrink-0"><Trash2 size={15} /></button>
            </div>
          ))}</div>
        )}
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide">Dettagli dell'evento <span className="normal-case text-stone-300">· es. programma, prezzo, posti</span></div>
          <button type="button" onClick={addDettaglio} className="text-xs font-medium brand-accent inline-flex items-center gap-1 hover:underline"><Plus size={13} /> Aggiungi</button>
        </div>
        {dettagli.length === 0 ? <p className="text-xs text-stone-300">Nessun dettaglio: aggiungi voci come «Prezzo · gratuito», «Posti · max 15», «Programma · …»</p> : (
          <div className="space-y-2">{dettagli.map((d) => (
            <div key={d.id} className="flex gap-2 items-start">
              <input value={d.label} onChange={(e) => editDettaglio(d.id, { label: e.target.value })} placeholder="Etichetta (es. Prezzo)" className="w-36 px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring shrink-0" />
              <input value={d.testo} onChange={(e) => editDettaglio(d.id, { testo: e.target.value })} placeholder="Testo (es. Ingresso gratuito)" className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
              <button type="button" onClick={() => delDettaglio(d.id)} className="p-2 text-stone-400 hover:text-red-500 shrink-0"><Trash2 size={15} /></button>
            </div>
          ))}</div>
        )}
      </div>
      <button disabled={!valido} onClick={save} className="w-full brand-bg disabled:opacity-40 disabled:cursor-not-allowed font-medium py-2.5 rounded-lg transition">{ev ? "Salva modifiche" : "Crea evento"}</button>
    </div>
  );
}

export function EventCard({ ev, staff, big, onClick }) {
  const nomi = (ev.staffIds || []).map((id) => { const s = staff.find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean);
  return (
    <button onClick={onClick} className={`w-full text-left rounded-xl overflow-hidden border transition lc-lift ${big ? "flex items-stretch" : "block"}`} style={{ borderColor: "var(--brand)", background: "var(--brand-soft)" }}>
      {ev.copertina ? <img src={ev.copertina} alt="" className={big ? "w-24 sm:w-36 object-cover shrink-0" : "w-full h-16 object-cover"} /> : null}
      <div className={big ? "flex-1 min-w-0 p-3.5" : "p-2.5"}>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide brand-accent"><PartyPopper size={11} /> Evento</div>
        <div className={`font-semibold text-stone-900 truncate ${big ? "mt-0.5" : "text-xs mt-0.5"}`}>{ev.titolo}</div>
        <div className={`brand-text ${big ? "text-sm" : "text-[11px]"}`}>{minToStr(ev.startMin)}–{minToStr(ev.endMin)}{nomi.length ? ` · ${big ? nomi.join(", ") : nomi.length + " operator" + (nomi.length === 1 ? "e" : "i")}` : ""}</div>
      </div>
    </button>
  );
}

export function EventModal({ ev, staff, aziendaId, onEdit, onDelete, onClose }) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/?evento=${aziendaId}:${ev.id}`;
  const nomi = (ev.staffIds || []).map((id) => { const s = staff.find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) {} };
  const share = async () => { if (navigator.share) { try { await navigator.share({ title: ev.titolo, url }); } catch (e) {} } else copy(); };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 lc-fade-in" onClick={onClose}>
      <div className="lc-card lc-scale-in w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {ev.copertina ? <img src={ev.copertina} alt="" className="w-full h-40 object-cover" /> : null}
        <div className="p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full brand-soft brand-text inline-flex items-center gap-1"><PartyPopper size={11} /> Evento</span>
              <h3 className="font-semibold text-lg text-stone-900 mt-2 tracking-tight">{ev.titolo}</h3>
            </div>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-stone-600"><Calendar size={15} className="text-stone-400 shrink-0" /> {fmtDate(ev.date)} · {minToStr(ev.startMin)}–{minToStr(ev.endMin)}</div>
            {nomi ? <div className="flex items-center gap-2 text-stone-600"><Users size={15} className="text-stone-400 shrink-0" /> {nomi}</div> : null}
            {(ev.ospiti || []).length ? (
              <div className="flex items-center gap-2 text-stone-600 flex-wrap"><Sparkles size={15} className="text-stone-400 shrink-0" /> Ospiti: {ev.ospiti.map((o) => o.nome + (o.ruolo ? ` (${o.ruolo})` : "")).join(", ")}</div>
            ) : null}
            {ev.descrizione ? <p className="text-stone-600 leading-relaxed">{ev.descrizione}</p> : null}
            {(ev.dettagli || []).length ? <div className="space-y-1">{ev.dettagli.map((d) => <div key={d.id} className="text-stone-600"><span className="font-medium text-stone-900">{d.label}</span>{d.label && d.testo ? " · " : ""}{d.testo}</div>)}</div> : null}
          </div>
          <div className="mt-4 border border-stone-200 rounded-xl bg-stone-50 p-3">
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Pagina pubblica dell'evento</div>
            <div className="flex items-center gap-2">
              <input readOnly value={url} onFocus={(e) => e.target.select()} className="flex-1 text-xs bg-transparent focus:outline-none text-stone-600 truncate" />
              <button onClick={copy} className="text-xs font-medium brand-bg px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 shrink-0">{copied ? <><Check size={13} /> Copiato</> : "Copia"}</button>
              <button onClick={share} className="text-xs font-medium border border-stone-300 text-stone-600 px-2 py-1.5 rounded-lg hover:bg-white shrink-0" title="Condividi"><Share2 size={13} /></button>
              <a href={url} target="_blank" rel="noreferrer" className="text-xs font-medium border border-stone-300 text-stone-600 px-2.5 py-1.5 rounded-lg hover:bg-white shrink-0">Apri</a>
            </div>
            <p className="text-[11px] text-stone-400 mt-1.5">Condividilo su WhatsApp, Instagram o con un QR: chi lo apre vede la pagina dell'evento col tuo brand.</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={onEdit} className="font-medium py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition inline-flex items-center justify-center gap-1.5"><Pencil size={15} /> Modifica</button>
            <button onClick={() => { if (confirm("Eliminare questo evento? La pagina pubblica smetterà di funzionare.")) onDelete(); }} className="font-medium py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition inline-flex items-center justify-center gap-1.5"><Trash2 size={15} /> Elimina</button>
          </div>
        </div>
      </div>
    </div>
  );
}
export function ApptItem({ b, staff, services, onCal, onCancel, onEdit, canCancel, cancelHours }) {
  const st = staff.find((s) => s.id === b.staffId);
  const names = b.serviceIds.map((id) => { const s = services.find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  const meta = b.status ? STATUS[b.status] : null;
  const showActions = onCancel || onEdit;
  return (
    <div className={`lc-card p-4 ${b.status && b.status !== "done" ? "opacity-70" : ""}`}>
      <div className="flex gap-4 items-start">
        <div className="text-center shrink-0 w-16"><div className="text-xs text-stone-400 capitalize">{WDAY_SHORT[parseDate(b.date).getDay()]} {parseDate(b.date).getDate()}/{parseDate(b.date).getMonth() + 1}</div><div className="font-semibold brand-accent">{minToStr(b.startMin)}</div></div>
        <div className="w-px self-stretch bg-stone-100" />
        <div className="flex-1 min-w-0">
          <div className="font-medium flex items-center gap-2 flex-wrap">{names}{meta ? <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${meta.cls}`}><meta.Icon size={11} /> {meta.label}</span> : null}</div>
          <div className="text-xs text-stone-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-1"><span className="flex items-center gap-1"><User size={12} /> {st ? st.name : "—"}</span><span className="flex items-center gap-1"><Clock size={12} /> {minToStr(b.startMin)}–{minToStr(b.endMin)}</span></div>
        </div>
        {onCal && !b.status ? <button onClick={() => onCal(b)} className="shrink-0 text-stone-400 hover:brand-accent p-1" title="Calendario"><CalendarPlus size={18} /></button> : null}
      </div>
      {showActions ? <div className="mt-3 pt-3 border-t border-stone-100">{canCancel ? (
        <div className="flex flex-wrap gap-2">
          {onEdit ? <button onClick={onEdit} className="flex items-center gap-1 text-xs font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50"><CalendarClock size={14} /> Modifica</button> : null}
          {onCancel ? <button onClick={onCancel} className="flex items-center gap-1 text-xs font-medium border border-red-300 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50"><Ban size={14} /> Annulla</button> : null}
        </div>
      ) : <span className="text-xs text-stone-400">Modifiche e annullamenti fino a {cancelHours} ore prima.</span>}</div> : null}
    </div>
  );
}

export function AgendaPage({ config, bookings, setBookings, clients, setClients, sales, catalog, hidePartial, canAddBooking, canAddClient, onlineBk, onImportOnline, onCancelOnline, canManageOnline, eventi, setEventi, impegniEventi, aziendaId }) {
  const [adding, setAdding] = useState(false);
  const [addingEv, setAddingEv] = useState(false);
  const [editingEv, setEditingEv] = useState(null);
  const onlineCount = (onlineBk || []).length;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-stone-900 leading-none">Agenda</h2>
          <p className="text-[13px] text-stone-400 mt-1">Appuntamenti e disponibilità{onlineCount ? <span className="brand-accent font-medium"> · {onlineCount} online</span> : null}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setAddingEv((a) => !a); setAdding(false); setEditingEv(null); }} className="flex items-center gap-1.5 text-sm font-medium border brand-border brand-accent bg-white px-3.5 py-2 rounded-lg shadow-[var(--lc-shadow-xs)] hover:brand-soft transition">{addingEv ? <X size={15} /> : <PartyPopper size={15} />} {addingEv ? "Chiudi" : "Evento"}</button>
          <button onClick={() => { setAdding((a) => !a); setAddingEv(false); }} className="flex items-center gap-1.5 text-sm font-medium brand-bg px-3.5 py-2 rounded-lg shadow-[var(--lc-shadow-xs)] hover:shadow-[var(--lc-shadow-sm)]">{adding ? <X size={15} /> : <Plus size={15} />} {adding ? "Chiudi" : "Appuntamento"}</button>
        </div>
      </div>
      {adding ? <ManualBooking config={config} bookings={bookings} setBookings={setBookings} clients={clients} setClients={setClients} canAddBooking={canAddBooking} canAddClient={canAddClient} impegniEventi={impegniEventi} onDone={() => setAdding(false)} /> : null}
      {addingEv ? <EventForm config={config} eventi={eventi} setEventi={setEventi} onDone={() => setAddingEv(false)} /> : null}
      {editingEv ? <EventForm config={config} eventi={eventi} setEventi={setEventi} editing={editingEv} onDone={() => setEditingEv(null)} /> : null}
      <AgendaView config={config} bookings={bookings} setBookings={setBookings} clients={clients} setClients={setClients} sales={sales} catalog={catalog} hidePartial={hidePartial} onlineBk={onlineBk || []} onImportOnline={onImportOnline} onCancelOnline={onCancelOnline} canManageOnline={canManageOnline} eventi={eventi} setEventi={setEventi} impegniEventi={impegniEventi} aziendaId={aziendaId} onEditEvento={(ev) => { setEditingEv(ev); setAddingEv(false); setAdding(false); }} />
    </div>
  );
}

export const VIEW_MODES = [["day", "Giorno", CalendarDays], ["3day", "3 giorni", CalendarRange], ["week", "Settimana", Calendar]];
export function mondayOf(dateStr) { const d = parseDate(dateStr); const wd = (d.getDay() + 6) % 7; return addDays(dateStr, -wd); }

export function AgendaView({ config, bookings, setBookings, clients, setClients, sales, catalog, hidePartial, onlineBk, onImportOnline, onCancelOnline, canManageOnline, eventi, setEventi, impegniEventi, aziendaId, onEditEvento }) {
  const staff = config.staff, services = config.services;
  const [anchor, setAnchor] = useState(todayStr());
  const [mode, setMode] = useState("day");
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState(null);
  const [selOnline, setSelOnline] = useState(null);
  const [selEvento, setSelEvento] = useState(null);
  const [resch, setResch] = useState(null);
  // "elenco" è la lista di sempre; "studio" è la linea del tempo, che mostra
  // quante persone sono in salone contemporaneamente.
  const [vista, setVista] = useState("elenco");

  const span = mode === "week" ? 7 : mode === "3day" ? 3 : 1;
  const days = useMemo(() => { const start = mode === "week" ? mondayOf(anchor) : anchor; return Array.from({ length: span }, (_, i) => addDays(start, i)); }, [anchor, mode, span]);
  // Un appuntamento può impegnare più operatori: il filtro guarda tutte le
  // risorse coinvolte, non solo l'operatore principale.
  const coinvolge = (b, id) => id === "all" || impegniBooking(b).some((i) => i.risorsaId === id);
  const byDay = useMemo(() => { const m = {}; days.forEach((ds) => { const reg = bookings.filter((b) => b.date === ds && coinvolge(b, filter) && !(hidePartial && b.status === "partial")); const onl = (onlineBk || []).filter((b) => b.date === ds && coinvolge(b, filter)); const evs = (eventi || []).filter((ev) => ev.date === ds && (filter === "all" || (ev.staffIds || []).includes(filter))).map((ev) => ({ ...ev, _evento: true })); m[ds] = [...reg, ...onl, ...evs].sort((a, b) => a.startMin - b.startMin); }); return m; }, [bookings, onlineBk, eventi, days, filter, hidePartial]);
  const totalCount = days.reduce((a, ds) => a + byDay[ds].filter((x) => !x._evento).length, 0);
  const eventCount = days.reduce((a, ds) => a + byDay[ds].filter((x) => x._evento).length, 0);

  const shift = (dir) => setAnchor((a) => addDays(mode === "week" ? mondayOf(a) : a, dir * span));
  const consumesStatus = (s) => s === "done" || s === "partial";
  const setStatus = (id, status, amount) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) { setSel(null); return; }
    const now = consumesStatus(status);
    let patch = { status };
    if (now) patch.amount = (amount === "" || amount == null) ? null : (Number(amount) || 0);
    else patch.amount = null;
    if (now && !b.packageUsed && b.clientCode) {
      const cl = clients.find((c) => c.code === b.clientCode);
      const pkg = matchPackage(cl, b.serviceIds);
      if (pkg) {
        setClients(clients.map((c) => (c.code === b.clientCode ? { ...c, packages: (c.packages || []).map((p) => (p.id === pkg.id ? { ...p, used: (Number(p.used) || 0) + 1 } : p)) } : c)));
        patch.packageUsed = { packageId: pkg.id, serviceId: pkg.serviceId };
      }
    } else if (!now && b.packageUsed) {
      const pu = b.packageUsed;
      setClients(clients.map((c) => (c.code === b.clientCode ? { ...c, packages: (c.packages || []).map((p) => (p.id === pu.packageId ? { ...p, used: Math.max(0, (Number(p.used) || 0) - 1) } : p)) } : c)));
      patch.packageUsed = null;
    }
    setBookings(bookings.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setSel(null);
  };
  // Spostando l'appuntamento cambiano anche le risorse impegnate e i minuti in
  // cui lo sono: vanno riscritti, altrimenti resterebbero al vecchio orario.
  const applyResch = (bk, d2, startMin, slot) => {
    const dur = bk.endMin - bk.startMin;
    const patch = slot
      ? { date: d2, startMin, endMin: startMin + (slot.durata || dur), staffId: slot.staffId, impegni: slot.impegni }
      : { date: d2, startMin, endMin: startMin + dur };
    setBookings(bookings.map((x) => (x.id === bk.id ? { ...x, ...patch } : x)));
    setResch(null);
  };

  const first = parseDate(days[0]), last = parseDate(days[days.length - 1]);
  const rangeLabel = mode === "day" ? fmtDate(anchor) : `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 bg-stone-100/80 rounded-xl p-1">
          {VIEW_MODES.map((m) => { const k = m[0], l = m[1], Icon = m[2]; return (
            <button key={k} onClick={() => { setMode(k); if (k !== "day") setVista("elenco"); }} aria-current={mode === k ? "true" : undefined} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ${mode === k ? "bg-white shadow-[var(--lc-shadow-xs)] text-stone-900" : "text-stone-500 hover:text-stone-700"}`}><Icon size={15} /><span className="hidden sm:inline">{l}</span></button>
          ); })}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-stone-100/80 rounded-xl p-1">
            {[["elenco", "Elenco", CalendarDays], ["studio", "Studio", Boxes]].map(([k, l, Icon]) => (
              <button key={k} onClick={() => { setVista(k); if (k === "studio") setMode("day"); }} aria-current={vista === k ? "true" : undefined}
                title={k === "studio" ? "La giornata a griglia: in colonna operatori e cabine, in riga le ore" : "Elenco degli appuntamenti"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${vista === k ? "bg-white shadow-[var(--lc-shadow-xs)] text-stone-900" : "text-stone-500 hover:text-stone-700"}`}><Icon size={15} /><span className="hidden sm:inline">{l}</span></button>
            ))}
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring transition-colors hover:border-stone-400"><option value="all">Tutti gli operatori</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button onClick={() => shift(-1)} aria-label="Periodo precedente" className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:border-stone-300 hover:shadow-[var(--lc-shadow-xs)] transition"><ChevronLeft size={18} /></button>
        <div className="text-center min-w-0 px-2">
          <div className="font-semibold capitalize truncate tracking-tight text-stone-900">{rangeLabel}</div>
          <button onClick={() => setAnchor(todayStr())} className="text-xs brand-accent hover:underline">Oggi</button>
        </div>
        <button onClick={() => shift(1)} aria-label="Periodo successivo" className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:border-stone-300 hover:shadow-[var(--lc-shadow-xs)] transition"><ChevronRight size={18} /></button>
      </div>

      {mode === "day" ? (
        <div className="space-y-2">
          {byDay[days[0]].length === 0 ? (
            <div className="lc-fade-up flex flex-col items-center justify-center text-center py-14 rounded-2xl border border-dashed border-stone-200 bg-white/40">
              <div className="w-12 h-12 rounded-full brand-soft flex items-center justify-center mb-3"><CalendarDays size={22} className="brand-accent" /></div>
              <p className="text-sm font-medium text-stone-600">Nessun appuntamento</p>
              <p className="text-xs text-stone-400 mt-1">Tocca «Appuntamento» in alto per aggiungerne uno.</p>
            </div>
          ) : vista === "studio" ? (
            <VistaStudio giorno={days[0]} items={byDay[days[0]]} staff={staff} cabine={config.cabine} filtro={filter}
              onApri={(b) => (b._evento ? setSelEvento(b) : b.online ? setSelOnline(b) : setSel(b))} />
          ) : byDay[days[0]].map((b, i) => (b._evento ? <EventCard key={b.id} ev={b} staff={staff} big onClick={() => setSelEvento(b)} /> : <ApptCard key={b.id} b={b} staff={staff} services={services} cabine={config.cabine} big index={i} onClick={() => (b.online ? setSelOnline(b) : setSel(b))} />))}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <div className="flex gap-2" style={{ minWidth: mode === "week" ? 980 : 540 }}>
            {days.map((ds) => { const list = byDay[ds]; const d = parseDate(ds); const isToday = ds === todayStr(); return (
              <div key={ds} className="flex-1" style={{ minWidth: 0 }}>
                <div className={`text-center rounded-lg py-1.5 mb-2 transition-colors ${isToday ? "brand-soft brand-text" : "text-stone-500"}`}>
                  <div className="text-[10px] uppercase tracking-wide font-medium">{WDAY_SHORT[d.getDay()]}</div>
                  <div className={`text-sm font-semibold leading-none mt-0.5 ${isToday ? "" : "text-stone-700"}`}>{d.getDate()}<span className="text-stone-400 font-normal">/{d.getMonth() + 1}</span></div>
                </div>
                <div className="space-y-1.5">
                  {list.length === 0 ? <div className="text-center text-xs text-stone-300 py-4 rounded-lg border border-dashed border-stone-200/70">—</div> : list.map((b, i) => (b._evento ? <EventCard key={b.id} ev={b} staff={staff} onClick={() => setSelEvento(b)} /> : <ApptCard key={b.id} b={b} staff={staff} services={services} cabine={config.cabine} index={i} onClick={() => (b.online ? setSelOnline(b) : setSel(b))} />))}
                </div>
              </div>
            ); })}
          </div>
        </div>
      )}

      {totalCount + eventCount > 0 ? <p className="text-xs text-stone-400 text-center pt-1">{totalCount} appuntament{totalCount === 1 ? "o" : "i"}{eventCount ? ` e ${eventCount} event${eventCount === 1 ? "o" : "i"}` : ""} nel periodo · tocca una card per gestirla</p> : null}

      {sel ? <ApptActions booking={sel} config={config} clients={clients} setClients={setClients} bookings={bookings} sales={sales} catalog={catalog} hidePartial={hidePartial} onStatus={setStatus} onResch={(bk) => { setResch(bk); setSel(null); }} onClose={() => setSel(null)} /> : null}
      {selOnline ? <OnlineApptModal booking={selOnline} config={config} canManage={canManageOnline} onImport={(bk) => { onImportOnline && onImportOnline(bk); setSelOnline(null); }} onCancel={(bk) => { onCancelOnline && onCancelOnline(bk); setSelOnline(null); }} onClose={() => setSelOnline(null)} /> : null}
      {resch ? <RescheduleModal booking={resch} config={config} bookings={bookings} impegniEventi={impegniEventi} onClose={() => setResch(null)} onSave={(d2, startMin, slot) => applyResch(resch, d2, startMin, slot)} /> : null}
      {selEvento ? <EventModal ev={selEvento} staff={staff} aziendaId={aziendaId} onEdit={() => { onEditEvento && onEditEvento(eventi.find((e) => e.id === selEvento.id)); setSelEvento(null); }} onDelete={() => { setEventi(eventi.filter((e) => e.id !== selEvento.id)); setSelEvento(null); }} onClose={() => setSelEvento(null)} /> : null}
    </div>
  );
}

export function OnlineApptModal({ booking, config, canManage, onImport, onCancel, onClose }) {
  const b = booking;
  const st = config.staff.find((s) => s.id === b.staffId);
  const names = (b.serviceIds || []).map((id) => { const s = config.services.find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  const wa = b.clientPhone ? ("39" + String(b.clientPhone).replace(/\D/g, "")) : "";
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 lc-fade-in" onClick={onClose}>
      <div className="lc-card lc-scale-in w-full max-w-sm p-5 overflow-auto" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full brand-soft brand-text inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--brand)" }} /> Prenotazione online</span>
            <h3 className="font-semibold text-lg text-stone-900 mt-2 tracking-tight">{b.clientName || "Cliente"}</h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>
        <div className="space-y-2 text-sm">
          <Row icon={Tag} label={names || "—"} />
          <Row icon={Calendar} label={`${fmtDate(b.date)} · ${minToStr(b.startMin)}–${minToStr(b.endMin)}`} />
          <Row icon={User} label={st ? st.name : "Operatore da assegnare"} />
          {b.clientPhone ? <div className="flex items-center gap-2"><Phone size={15} className="text-stone-400 shrink-0" /><a href={`tel:${b.clientPhone}`} className="brand-accent font-medium">{b.clientPhone}</a>{wa ? <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="text-xs text-green-600 ml-1">WhatsApp</a> : null}</div> : null}
          {b.note ? <div className="flex items-start gap-2 text-stone-600"><AlertCircle size={15} className="text-stone-400 shrink-0 mt-0.5" /><span>{b.note}</span></div> : null}
        </div>
        <div className="mt-3"><DettaglioAppuntamento b={b} config={config} /></div>
        {canManage ? (
          <div className="mt-5 space-y-2">
            <button onClick={() => onImport(b)} className="w-full brand-bg font-medium py-2.5 rounded-xl flex items-center justify-center gap-1.5"><Check size={16} /> Aggiungi all'agenda</button>
            <button onClick={() => { if (confirm("Annullare questa prenotazione online?")) onCancel(b); }} className="w-full font-medium py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition">Annulla prenotazione</button>
            <p className="text-[11px] text-stone-400 text-center leading-relaxed">«Aggiungi all'agenda» la sposta tra i tuoi appuntamenti e potrai gestirla normalmente.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const initials = (name) => (name || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "—";

// Chi e cosa è impegnato da un appuntamento: con più operatori o una cabina il
// solo staffId non basta più a raccontarlo.
export function risorseDi(b, staff, cabine) {
  const ids = [...new Set(impegniBooking(b).map((i) => i.risorsaId).filter(Boolean))];
  const persone = ids.map((id) => (staff || []).find((x) => x.id === id)).filter(Boolean).map((x) => x.name);
  const stanze = ids.map((id) => (cabine || []).find((c) => c.id === id)).filter(Boolean).map((c) => c.name);
  return { persone, stanze, etichetta: [persone.join(", "), stanze.join(", ")].filter(Boolean).join(" · ") || "—" };
}

// ---- Vista studio: colonne le risorse, righe le ore -----------------------
// Un elenco non fa vedere chi sta facendo cosa: con i servizi a fasi possono
// esserci sei clienti con tre operatori, perché qualcuno è in posa e qualcun
// altro è in cabina da solo. Qui ogni colonna è una risorsa — un operatore o
// una cabina — e la giornata scorre dall'alto verso il basso.
export const TIPI_STUDIO = [["operatori", "Operatori", Users], ["cabine", "Cabine", DoorOpen], ["entrambi", "Entrambi", Boxes]];

// Incolonna i blocchi che si sovrappongono su corsie affiancate. Per una
// cabina le corsie sono le sue postazioni; per un operatore sono gli
// appuntamenti sovrapposti volutamente dal banco.
export function corsieDi(segmenti) {
  const corsie = [];
  for (const s of [...segmenti].sort((a, b) => a.from - b.from || a.to - b.to)) {
    let i = corsie.findIndex((c) => c[c.length - 1].to <= s.from);
    if (i < 0) { corsie.push([s]); i = corsie.length - 1; } else corsie[i].push(s);
    s._corsia = i;
  }
  return { segmenti, corsie: Math.max(1, corsie.length) };
}

export function VistaStudio({ giorno, items, staff, cabine, filtro, onApri }) {
  const [tipo, setTipo] = useState("entrambi");
  const SCALA = 1.5; // pixel per minuto
  const GUTTER = 48;  // colonna delle ore
  const CIMA = 10;    // aria sopra la prima ora, per non tagliarne l'etichetta

  const fasiDi = (b) => (b._evento
    ? (b.staffIds || []).map((id) => ({ tipo: "operatore", risorsaId: id, from: b.startMin, to: b.endMin }))
    : impegniBooking(b));
  const conFasi = items.map((b) => ({ b, fasi: fasiDi(b) }));

  const nome = (id) => {
    const st = (staff || []).find((x) => x.id === id);
    if (st) return st.name;
    const c = (cabine || []).find((x) => x.id === id);
    return c ? c.name : "—";
  };

  // Le colonne: gli operatori (uno solo se il menù ne ha scelto uno) e le
  // cabine, secondo l'opzione attiva.
  const colonne = useMemo(() => {
    const out = [];
    if (tipo !== "cabine") for (const s of (staff || [])) {
      if (filtro !== "all" && s.id !== filtro) continue;
      out.push({ id: s.id, name: s.name, cabina: false, capacita: 1, staff: s });
    }
    if (tipo !== "operatori") for (const c of (cabine || [])) {
      out.push({ id: c.id, name: c.name, cabina: true, capacita: Math.max(1, Number(c.quantita) || 1) });
    }
    return out;
  }, [staff, cabine, tipo, filtro]);

  // A ogni colonna i suoi segmenti, già divisi in corsie.
  const perColonna = useMemo(() => colonne.map((col) => {
    const segmenti = [];
    for (const { b, fasi } of conFasi) for (const f of fasi) {
      if (f.risorsaId !== col.id) continue;
      segmenti.push({ b, from: f.from, to: f.to });
    }
    return { col, ...corsieDi(segmenti) };
  }), [colonne, items]);

  const collocati = new Set(perColonna.flatMap((c) => c.segmenti.map((s) => s.b.id)));
  const fuori = items.filter((b) => !collocati.has(b.id));

  if (!items.length) return (
    <div className="lc-fade-up flex flex-col items-center justify-center text-center py-14 rounded-2xl border border-dashed border-stone-200 bg-white/40">
      <div className="w-12 h-12 rounded-full brand-soft flex items-center justify-center mb-3"><CalendarDays size={22} className="brand-accent" /></div>
      <p className="text-sm font-medium text-stone-600">Nessun appuntamento</p>
      <p className="text-xs text-stone-400 mt-1">Tocca «Appuntamento» in alto per aggiungerne uno.</p>
    </div>
  );

  // La giornata mostrata: dal primo impegno all'ultimo, arrotondata all'ora.
  const tutti = conFasi.flatMap((x) => x.fasi);
  const inizi = [...tutti.map((f) => f.from), ...items.map((b) => b.startMin)];
  const fini = [...tutti.map((f) => f.to), ...items.map((b) => b.endMin)];
  const t0 = Math.floor(Math.min(...inizi) / 60) * 60;
  const t1 = Math.ceil(Math.max(...fini) / 60) * 60;
  const y = (t) => (t - t0) * SCALA + CIMA;
  const altezza = (t1 - t0) * SCALA + CIMA * 2;
  const ore = [];
  for (let t = t0; t <= t1; t += 30) ore.push(t);
  const adesso = giorno === todayStr() ? new Date().getHours() * 60 + new Date().getMinutes() : null;
  const largCol = (c) => Math.max(124, 78 * c.corsie);
  const larghezza = perColonna.reduce((a, c) => a + largCol(c), 0);

  const selettore = (
    <div className="flex gap-1 bg-stone-100/80 rounded-xl p-1 self-start">
      {TIPI_STUDIO.map(([k, l, Icon]) => (
        <button key={k} onClick={() => setTipo(k)} aria-current={tipo === k ? "true" : undefined}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${tipo === k ? "bg-white shadow-[var(--lc-shadow-xs)] text-stone-900" : "text-stone-500 hover:text-stone-700"}`}><Icon size={14} /> {l}</button>
      ))}
    </div>
  );

  if (!colonne.length) return (
    <div className="space-y-2">
      {selettore}
      <div className="flex flex-col items-center justify-center text-center py-12 rounded-2xl border border-dashed border-stone-200 bg-white/40">
        <div className="w-12 h-12 rounded-full brand-soft flex items-center justify-center mb-3"><DoorOpen size={22} className="brand-accent" /></div>
        <p className="text-sm font-medium text-stone-600">{tipo === "cabine" ? "Nessuna cabina configurata" : "Nessun operatore"}</p>
        <p className="text-xs text-stone-400 mt-1">Le aggiungi in Impostazioni → Operatori e cabine.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {selettore}
        <span className="text-xs text-stone-500">{colonne.length} colonn{colonne.length === 1 ? "a" : "e"} · {items.length} in agenda</span>
      </div>

      <div className="overflow-auto -mx-1 px-1 pb-1 border border-stone-200/70 rounded-xl bg-white" style={{ maxHeight: "72vh" }}>
        <div style={{ width: larghezza + GUTTER, minWidth: "100%" }}>
          {/* intestazione delle colonne */}
          <div className="flex sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-stone-200">
            <div className="shrink-0 sticky left-0 z-10 bg-white/95" style={{ width: GUTTER }} />
            {perColonna.map(({ col, corsie }) => (
              <div key={col.id} className="shrink-0 grow px-2 py-2 border-l border-stone-100 min-w-0" style={{ flexBasis: largCol({ corsie }) }}>
                <div className="flex items-center gap-1.5 min-w-0">
                  {col.cabina
                    ? <span className="w-6 h-6 rounded-md bg-stone-100 text-stone-500 flex items-center justify-center shrink-0"><DoorOpen size={13} /></span>
                    : <span className="w-6 h-6 rounded-full brand-soft brand-text text-[9px] font-semibold flex items-center justify-center shrink-0">{initials(col.name)}</span>}
                  <span className="text-[12px] font-medium truncate text-stone-800">{col.name}</span>
                  {col.capacita > 1 ? <span className="text-[10px] text-stone-400 shrink-0">×{col.capacita}</span> : null}
                </div>
              </div>
            ))}
          </div>

          {/* griglia */}
          <div className="relative flex" style={{ height: altezza }}>
            {/* righe delle ore */}
            {ore.map((t) => (
              <div key={t} className={`absolute left-0 right-0 ${t % 60 === 0 ? "border-t border-stone-200" : "border-t border-stone-100"}`} style={{ top: y(t) }} />
            ))}
            {/* colonna delle ore */}
            <div className="shrink-0 sticky left-0 z-10 bg-white/95 backdrop-blur relative" style={{ width: GUTTER }}>
              {ore.filter((t) => t % 60 === 0).map((t) => (
                <span key={t} className="absolute right-1.5 -translate-y-1/2 text-[10px] text-stone-400 tabular-nums" style={{ top: y(t) }}>{minToStr(t)}</span>
              ))}
            </div>
            {perColonna.map(({ col, segmenti, corsie }) => {
              const w = largCol({ corsie });
              return (
                <div key={col.id} className="shrink-0 grow relative border-l border-stone-100" style={{ flexBasis: w }}>
                  {segmenti.map((s, i) => {
                    const b = s.b;
                    const alt = Math.max((s.to - s.from) * SCALA, 16);
                    const larg = 100 / corsie;
                    const nomeCliente = b._evento ? b.titolo : b.clientName;
                    const annullato = b.status === "cancelled" || b.status === "noshow";
                    return (
                      <button key={`${b.id}-${i}`} onClick={() => onApri(b)}
                        title={`${nomeCliente} · ${minToStr(s.from)}–${minToStr(s.to)} · ${col.name}`}
                        className={`absolute rounded-md px-1.5 py-0.5 text-left overflow-hidden transition hover:brightness-95 hover:shadow-[var(--lc-shadow-xs)] ${annullato ? "opacity-45 line-through" : ""}`}
                        style={{ top: y(s.from), height: alt, left: `calc(${s._corsia * larg}% + 2px)`, width: `calc(${larg}% - 4px)`,
                          background: col.cabina ? "#e7e5e4" : "var(--brand)", color: col.cabina ? "#44403c" : "#fff" }}>
                        <div className="text-[11px] font-medium leading-tight truncate">{nomeCliente}</div>
                        {alt >= 30 ? <div className={`text-[10px] leading-tight truncate ${col.cabina ? "text-stone-500" : "opacity-80"}`}>{minToStr(s.from)}–{minToStr(s.to)}</div> : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {/* l'ora corrente */}
            {adesso != null && adesso >= t0 && adesso <= t1 ? (
              <div className="absolute left-0 right-0 h-px bg-red-400/80 pointer-events-none z-10" style={{ top: y(adesso) }}>
                <span className="absolute -top-1 left-0 w-2 h-2 rounded-full bg-red-400" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-stone-400">Le colonne sono le risorse, le righe le ore. Un appuntamento compare in ogni colonna che occupa: il colore pieno è un operatore, il grigio una cabina. Lo spazio vuoto fra due blocchi dello stesso cliente è tempo in cui non impegna nessuno — per esempio una posa. Tocca un blocco per aprirlo.</p>
      {fuori.length ? <p className="text-[11px] text-stone-400">{fuori.length} appuntament{fuori.length === 1 ? "o" : "i"} non compare{fuori.length === 1 ? "" : "no"} qui: non impegna{fuori.length === 1 ? "" : "no"} {tipo === "cabine" ? "nessuna cabina" : tipo === "operatori" ? "nessun operatore" : "nessuna delle risorse mostrate"}.</p> : null}
    </div>
  );
}

export function ApptCard({ b, staff, services, cabine, onClick, big, index = 0 }) {
  const st = staff.find((s) => s.id === b.staffId);
  const ris = risorseDi(b, staff, cabine);
  const names = b.serviceIds.map((id) => { const s = services.find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  const meta = b.status ? STATUS[b.status] : null;
  const muted = b.status === "cancelled" || b.status === "noshow";
  const delay = `${Math.min(index * 40, 320)}ms`;

  if (big) {
    return (
      <button onClick={onClick} style={{ animationDelay: delay }} className={`lc-fade-up group w-full text-left flex items-stretch gap-3 rounded-xl border p-3 transition-[box-shadow,border-color,transform] duration-200 ${muted ? "bg-stone-50/70 border-stone-200/70" : "bg-white border-stone-200/80 hover:border-stone-300 hover:shadow-[var(--lc-shadow-md)]"}`}>
        <div className="flex flex-col items-center justify-center w-14 shrink-0 border-r border-stone-100 pr-3">
          <span className={`text-sm font-semibold tabular-nums leading-tight ${muted ? "text-stone-400" : "brand-accent"}`}>{minToStr(b.startMin)}</span>
          <span className="text-[11px] text-stone-400 tabular-nums">{minToStr(b.endMin)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[15px] font-semibold truncate leading-tight ${muted ? "text-stone-500" : "text-stone-900"}`}>{b.clientName}{b.clientCode ? <span className="text-xs text-stone-400 font-normal"> #{b.clientCode}</span> : null}</div>
          <div className="text-[13px] text-stone-500 truncate mt-0.5">{names || "—"}</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-400">
            <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-stone-100 text-[9px] font-semibold text-stone-500 shrink-0">{ris.persone.length ? initials(ris.persone[0]) : <DoorOpen size={10} />}</span>
            <span className="truncate">{ris.etichetta}</span>
          </div>
        </div>
        <div className="flex flex-col items-end justify-between shrink-0">
          {b.online ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full brand-soft brand-text inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--brand)" }} /> Online</span>
            : meta ? <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${meta.cls}`}><meta.Icon size={10} /> {meta.label}</span>
            : <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full brand-soft brand-text">Da svolgere</span>}
          <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5 transition" />
        </div>
      </button>
    );
  }
  return (
    <button onClick={onClick} style={{ animationDelay: delay }} className={`lc-fade-up w-full text-left rounded-lg border p-2 transition-[box-shadow,border-color] duration-200 ${muted ? "bg-stone-50/70 border-stone-200/70" : "bg-white border-stone-200/80 hover:border-stone-300 hover:shadow-sm"}`}>
      <div className="flex items-center justify-between gap-1">
        <span className={`text-xs font-semibold tabular-nums ${muted ? "text-stone-400" : "brand-accent"}`}>{minToStr(b.startMin)}</span>
        {b.online ? <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--brand)" }} /> : meta ? <meta.Icon size={11} className="text-stone-400 shrink-0" /> : null}
      </div>
      <div className={`text-[13px] font-medium truncate mt-0.5 ${muted ? "text-stone-500" : "text-stone-800"}`}>{b.clientName}</div>
      <div className="text-[11px] text-stone-500 truncate">{names}</div>
    </button>
  );
}

// ---- Dettaglio di un appuntamento: la sua linea del tempo e i servizi -----
// Con i servizi a fasi "dalle 9 alle 10:30 con Sara" non racconta più niente:
// serve vedere quando ciascuna risorsa è impegnata davvero, dov'è la posa e
// che cosa prevede ogni servizio.
export function DettaglioAppuntamento({ b, config }) {
  const staff = (config && config.staff) || [], cabine = (config && config.cabine) || [], services = (config && config.services) || [];
  const nome = (id) => {
    const st = staff.find((x) => x.id === id);
    if (st) return st.name;
    const c = cabine.find((x) => x.id === id);
    return c ? c.name : "—";
  };
  const eCabina = (id) => cabine.some((c) => c.id === id);
  const fasi = impegniBooking(b).slice().sort((a, b2) => a.from - b2.from);
  const t0 = Math.min(b.startMin, ...fasi.map((f) => f.from));
  const t1 = Math.max(b.endMin, ...fasi.map((f) => f.to));
  const span = Math.max(1, t1 - t0);
  const pos = (v) => `${((v - t0) / span) * 100}%`;
  const risorse = [...new Set(fasi.map((f) => f.risorsaId).filter(Boolean))];

  // I minuti in cui il cliente è qui ma non occupa nessuno: la posa, l'attesa.
  const liberi = (() => {
    const out = [];
    let cursore = t0;
    for (const f of fasi) {
      if (f.from > cursore) out.push({ from: cursore, to: f.from });
      cursore = Math.max(cursore, f.to);
    }
    if (cursore < t1) out.push({ from: cursore, to: t1 });
    return out.filter((x) => x.to - x.from >= 5);
  })();

  // Le fasi previste da ogni servizio, con l'orario che hanno in questo
  // appuntamento. Il nome di chi le fa lo dice l'assegnazione già salvata.
  const usate = new Set();
  const dettaglio = [];
  let offset = 0;
  for (const id of (b.serviceIds || [])) {
    const svc = services.find((s) => s.id === id);
    if (!svc) continue;
    const righe = impegniServizio(svc).map((s) => {
      const from = b.startMin + offset + s.da, to = from + s.durata;
      const cand = fasi.findIndex((f, i) => !usate.has(i) && f.from === from && f.to === to
        && (s.tipo === "cabina" ? eCabina(f.risorsaId) : !eCabina(f.risorsaId))
        && (!s.cabinaId || f.risorsaId === s.cabinaId));
      if (cand >= 0) usate.add(cand);
      const risorsaId = cand >= 0 ? fasi[cand].risorsaId : (s.cabinaId || null);
      return { ...s, from, to, risorsaId, etichetta: risorsaId ? nome(risorsaId) : (s.tipo === "cabina" ? "Cabina da assegnare" : `Operatore ${s.posto}`) };
    });
    dettaglio.push({ svc, righe, da: b.startMin + offset, a: b.startMin + offset + durataServizio(svc) });
    offset += durataServizio(svc);
  }

  return (
    <div className="border border-stone-200 rounded-xl p-3 mb-4">
      <div className="text-sm font-medium flex items-center gap-1.5 mb-2"><Clock size={15} className="brand-accent" /> Come si svolge</div>
      <div className="space-y-1.5">
        {risorse.map((rid) => (
          <div key={rid} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-[11px] text-stone-500 truncate flex items-center gap-1">
              {eCabina(rid) ? <DoorOpen size={11} className="text-stone-400 shrink-0" /> : <User size={11} className="text-stone-400 shrink-0" />}{nome(rid)}
            </span>
            <div className="relative flex-1 h-5 rounded-md bg-stone-100">
              {fasi.filter((f) => f.risorsaId === rid).map((f, i) => (
                <div key={i} title={`${minToStr(f.from)}–${minToStr(f.to)}`} className="absolute top-0 bottom-0 rounded-md"
                  style={{ left: pos(f.from), width: `calc(${((f.to - f.from) / span) * 100}% + 1px)`, minWidth: 3,
                    background: eCabina(rid) ? "#a8a29e" : "var(--brand)" }} />
              ))}
            </div>
          </div>
        ))}
        {!risorse.length ? <p className="text-xs text-stone-400">Nessuna risorsa impegnata.</p> : null}
      </div>
      <div className="flex justify-between text-[10px] text-stone-400 tabular-nums mt-1 pl-[88px]"><span>{minToStr(t0)}</span><span>{minToStr(t1)}</span></div>
      {liberi.length ? (
        <p className="text-[11px] text-stone-500 mt-1.5">In posa o in attesa: {liberi.map((x) => `${minToStr(x.from)}–${minToStr(x.to)}`).join(", ")} — in quei minuti il cliente è in salone senza occupare nessuno.</p>
      ) : null}

      <div className="text-sm font-medium flex items-center gap-1.5 mt-4 mb-2"><Sparkles size={15} className="brand-accent" /> Il servizio nel dettaglio</div>
      <div className="space-y-2.5">
        {dettaglio.length === 0 ? <p className="text-xs text-stone-400">Servizio non più in catalogo.</p> : dettaglio.map(({ svc, righe, da, a }) => (
          <div key={svc.id}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-medium text-stone-800 truncate">{svc.name}</span>
              <span className="text-[11px] text-stone-400 tabular-nums shrink-0">{minToStr(da)}–{minToStr(a)} · {durataServizio(svc)}′{svc.price ? ` · ${eur(svc.price)}` : ""}</span>
            </div>
            <ul className="mt-1 space-y-0.5">
              {righe.map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-[12px] text-stone-600">
                  <span className="tabular-nums text-stone-400 w-24 shrink-0">{minToStr(r.from)}–{minToStr(r.to)}</span>
                  {r.tipo === "cabina" ? <DoorOpen size={12} className="text-stone-400 shrink-0" /> : <User size={12} className="text-stone-400 shrink-0" />}
                  <span className="truncate">{r.etichetta}</span>
                  <span className="text-stone-400 shrink-0 tabular-nums">{r.to - r.from}′</span>
                </li>
              ))}
            </ul>
            {senzaOperatore(impegniServizio(svc)) ? <p className="text-[11px] text-stone-400 mt-0.5">Non richiede operatori: occupa solo la cabina.</p> : null}
          </div>
        ))}
      </div>
      {/* Punto di aggancio del cliente (src/cliente/index.jsx) */}
      {ESTENSIONI.dettaglioAppuntamento ? <div className="mt-3"><ESTENSIONI.dettaglioAppuntamento booking={b} config={config} /></div> : null}
    </div>
  );
}

export function ApptActions({ booking, config, clients, setClients, bookings, sales, catalog, hidePartial, onStatus, onResch, onClose }) {
  const F = useMods();
  const b = booking;
  const st = config.staff.find((s) => s.id === b.staffId);
  const ris = risorseDi(b, config.staff, config.cabine);
  const cl = (clients || []).find((x) => x.code === b.clientCode);
  const names = b.serviceIds.map((id) => { const s = config.services.find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  const meta = b.status ? STATUS[b.status] : null;
  const L = loyaltyConfig(config);
  const balance = cl ? clientBalance(cl, bookings || [], sales, config, catalog) : 0;
  const reached = cl ? L.rewards.filter((r) => balance >= r.points).slice().sort((a, b) => a.points - b.points) : [];
  const pkgs = (cl && Array.isArray(cl.packages)) ? cl.packages.filter((p) => (b.serviceIds || []).includes(p.serviceId)) : [];
  const hasHealth = cl && (cl.allergies || cl.conditions || cl.notes);
  const [chosen, setChosen] = useState([]);
  const [askPrice, setAskPrice] = useState(null);
  const [price, setPrice] = useState("");
  const proposed = (b.serviceIds || []).reduce((a, id) => { const s = config.services.find((x) => x.id === id); return a + ((s && s.price) || 0); }, 0);
  const openPrice = (status) => { setAskPrice(status); setPrice(proposed > 0 ? String(proposed) : ""); };
  const toggleReward = (id) => setChosen((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const selSum = reached.filter((r) => chosen.includes(r.id)).reduce((a, r) => a + r.points, 0);
  const doRedeem = () => {
    const picks = reached.filter((r) => chosen.includes(r.id));
    if (!picks.length || selSum > balance || !cl) return;
    if (!confirm(`Riscattare ${picks.length} premio/i usando ${selSum} punti?`)) return;
    setClients((cs) => cs.map((x) => (x.code === cl.code ? { ...x, redeemedPoints: (Number(x.redeemedPoints) || 0) + selSum, redemptions: [...picks.map((r) => ({ label: r.label, points: r.points, at: Date.now() })), ...(x.redemptions || [])] } : x)));
    setChosen([]);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 overflow-auto" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-semibold text-lg leading-tight">{b.clientName}{b.clientCode ? <span className="text-sm text-stone-400 font-normal"> #{b.clientCode}</span> : null}</div>
            <div className="text-sm text-stone-500 capitalize">{fmtDate(b.date)} · {minToStr(b.startMin)}–{minToStr(b.endMin)}</div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>
        <div className="bg-stone-50 rounded-xl p-3 text-sm space-y-1 mb-4">
          <div className="flex items-center gap-2"><Sparkles size={14} className="text-stone-400" /> {names}</div>
          <div className="flex items-center gap-2">{ris.persone.length ? <User size={14} className="text-stone-400" /> : <DoorOpen size={14} className="text-stone-400" />} {ris.etichetta}</div>
          {cl && cl.phone ? <div className="flex items-center gap-2"><Phone size={14} className="text-stone-400" /> {cl.phone}</div> : null}
          {b.clientEmail ? <div className="flex items-center gap-2"><Mail size={14} className="text-stone-400" /> {b.clientEmail}</div> : null}
          {meta ? <div className="flex items-center gap-2"><meta.Icon size={14} className="text-stone-400" /> {meta.label}</div> : null}
        </div>
        <DettaglioAppuntamento b={b} config={config} />
        {F.allergeni && hasHealth ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-1.5 text-sm font-medium text-red-800 mb-1"><AlertTriangle size={15} /> Note cliente</div>
            <ul className="text-sm text-red-700 space-y-0.5">
              {cl.allergies ? <li><b>Allergie:</b> {cl.allergies}</li> : null}
              {cl.conditions ? <li><b>Patologie:</b> {cl.conditions}</li> : null}
              {cl.notes ? <li><b>Note:</b> {cl.notes}</li> : null}
            </ul>
          </div>
        ) : null}
        {F.pacchetti && cl && pkgs.length > 0 ? (
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-1.5 text-sm font-medium text-sky-800 mb-1"><Layers size={15} /> Pacchetti sedute</div>
            <ul className="text-sm text-sky-700 space-y-0.5">{pkgs.map((p) => { const svc = config.services.find((x) => x.id === p.serviceId); const rem = p.total - (Number(p.used) || 0); return <li key={p.id}>{svc ? svc.name : "Servizio"}: <b>{rem}</b> di {p.total} rimaste</li>; })}</ul>
            {b.packageUsed ? <p className="text-[11px] text-sky-600 mt-1.5">Una seduta è già stata scalata da questo appuntamento.</p> : <p className="text-[11px] text-sky-600 mt-1.5">Segnando "Svolto" o "Parziale" verrà scalata 1 seduta dal pacchetto.</p>}
          </div>
        ) : null}
        {F.fidelity && cl && reached.length > 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-1.5 text-sm font-medium text-amber-800 mb-2"><Gift size={15} /> Premi fedeltà · {balance} punti disponibili</div>
            <div className="space-y-1.5">{reached.map((r) => { const on = chosen.includes(r.id); return (
              <button key={r.id} onClick={() => toggleReward(r.id)} className={`w-full flex items-center gap-2 text-left text-sm rounded-lg px-2.5 py-2 border transition ${on ? "bg-white border-amber-400" : "bg-white/60 border-amber-200"}`}>
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? "brand-bg border-transparent" : "border-stone-300 bg-white"}`}>{on ? <Check size={12} /> : null}</span>
                <span className="flex-1 min-w-0 truncate">{r.label}</span>
                <span className="text-amber-600 shrink-0">{r.points} pt</span>
              </button>
            ); })}</div>
            <button onClick={doRedeem} disabled={!chosen.length || selSum > balance} className="mt-2 w-full brand-bg disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-1.5"><Gift size={14} /> Riscatta selezionati{chosen.length ? ` · −${selSum} pt` : ""}</button>
          </div>
        ) : null}
        {askPrice ? (
          <div className="border border-stone-200 rounded-xl p-4 mb-2">
            <div className="text-sm font-medium mb-1 flex items-center gap-1.5"><Wallet size={15} className="brand-accent" /> Prezzo da incassare</div>
            <p className="text-xs text-stone-400 mb-3">{proposed > 0 ? "Prezzo proposto in base ai servizi. Puoi modificarlo per questo cliente." : "Nessun prezzo impostato sui servizi: inseriscilo qui se vuoi registrarlo."}</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 flex-1"><input type="number" min={0} step={0.5} value={price} onChange={(e) => setPrice(e.target.value)} autoFocus className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-sm text-stone-400">€</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => onStatus(b.id, askPrice, price)} className="flex items-center justify-center gap-1.5 text-sm font-medium bg-green-600 text-white px-3 py-2.5 rounded-lg hover:bg-green-700"><Check size={15} /> Conferma {askPrice === "partial" ? "parziale" : "svolto"}</button>
              <button onClick={() => setAskPrice(null)} className="flex items-center justify-center gap-1.5 text-sm font-medium border border-stone-300 text-stone-600 px-3 py-2.5 rounded-lg hover:bg-stone-50">Indietro</button>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-2">
          {!b.status ? (
            <>
              <button onClick={() => openPrice("done")} className="flex items-center justify-center gap-1.5 text-sm font-medium bg-green-600 text-white px-3 py-2.5 rounded-lg hover:bg-green-700"><Check size={15} /> Svolto</button>
              {!hidePartial ? <button onClick={() => openPrice("partial")} className="flex items-center justify-center gap-1.5 text-sm font-medium border border-sky-300 text-sky-700 px-3 py-2.5 rounded-lg hover:bg-sky-50"><Timer size={15} /> Parziale</button> : null}
              <button onClick={() => onStatus(b.id, "noshow")} className="flex items-center justify-center gap-1.5 text-sm font-medium border border-amber-300 text-amber-700 px-3 py-2.5 rounded-lg hover:bg-amber-50"><UserX size={15} /> Non presentato</button>
              <button onClick={() => onResch(b)} className="flex items-center justify-center gap-1.5 text-sm font-medium border border-stone-300 text-stone-700 px-3 py-2.5 rounded-lg hover:bg-stone-50"><CalendarClock size={15} /> Sposta</button>
              <button onClick={() => onStatus(b.id, "cancelled")} className="col-span-2 flex items-center justify-center gap-1.5 text-sm font-medium border border-stone-300 text-stone-500 px-3 py-2.5 rounded-lg hover:bg-stone-50"><Ban size={15} /> Annulla</button>
            </>
          ) : (
            <button onClick={() => onStatus(b.id, undefined)} className="col-span-2 flex items-center justify-center gap-1.5 text-sm font-medium border border-stone-300 text-stone-600 px-3 py-2.5 rounded-lg hover:bg-stone-50"><Undo2 size={15} /> Ripristina</button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
export function ManualBooking({ config, bookings, setBookings, clients, setClients, canAddBooking, canAddClient, impegniEventi, onDone }) {
  const occupati = useMemo(() => [...bookings, ...(impegniEventi || [])], [bookings, impegniEventi]);
  const services = config.services, staff = config.staff;
  const [sel, setSel] = useState([]);
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [slot, setSlot] = useState(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lk, setLk] = useState("");
  const lkn = lk.replace(/\s/g, "");
  const lkMatches = lk ? clients.filter((c) => (c.name || "").toLowerCase().includes(lk.toLowerCase()) || c.code.includes(lkn) || (c.phone || "").replace(/\s/g, "").includes(lkn) || (c.card || "").replace(/\s/g, "").toLowerCase().includes(lkn.toLowerCase())).slice(0, 6) : [];
  const pickClient = (c) => { setCode(c.code); setName(c.name || ""); setEmail(c.email || ""); setPhone(c.phone || ""); setLk(""); };

  const selStaff = staffId ? staff.find((s) => s.id === staffId) : null;
  const duration = sel.reduce((a, id) => { const s = services.find((x) => x.id === id); return a + (s ? durataServizio(s) : 0); }, 0);
  const qualified = qualifiedStaff(staff, sel, services);
  const candidates = staffId ? qualified.filter((s) => s.id === staffId) : qualified;
  const closed = salonClosure(config, date);
  const opOff = selStaff ? staffOff(selStaff, date) : false;
  const [sovrapponi, setSovrapponi] = useState(false);
  // Nessun operatore serve se tutti i servizi scelti occupano solo cabine.
  const soloCabina = sel.length > 0 && sel.every((id) => { const sv = services.find((x) => x.id === id); return sv && senzaOperatore(impegniServizio(sv)); });
  const cerca = (conSovrapposizione) => sel.length ? orariPossibili(config, sel, date, occupati, {
    earliest: date === todayStr() ? new Date().getHours() * 60 + new Date().getMinutes() + 15 : -1,
    staffFilter: staffId || undefined, sovrapponi: conSovrapposizione,
  }) : [];
  const proposti = cerca(sovrapponi);
  const slotTimes = proposti.map((x) => x.start);
  const perOrario = new Map(proposti.map((x) => [x.start, x]));
  // Orari liberi davvero: serve solo a segnalare quali dei proposti si accavallano.
  const liberi = new Set((sovrapponi ? cerca(false) : proposti).map((x) => x.start));
  const maxDate = pd(new Date(Date.now() + ADVANCE_DAYS * 864e5));
  const onCode = (v) => { v = v.replace(/\D/g, "").slice(0, 6); setCode(v); const c = clients.find((x) => x.code === v); if (c) { setName(c.name || ""); setEmail(c.email || ""); setPhone(c.phone || ""); } };
  const abilitato = (staffId, svcId) => { const sv = services.find((x) => x.id === svcId); return sv ? operatoriDelServizio(sv, services, staff).includes(staffId) : false; };
  const toggle = (id) => { if (selStaff && !abilitato(selStaff.id, id)) return; setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); setSlot(null); };

  const save = () => {
    if (canAddBooking === false) { alert("Limite demo raggiunto: massimo 20 appuntamenti. Per usare il programma senza limiti contatta Office Solution."); return; }
    const scelto = cerca(sovrapponi).find((x) => x.start === slot);
    if (!scelto) { alert("Orario non disponibile."); setSlot(null); return; }
    const cm = clients.find((c) => c.code === code);
    if (!cm && canAddClient === false) { alert("Limite demo raggiunto: massimo 3 clienti. Per usare il programma senza limiti contatta Office Solution."); return; }
    const r = upsertClient({ code: cm ? cm.code : null, name: name.trim(), email: email.trim(), phone: phone.trim() }, clients);
    const accavallato = sovrapponi && !liberi.has(slot);
    const booking = { id: uid(), date, startMin: slot, endMin: slot + duration, serviceIds: sel, staffId: scelto.staffId, impegni: scelto.impegni, clientCode: r.code, clientName: name.trim(), clientEmail: email.trim(), sovrapposto: accavallato || undefined, createdAt: Date.now() };
    setBookings([...bookings, booking]);
    setClients(r.clients);
    onDone();
  };

  return (
    <div className="bg-white rounded-2xl border-2 brand-border p-5 shadow-sm space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><CalendarPlus size={16} className="brand-accent" /> Nuovo appuntamento</h3>
      <div>
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Servizi {selStaff ? <span className="normal-case text-stone-400">· solo quelli di {selStaff.name}</span> : <span className="normal-case text-stone-300">· puoi sceglierne più di uno</span>}</div>
        <div className="flex flex-wrap gap-1.5">{services.map((s) => { const on = sel.includes(s.id); const off = selStaff && !abilitato(selStaff.id, s.id); return <button key={s.id} disabled={off} onClick={() => toggle(s.id)} className={`px-2.5 py-1 rounded-lg text-xs border transition ${off ? "bg-stone-50 border-stone-100 text-stone-300 cursor-not-allowed" : on ? "brand-bg border-transparent" : "bg-white border-stone-200 text-stone-600 brand-hover"}`}>{s.name} · {s.durationMin}′</button>; })}</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Operatore</div>
          <select value={staffId} onChange={(e) => { const id = e.target.value; const ns = id ? staff.find((s) => s.id === id) : null; setStaffId(id); if (ns) setSel((p) => p.filter((x) => abilitato(ns.id, x))); setSlot(null); }} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring">
            <option value="">Primo disponibile</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Giorno</div>
          <input type="date" value={date} min={todayStr()} max={maxDate} onChange={(e) => { setDate(e.target.value); setSlot(null); }} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
        </div>
      </div>
      {sel.length > 0 ? (
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide">Orario disponibile</div>
            <label className="flex items-center gap-1.5 text-xs text-stone-500 cursor-pointer" title="Mostra anche gli orari già occupati: l'appuntamento si accavallerà a quello esistente.">
              <input type="checkbox" checked={sovrapponi} onChange={(e) => { setSovrapponi(e.target.checked); setSlot(null); }} style={{ accentColor: "var(--brand)" }} className="w-3.5 h-3.5" />
              Consenti sovrapposizione
            </label>
          </div>
          {closed ? <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">Salone chiuso in questa data{closed.label ? ` (${closed.label})` : ""}.</p> : opOff ? <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">{selStaff.name} è assente in questa data (malattia/ferie).</p> : (!soloCabina && candidates.length === 0) ? <p className="text-sm text-amber-600">Nessun operatore può fare tutti questi servizi.</p> : slotTimes.length === 0 ? <p className="text-sm text-stone-400">Nessuno slot libero.</p> : <>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">{slotTimes.map((t) => { const pieno = !liberi.has(t); return (
              <button key={t} onClick={() => setSlot(t)} title={pieno ? "Orario già occupato: si sovrapporrà" : undefined} className={`py-1.5 rounded-lg border text-sm font-medium transition ${slot === t ? "brand-bg border-transparent" : pieno ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" : "bg-white border-stone-200 brand-hover"}`}>{minToStr(t)}</button>
            ); })}</div>
            {sovrapponi ? <p className="text-[11px] text-amber-700 mt-2 flex items-center gap-1"><AlertTriangle size={12} /> Gli orari in ambra sono già occupati: scegliendoli l'appuntamento si accavalla a quello esistente.</p> : null}
          </>}
        </div>
      ) : null}
      <div>
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Cliente abituale (cerca per nome, codice, telefono o tessera)</div>
        <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 bg-white brand-ring"><Search size={15} className="text-stone-400" /><input value={lk} onChange={(e) => setLk(e.target.value)} placeholder="Cerca un cliente esistente" className="flex-1 text-sm focus:outline-none" />{lk ? <button onClick={() => setLk("")} className="text-stone-400"><X size={15} /></button> : null}</div>
        {lkMatches.length > 0 ? <div className="mt-1 border border-stone-200 rounded-lg divide-y divide-stone-100">{lkMatches.map((c) => <button key={c.code} onClick={() => pickClient(c)} className="w-full text-left px-3 py-2 hover:bg-stone-50 text-sm flex justify-between gap-2"><span className="truncate">{c.name || "Senza nome"} <span className="text-stone-400">#{c.code}</span>{c.card ? <span className="text-stone-300"> · tessera {c.card}</span> : null}</span>{c.phone ? <span className="text-stone-400 text-xs shrink-0">{c.phone}</span> : null}</button>)}</div> : null}
        {lk && lkMatches.length === 0 ? <p className="text-xs text-stone-400 mt-1">Nessun cliente trovato. Compila i campi sotto per crearne uno nuovo.</p> : null}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <FieldIcon icon={Hash}><input value={code} inputMode="numeric" onChange={(e) => onCode(e.target.value)} placeholder="Codice (se esiste)" className="flex-1 text-sm focus:outline-none" /></FieldIcon>
        <FieldIcon icon={User}><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome e cognome" className="flex-1 text-sm focus:outline-none" /></FieldIcon>
        <FieldIcon icon={Mail}><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="flex-1 text-sm focus:outline-none" /></FieldIcon>
        <FieldIcon icon={Phone}><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefono" className="flex-1 text-sm focus:outline-none" /></FieldIcon>
      </div>
      <button disabled={!sel.length || slot === null || !name.trim()} onClick={save} className="w-full brand-bg disabled:opacity-40 disabled:cursor-not-allowed font-medium py-2.5 rounded-lg transition">Salva appuntamento</button>
    </div>
  );
}
