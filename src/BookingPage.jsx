import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, Check, ChevronRight, ChevronLeft, User, Users, Phone, Mail, Sparkles, MapPin, ArrowRight, Scissors, AlertCircle, CalendarClock, Trash2, X } from "lucide-react";
import { AvatarSvg, avatarIdFor } from "./avatars.jsx";
import { setBrandTab } from "./favicon.js";

// --- Aggiungi al calendario ---
function calStamps(date, start, end) {
  const d = date.replace(/-/g, "");
  const t = (m) => `${pad2(Math.floor(m / 60))}${pad2(m % 60)}00`;
  return { s: `${d}T${t(start)}`, e: `${d}T${t(end)}` };
}
function googleCalUrl(done, salone) {
  const { s, e } = calStamps(done.date, done.start, done.end);
  const p = new URLSearchParams({ action: "TEMPLATE", text: `${done.service} · ${salone.brandName}`, dates: `${s}/${e}`, location: salone.address || "", details: `Appuntamento da ${salone.brandName}${salone.phone ? ` (${salone.phone})` : ""}` });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

const pad2 = (n) => String(n).padStart(2, "0");
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const parseDate = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const WDAY = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const fmtLong = (s) => { const d = parseDate(s); return `${WDAY[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const eur = (n) => "€ " + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",").replace(",00", "");

async function api(path) { const r = await fetch("/api/prenota/" + path); return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }; }

function Centered({ children }) {
  return <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">{children}</div>;
}

export default function BookingPage({ aid }) {
  const [info, setInfo] = useState(null);
  const [state, setState] = useState("loading"); // loading | error | ready
  const [view, setView] = useState("book"); // book | manage
  const [service, setService] = useState(null);
  const [staffSel, setStaffSel] = useState(""); // "" = qualsiasi operatore
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState(null); // null=loading, []=none
  const [slot, setSlot] = useState(null);
  const [f, setF] = useState({ name: "", phone: "", email: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);

  useEffect(() => {
    (async () => {
      const r = await api(aid);
      if (r.ok && r.data && r.data.ok) { setInfo(r.data); setState("ready"); setBrandTab(r.data.salone.logo, `${r.data.salone.brandName} · Prenota online`); }
      else setState("error");
    })();
  }, [aid]);

  const loadSlots = useCallback(async (svcId, d, staff) => {
    setSlots(null); setSlot(null);
    const r = await api(`${aid}/slots?date=${d}&service=${svcId}&staff=${staff || ""}`);
    setSlots(r.ok && Array.isArray(r.data.slots) ? r.data.slots : []);
  }, [aid]);

  useEffect(() => { if (service) loadSlots(service.id, date, staffSel); }, [service, date, staffSel, loadSlots]);

  const operators = (info && service && Array.isArray(info.staff)) ? info.staff.filter((st) => (st.serviceIds || []).includes(service.id)) : [];
  const showOps = operators.length > 1;
  const stepDate = showOps ? 3 : 2;
  const stepData = showOps ? 4 : 3;

  const primary = (info && info.salone.primary) || "#b8893b";
  const horizon = (info && info.horizonDays) || 30;
  const days = Array.from({ length: horizon }, (_, i) => addDays(todayStr(), i));

  const submit = async () => {
    if (!service || !slot) { setErr("Scegli servizio e orario."); return; }
    if (!f.name.trim() || f.phone.replace(/\D/g, "").length < 6) { setErr("Inserisci nome e un numero di telefono valido."); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/prenota/" + aid, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, start: slot.start, service: service.id, staff: staffSel, name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), note: f.note.trim() }) });
      const j = await r.json().catch(() => ({}));
      setBusy(false);
      if (!r.ok) { setErr(j.error || "Si è verificato un errore. Riprova."); if (r.status === 409) loadSlots(service.id, date, staffSel); return; }
      setDone(j.conferma || {});
    } catch (e) { setBusy(false); setErr("Errore di rete. Riprova."); }
  };

  if (state === "loading") return <Centered><div className="lc-spinner" /></Centered>;
  if (state === "error") return (
    <Centered>
      <div className="lc-card lc-scale-in p-8 text-center max-w-sm">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3 lc-pop-in"><AlertCircle size={22} /></div>
        <h2 className="font-display text-xl font-semibold text-stone-900">Prenotazioni non disponibili</h2>
        <p className="text-sm text-stone-500 mt-2">Questo link non è valido o le prenotazioni online non sono attive. Contatta direttamente l'attività.</p>
      </div>
    </Centered>
  );

  const b = info.salone;
  const accent = { background: primary, color: "#fff" };

  if (done) {
    const wa = "39" + (b.phone || "").replace(/\D/g, "");
    return (
      <div className="min-h-screen bg-stone-50" style={{ "--brand": primary }}>
        <div className="max-w-md mx-auto px-4 py-10">
          <div className="lc-card lc-scale-in p-7 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 lc-pop-in" style={{ background: primary, color: "#fff" }}><Check size={28} /></div>
            <h1 className="font-display text-2xl font-semibold text-stone-900">Prenotazione confermata</h1>
            <p className="text-sm text-stone-500 mt-2">Ti aspettiamo da <b>{b.brandName}</b>.</p>
            <div className="mt-5 rounded-xl bg-stone-50 border border-stone-100 p-4 text-left space-y-2">
              <div className="flex items-center gap-2.5 text-sm"><Scissors size={16} className="text-stone-400" /><span className="font-medium text-stone-800">{done.service}</span></div>
              <div className="flex items-center gap-2.5 text-sm"><Calendar size={16} className="text-stone-400" /><span className="text-stone-700 capitalize">{fmtLong(done.date)}</span></div>
              <div className="flex items-center gap-2.5 text-sm"><Clock size={16} className="text-stone-400" /><span className="text-stone-700 tabular-nums">{done.label}</span></div>
            </div>
            <div className="mt-5">
              <a href={googleCalUrl(done, b)} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-1.5 text-sm font-medium border border-stone-200 rounded-xl py-2.5 hover:bg-stone-50 transition"><Calendar size={15} className="text-stone-500" /> Aggiungi a Google Calendar</a>
            </div>
            <p className="text-xs text-stone-400 mt-4">Puoi consultare o spostare la prenotazione da «Le mie prenotazioni».</p>
            <button onClick={() => { setDone(null); setView("manage"); }} className="mt-1 text-sm font-medium" style={{ color: primary }}>Le mie prenotazioni →</button>
            <div className="mt-3 pt-3 border-t border-stone-100"><a href={window.location.pathname + window.location.search} className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-700">Prenota un altro appuntamento <ArrowRight size={15} /></a></div>
          </div>
          <p className="text-center text-[11px] text-stone-300 mt-6">Prenotazioni online · powered by Lucentia</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50" style={{ "--brand": primary }}>
      {/* Cover */}
      <div className="relative overflow-hidden border-b border-stone-100" style={{ background: `radial-gradient(70% 80% at 50% 0%, ${primary}14 0%, #ffffff 70%)` }}>
        <div className="max-w-2xl mx-auto px-4 pt-10 pb-7 text-center lc-fade-up">
          {b.logo ? <img src={b.logo} alt={b.brandName} className="h-16 w-16 rounded-2xl object-cover mx-auto mb-4 ring-1 ring-stone-200" /> : <div className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: primary, color: "#fff" }}><Sparkles size={28} /></div>}
          <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900">{b.brandName}</h1>
          {b.tagline ? <p className="text-stone-500 mt-1">{b.tagline}</p> : null}
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-stone-400 flex-wrap">
            {b.phone ? <span className="inline-flex items-center gap-1.5"><Phone size={13} /> {b.phone}</span> : null}
            {b.address ? <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {b.address}</span> : null}
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full mt-4" style={{ background: `${primary}18`, color: primary }}><Calendar size={13} /> {view === "manage" ? "Le tue prenotazioni" : "Prenota online il tuo appuntamento"}</div>
          <div className="mt-3">
            {view === "book"
              ? <button onClick={() => setView("manage")} className="text-sm font-medium hover:underline" style={{ color: primary }}>Hai già prenotato? Gestisci le tue prenotazioni →</button>
              : <button onClick={() => setView("book")} className="text-sm font-medium text-stone-500 hover:text-stone-700 inline-flex items-center gap-1"><ChevronLeft size={15} /> Nuova prenotazione</button>}
          </div>
        </div>
      </div>

      {view === "manage" ? <ManageBookings aid={aid} primary={primary} /> : (

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* 1. Servizio */}
        <section className="lc-card p-4 lc-fade-up">
          <div className="flex items-center gap-2 mb-3"><span className="w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center" style={accent}>1</span><h2 className="font-semibold text-stone-900 tracking-tight">Scegli il servizio</h2></div>
          {info.services.length === 0 ? <p className="text-sm text-stone-400">Nessun servizio prenotabile online al momento.</p> : (
            <div className="grid sm:grid-cols-2 gap-2">{info.services.map((s) => { const on = service && service.id === s.id; return (
              <button key={s.id} onClick={() => { setService(s); setStaffSel(""); }} className="text-left rounded-xl border p-3 transition" style={on ? { borderColor: primary, background: `${primary}0d` } : { borderColor: "#e7e5e4" }}>
                <div className="font-medium text-stone-900 text-sm flex items-center justify-between gap-2">{s.name}{on ? <Check size={15} style={{ color: primary }} /> : null}</div>
                <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-2"><span className="inline-flex items-center gap-1"><Clock size={11} /> {s.durationMin} min</span>{s.price != null ? <span>· {eur(s.price)}</span> : null}</div>
              </button>
            ); })}</div>
          )}
        </section>

        {/* 2. Operatore (se più di uno può fare il servizio) */}
        {service && showOps ? (
          <section className="lc-card p-4 lc-fade-up">
            <div className="flex items-center gap-2 mb-3"><span className="w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center" style={accent}>2</span><h2 className="font-semibold text-stone-900 tracking-tight">Scegli l'operatore</h2></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button onClick={() => setStaffSel("")} className="rounded-xl border p-3 flex flex-col items-center gap-2 text-center transition" style={staffSel === "" ? { borderColor: primary, background: `${primary}0d` } : { borderColor: "#e7e5e4" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${primary}1a`, color: primary }}><Users size={22} /></div>
                <div className="text-sm font-medium text-stone-800 leading-tight">Qualsiasi</div>
              </button>
              {operators.map((st) => { const on = staffSel === st.id; return (
                <button key={st.id} onClick={() => setStaffSel(st.id)} className="rounded-xl border p-3 flex flex-col items-center gap-2 text-center transition" style={on ? { borderColor: primary, background: `${primary}0d` } : { borderColor: "#e7e5e4" }}>
                  <AvatarSvg id={avatarIdFor(st)} photo={st.photo} size={48} ring={on} />
                  <div className="min-w-0"><div className="text-sm font-medium text-stone-800 leading-tight truncate">{st.name}</div>{st.role ? <div className="text-[11px] text-stone-400 truncate">{st.role}</div> : null}</div>
                </button>
              ); })}
            </div>
          </section>
        ) : null}

        {/* Data + orario */}
        {service ? (
          <section className="lc-card p-4 lc-fade-up">
            <div className="flex items-center gap-2 mb-3"><span className="w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center" style={accent}>{stepDate}</span><h2 className="font-semibold text-stone-900 tracking-tight">Scegli data e orario</h2></div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
              {days.map((ds) => { const d = parseDate(ds); const on = ds === date; return (
                <button key={ds} onClick={() => setDate(ds)} className="shrink-0 w-14 py-2 rounded-xl border text-center transition" style={on ? { borderColor: "transparent", background: primary, color: "#fff" } : { borderColor: "#e7e5e4", background: "#fff" }}>
                  <div className="text-[10px] uppercase tracking-wide opacity-80">{WDAY[d.getDay()]}</div>
                  <div className="text-base font-semibold leading-none mt-0.5">{d.getDate()}</div>
                  <div className="text-[10px] opacity-70">{MONTHS[d.getMonth()].slice(0, 3)}</div>
                </button>
              ); })}
            </div>
            <div className="mt-4">
              {slots === null ? <div className="flex items-center gap-2 text-sm text-stone-400 py-4 justify-center"><div className="lc-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Cerco gli orari…</div>
                : slots.length === 0 ? <div className="text-center py-6 text-sm text-stone-400"><Clock size={22} className="mx-auto text-stone-300 mb-2" />Nessun orario disponibile in questa giornata.<br />Prova un altro giorno.</div>
                : (
                  <>
                    <div className="text-xs text-stone-400 mb-2 capitalize">{fmtLong(date)} · {slots.length} orari liberi</div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">{slots.map((s) => { const on = slot && slot.start === s.start; return (
                      <button key={s.start} onClick={() => setSlot(s)} className="py-2 rounded-lg border text-sm font-medium tabular-nums transition" style={on ? { borderColor: "transparent", background: primary, color: "#fff" } : { borderColor: "#e7e5e4", background: "#fff" }}>{s.label}</button>
                    ); })}</div>
                  </>
                )}
            </div>
          </section>
        ) : null}

        {/* Dati cliente */}
        {service && slot ? (
          <section className="lc-card p-4 lc-fade-up">
            <div className="flex items-center gap-2 mb-3"><span className="w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center" style={accent}>{stepData}</span><h2 className="font-semibold text-stone-900 tracking-tight">I tuoi dati</h2></div>
            <div className="space-y-2.5">
              <Field icon={User}><input value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(""); }} placeholder="Nome e cognome *" className="flex-1 text-sm focus:outline-none bg-transparent" /></Field>
              <Field icon={Phone}><input value={f.phone} onChange={(e) => { setF({ ...f, phone: e.target.value }); setErr(""); }} type="tel" placeholder="Telefono *" className="flex-1 text-sm focus:outline-none bg-transparent" /></Field>
              <Field icon={Mail}><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} type="email" placeholder="Email (facoltativa)" className="flex-1 text-sm focus:outline-none bg-transparent" /></Field>
              <textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} rows={2} placeholder="Note per il salone (facoltative)" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-400 transition-colors" />
            </div>

            <div className="mt-4 rounded-xl bg-stone-50 border border-stone-100 p-3 text-sm flex items-center justify-between gap-2">
              <span className="text-stone-500">Riepilogo</span>
              <span className="text-stone-800 font-medium text-right">{service.name}{staffSel ? ` · ${(operators.find((o) => o.id === staffSel) || {}).name}` : ""} · <span className="capitalize">{fmtLong(date)}</span> · <span className="tabular-nums">{slot.label}</span></span>
            </div>
            {err ? <p className="text-xs text-red-500 mt-3 flex items-center gap-1.5"><AlertCircle size={13} /> {err}</p> : null}
            <button onClick={submit} disabled={busy} className="mt-4 w-full text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 lc-shine hover:brightness-105 transition" style={{ background: primary }}>
              {busy ? <><span className="lc-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)", borderTopColor: "#fff" }} /> Conferma…</> : <>Conferma prenotazione <ArrowRight size={16} /></>}
            </button>
          </section>
        ) : null}

        <p className="text-center text-[11px] text-stone-300 pt-2">Prenotazioni online · powered by Lucentia</p>
      </div>
      )}
    </div>
  );
}

function Field({ icon: Icon, children }) {
  return <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2.5 transition-colors focus-within:border-stone-400"><Icon size={16} className="text-stone-400 shrink-0" />{children}</div>;
}

// "Le mie prenotazioni": consulta / sposta / annulla, ricerca per telefono.
function ManageBookings({ aid, primary }) {
  const [phone, setPhone] = useState("");
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [searched, setSearched] = useState(false);
  const [move, setMove] = useState(null); // { booking, date, slots, slot, busy }
  const days = Array.from({ length: 30 }, (_, i) => addDays(todayStr(), i));

  const search = async () => {
    if (phone.replace(/\D/g, "").length < 6) { setErr("Inserisci il numero usato per prenotare."); return; }
    setLoading(true); setErr(""); setMove(null);
    const r = await api(`${aid}/mie?phone=${encodeURIComponent(phone.trim())}`);
    setLoading(false); setSearched(true);
    setList(r.ok && Array.isArray(r.data.items) ? r.data.items : []);
  };
  const cancel = async (b) => {
    if (!confirm("Annullare questa prenotazione?")) return;
    await fetch(`/api/prenota/${aid}/annulla`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: b.id, phone }) }).catch(() => {});
    search();
  };
  const loadMoveSlots = async (b, date) => {
    setMove((m) => (m && m.booking.id === b.id ? { ...m, date, slots: null, slot: null } : m));
    const r = await api(`${aid}/slots?date=${date}&service=${b.serviceId}&staff=${b.staffId || ""}&exclude=${b.id}`);
    setMove((m) => (m && m.booking.id === b.id ? { ...m, slots: r.ok && Array.isArray(r.data.slots) ? r.data.slots : [] } : m));
  };
  const openMove = (b) => { setMove({ booking: b, date: b.date, slots: null, slot: null, busy: false }); loadMoveSlots(b, b.date); };
  const confirmMove = async () => {
    if (!move || !move.slot) return;
    setMove((m) => ({ ...m, busy: true }));
    const r = await fetch(`/api/prenota/${aid}/sposta`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: move.booking.id, phone, date: move.date, start: move.slot.start }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMove((m) => ({ ...m, busy: false })); alert(j.error || "Errore."); if (r.status === 409) loadMoveSlots(move.booking, move.date); return; }
    setMove(null); search();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <section className="lc-card p-4 lc-fade-up">
        <div className="flex items-center gap-2 border border-stone-300 rounded-xl px-3.5 py-2.5 focus-within:border-stone-400 transition-colors">
          <Phone size={17} className="text-stone-400 shrink-0" />
          <input value={phone} onChange={(e) => { setPhone(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && search()} type="tel" placeholder="Numero di telefono usato per prenotare" className="flex-1 text-sm focus:outline-none bg-transparent" />
          <button onClick={search} className="text-sm font-medium text-white px-3.5 py-1.5 rounded-lg shrink-0" style={{ background: primary }}>Cerca</button>
        </div>
        {err ? <p className="text-xs text-red-500 mt-2 flex items-center gap-1.5"><AlertCircle size={13} /> {err}</p> : null}
      </section>

      {loading ? <div className="flex justify-center py-8"><div className="lc-spinner" /></div> : null}

      {!loading && searched && list && list.length === 0 ? (
        <section className="lc-card p-8 text-center lc-fade-up">
          <CalendarClock size={26} className="mx-auto text-stone-300 mb-2" />
          <p className="text-sm text-stone-500">Nessuna prenotazione attiva trovata per questo numero.</p>
        </section>
      ) : null}

      {!loading && list && list.map((b) => { const moving = move && move.booking.id === b.id; return (
        <section key={b.id} className="lc-card p-4 lc-fade-up">
          <div className="min-w-0">
            <div className="font-semibold text-stone-900">{b.serviceName}</div>
            <div className="text-sm text-stone-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="capitalize inline-flex items-center gap-1"><Calendar size={13} className="text-stone-400" /> {fmtLong(b.date)}</span>
              <span className="inline-flex items-center gap-1 tabular-nums"><Clock size={13} className="text-stone-400" /> {b.label}</span>
              {b.staffName ? <span className="inline-flex items-center gap-1"><User size={13} className="text-stone-400" /> {b.staffName}</span> : null}
            </div>
          </div>
          {!moving ? (
            <div className="flex gap-2 mt-3">
              <button onClick={() => openMove(b)} className="text-sm font-medium border rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5 hover:bg-stone-50 transition" style={{ borderColor: `${primary}66`, color: primary }}><CalendarClock size={14} /> Sposta</button>
              <button onClick={() => cancel(b)} className="text-sm font-medium border border-stone-200 text-stone-500 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5 hover:text-red-600 hover:border-red-200 transition"><Trash2 size={14} /> Annulla</button>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-stone-200 p-3 bg-stone-50/60">
              <div className="flex items-center justify-between mb-2"><div className="text-xs font-medium text-stone-500">Scegli un nuovo orario</div><button onClick={() => setMove(null)} className="text-stone-400 hover:text-stone-600"><X size={16} /></button></div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {days.map((ds) => { const d = parseDate(ds); const on = ds === move.date; return (
                  <button key={ds} onClick={() => loadMoveSlots(b, ds)} className="shrink-0 w-12 py-1.5 rounded-lg border text-center transition" style={on ? { borderColor: "transparent", background: primary, color: "#fff" } : { borderColor: "#e7e5e4", background: "#fff" }}>
                    <div className="text-[9px] uppercase opacity-80">{WDAY[d.getDay()]}</div><div className="text-sm font-semibold leading-none mt-0.5">{d.getDate()}</div><div className="text-[9px] opacity-70">{MONTHS[d.getMonth()].slice(0, 3)}</div>
                  </button>
                ); })}
              </div>
              <div className="mt-3">
                {move.slots === null ? <div className="text-center text-sm text-stone-400 py-3">Cerco gli orari…</div>
                  : move.slots.length === 0 ? <div className="text-center text-sm text-stone-400 py-3">Nessun orario disponibile in questa giornata.</div>
                  : <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">{move.slots.map((s) => { const on = move.slot && move.slot.start === s.start; return <button key={s.start} onClick={() => setMove((m) => ({ ...m, slot: s }))} className="py-2 rounded-lg border text-sm font-medium tabular-nums transition" style={on ? { borderColor: "transparent", background: primary, color: "#fff" } : { borderColor: "#e7e5e4", background: "#fff" }}>{s.label}</button>; })}</div>}
              </div>
              <button onClick={confirmMove} disabled={!move.slot || move.busy} className="mt-3 w-full text-white font-semibold py-2.5 rounded-xl disabled:opacity-50 transition" style={{ background: primary }}>{move.busy ? "Sposto…" : "Conferma spostamento"}</button>
            </div>
          )}
        </section>
      ); })}

      <p className="text-center text-[11px] text-stone-300 pt-2">Prenotazioni online · powered by Lucentia</p>
    </div>
  );
}
