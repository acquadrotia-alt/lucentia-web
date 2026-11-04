// ============================================================================
// L'area del cliente dentro «Prenota»: accesso con email e password (account
// creato da /registrazione), poi i suoi appuntamenti (con sposta e annulla
// per quelli presi online), i punti fedeltà e i suoi dati.
// ============================================================================
import { useState, useEffect } from "react";
import { Mail, Lock, Calendar, Clock, User, Star, Phone, AlertCircle, LogOut, CalendarClock, Trash2, Check, X, ChevronRight, Gift, Plus } from "lucide-react";

const pad2 = (n) => String(n).padStart(2, "0");
const parseDate = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const WDAY = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const fmtLong = (s) => { const d = parseDate(s); return `${WDAY[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const post = async (url, body) => { const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }); return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }; };

// Email e password; sotto, il rimando al salone per la prima prenotazione.
export function AccessoCliente({ aid, primary, salone, onEntrato }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const entra = async () => {
    if (!email.trim() || !password) { setErr("Inserisci email e password."); return; }
    setBusy(true); setErr("");
    const r = await post(`/api/clienti/${aid}/login`, { email: email.trim(), password });
    setBusy(false);
    if (!r.ok) { setErr(r.data.error || "Accesso non riuscito."); return; }
    onEntrato();
  };
  return (
    <section className="lc-card lc-fade-up p-5">
      <h2 className="font-semibold text-stone-900 tracking-tight flex items-center gap-2"><Lock size={16} style={{ color: primary }} /> Accedi per prenotare</h2>
      <p className="text-sm text-stone-500 mt-1 mb-4">Entra con l'email e la password del tuo account: vedrai i tuoi appuntamenti, i punti e potrai prenotare.</p>
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2.5 focus-within:border-stone-400"><Mail size={16} className="text-stone-400 shrink-0" /><input value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} type="email" placeholder="Email" autoComplete="email" className="flex-1 text-sm focus:outline-none bg-transparent" /></div>
        <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2.5 focus-within:border-stone-400"><Lock size={16} className="text-stone-400 shrink-0" /><input value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && entra()} type="password" placeholder="Password" autoComplete="current-password" className="flex-1 text-sm focus:outline-none bg-transparent" /></div>
      </div>
      {err ? <p className="text-xs text-red-500 mt-3 flex items-center gap-1.5"><AlertCircle size={13} /> {err}</p> : null}
      <button onClick={entra} disabled={busy} className="mt-4 w-full text-white font-semibold py-3 rounded-xl disabled:opacity-50 lc-shine" style={{ background: primary }}>{busy ? "Entro…" : "Accedi"}</button>
      <div className="mt-4 rounded-xl bg-stone-50 border border-stone-100 p-3 text-xs text-stone-600 leading-relaxed">
        <b className="text-stone-800">Prima prenotazione online?</b> Per ricevere le credenziali contatta il salone{salone && (salone.phone || salone.email) ? ":" : "."}
        {salone && salone.phone ? <a href={`tel:+39${String(salone.phone).replace(/\D/g, "")}`} className="block mt-1.5 font-medium" style={{ color: primary }}><Phone size={12} className="inline mr-1" />{salone.phone}</a> : null}
        {salone && salone.email ? <a href={`mailto:${salone.email}`} className="block mt-1 font-medium" style={{ color: primary }}><Mail size={12} className="inline mr-1" />{salone.email}</a> : null}
      </div>
    </section>
  );
}

export function AreaCliente({ aid, primary, account, ricarica, salone, onEsci, onNuovo }) {
  const [tab, setTab] = useState("appuntamenti");
  const [move, setMove] = useState(null);
  const [msg, setMsg] = useState(null);
  const c = account.cliente;
  const days = Array.from({ length: 30 }, (_, i) => addDays(todayStr(), i));
  const api = async (path) => { const r = await fetch("/api/prenota/" + path, { credentials: "include" }); return { ok: r.ok, data: await r.json().catch(() => ({})) }; };
  const annulla = async (b) => { if (!confirm("Annullare questa prenotazione?")) return; await post(`/api/prenota/${aid}/annulla`, { id: b.id }); ricarica(); };
  const loadMoveSlots = async (b, date) => { setMove((m) => (m && m.booking.id === b.id ? { ...m, date, slots: null, slot: null } : m)); const r = await api(`${aid}/slots?date=${date}&service=${b.serviceId}&staff=${b.staffId || ""}&exclude=${b.id}`); setMove((m) => (m && m.booking.id === b.id ? { ...m, slots: r.ok && Array.isArray(r.data.slots) ? r.data.slots : [] } : m)); };
  const openMove = (b) => { setMove({ booking: b, date: b.date, slots: null, slot: null, busy: false }); loadMoveSlots(b, b.date); };
  const confirmMove = async () => {
    if (!move || !move.slot) return;
    setMove((m) => ({ ...m, busy: true }));
    const r = await post(`/api/prenota/${aid}/sposta`, { id: move.booking.id, date: move.date, start: move.slot.start });
    if (!r.ok) { setMove((m) => ({ ...m, busy: false })); alert(r.data.error || "Errore."); if (r.status === 409) loadMoveSlots(move.booking, move.date); return; }
    setMove(null); ricarica();
  };
  const TAB = [["appuntamenti", "Appuntamenti", Calendar], ["punti", "Punti", Star], ["dati", "I miei dati", User]];
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <section className="lc-card p-4 lc-fade-up flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0"><div className="font-semibold text-stone-900">{c.nome} {c.cognome}</div><div className="text-xs text-stone-400 truncate">{c.email} · {c.telefono}</div></div>
        <div className="flex gap-2">
          <button onClick={onNuovo} className="text-sm font-medium text-white px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: primary }}><Plus size={15} /> Nuovo appuntamento</button>
          <button onClick={onEsci} className="text-sm font-medium border border-stone-200 text-stone-500 px-3 py-2 rounded-lg inline-flex items-center gap-1.5 hover:bg-stone-50"><LogOut size={15} /> Esci</button>
        </div>
      </section>
      <div className="inline-flex gap-1 bg-stone-100/80 rounded-xl p-1">{TAB.map(([k, l, Icon]) => <button key={k} onClick={() => setTab(k)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition" style={tab === k ? { background: "#fff", color: "#1c1917", boxShadow: "0 1px 2px rgba(0,0,0,.06)" } : { color: "#78716c" }}><Icon size={15} /> {l}</button>)}</div>

      {tab === "appuntamenti" ? (
        <div className="space-y-3">
          {account.appuntamenti.length === 0 ? <section className="lc-card p-8 text-center lc-fade-up"><CalendarClock size={26} className="mx-auto text-stone-300 mb-2" /><p className="text-sm text-stone-500">Nessun appuntamento in programma.</p><button onClick={onNuovo} className="mt-3 text-sm font-medium" style={{ color: primary }}>Prenota ora →</button></section> : null}
          {account.appuntamenti.map((b) => { const moving = move && move.booking.id === b.id; return (
            <section key={b.id} className="lc-card p-4 lc-fade-up">
              <div className="font-semibold text-stone-900">{b.serviceName || "Appuntamento"}</div>
              <div className="text-sm text-stone-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="capitalize inline-flex items-center gap-1"><Calendar size={13} className="text-stone-400" /> {fmtLong(b.date)}</span>
                <span className="inline-flex items-center gap-1 tabular-nums"><Clock size={13} className="text-stone-400" /> {b.label}</span>
                {b.staffName ? <span className="inline-flex items-center gap-1"><User size={13} className="text-stone-400" /> {b.staffName}</span> : null}
                {b.origine === "online" ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: `${primary}1a`, color: primary }}>Prenotato online · in attesa di conferma del salone</span> : null}
              </div>
              {b.origine === "online" ? (!moving ? (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openMove(b)} className="text-sm font-medium border rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5 hover:bg-stone-50" style={{ borderColor: `${primary}66`, color: primary }}><CalendarClock size={14} /> Sposta</button>
                  <button onClick={() => annulla(b)} className="text-sm font-medium border border-stone-200 text-stone-500 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5 hover:text-red-600"><Trash2 size={14} /> Annulla</button>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-stone-200 p-3 bg-stone-50/60">
                  <div className="flex items-center justify-between mb-2"><div className="text-xs font-medium text-stone-500">Scegli un nuovo orario</div><button onClick={() => setMove(null)} className="text-stone-400"><X size={16} /></button></div>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">{days.map((ds) => { const d = parseDate(ds); const on = ds === move.date; return <button key={ds} onClick={() => loadMoveSlots(b, ds)} className="shrink-0 w-12 py-1.5 rounded-lg border text-center" style={on ? { borderColor: "transparent", background: primary, color: "#fff" } : { borderColor: "#e7e5e4", background: "#fff" }}><div className="text-[9px] uppercase opacity-80">{WDAY[d.getDay()]}</div><div className="text-sm font-semibold leading-none mt-0.5">{d.getDate()}</div></button>; })}</div>
                  <div className="mt-3">{move.slots === null ? <div className="text-center text-sm text-stone-400 py-3">Cerco gli orari…</div> : move.slots.length === 0 ? <div className="text-center text-sm text-stone-400 py-3">Nessun orario disponibile.</div> : <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">{move.slots.map((s) => { const on = move.slot && move.slot.start === s.start; return <button key={s.start} onClick={() => setMove((m) => ({ ...m, slot: s }))} className="py-2 rounded-lg border text-sm font-medium tabular-nums" style={on ? { borderColor: "transparent", background: primary, color: "#fff" } : { borderColor: "#e7e5e4", background: "#fff" }}>{s.label}</button>; })}</div>}</div>
                  <button onClick={confirmMove} disabled={!move.slot || move.busy} className="mt-3 w-full text-white font-semibold py-2.5 rounded-xl disabled:opacity-50" style={{ background: primary }}>Conferma lo spostamento</button>
                </div>
              )) : <p className="text-xs text-stone-400 mt-2">Preso in salone: per spostarlo o annullarlo contatta il salone{salone && salone.phone ? ` al ${salone.phone}` : ""}.</p>}
            </section>
          ); })}
          {account.storico.length ? <div className="pt-2"><div className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">Appuntamenti passati</div><div className="space-y-1.5">{account.storico.map((b) => <div key={b.id} className="text-sm text-stone-600 flex items-center justify-between gap-2 border-b border-stone-100 py-1.5"><span className="truncate">{b.serviceName}</span><span className="text-xs text-stone-400 shrink-0 capitalize">{fmtLong(b.date)} · {b.label}</span></div>)}</div></div> : null}
        </div>
      ) : tab === "punti" ? (
        <section className="lc-card p-5 lc-fade-up">
          <div className="text-center"><div className="text-xs uppercase tracking-wide text-stone-400">I tuoi punti</div><div className="text-4xl font-semibold text-stone-900 mt-1">{account.punti.saldo}</div></div>
          {account.punti.premi.length ? <div className="mt-5 space-y-2">{account.punti.premi.map((p, i) => <div key={i} className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-sm ${p.raggiunto ? "border-green-200 bg-green-50" : "border-stone-200"}`}><span className="flex items-center gap-2"><Gift size={15} style={{ color: p.raggiunto ? "#15803d" : primary }} /> {p.label}</span><span className="text-xs text-stone-500">{p.points} punti{p.raggiunto ? " · raggiunto" : ` · te ne mancano ${p.points - account.punti.saldo}`}</span></div>)}</div> : <p className="text-sm text-stone-400 text-center mt-3">I punti si accumulano a ogni appuntamento svolto.</p>}
          {account.punti.riscatti.length ? <div className="mt-4 text-xs text-stone-400">Premi riscattati: {account.punti.riscatti.map((r) => r.label).join(", ")}</div> : null}
          <p className="text-[11px] text-stone-400 text-center mt-4">I premi si riscattano in salone.</p>
        </section>
      ) : (
        <DatiCliente aid={aid} primary={primary} account={account} ricarica={ricarica} />
      )}
      {msg ? <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.testo}</p> : null}
      <p className="text-center text-[11px] text-stone-300 pt-2">Prenotazioni online · powered by Lucentia</p>
    </div>
  );
}

function DatiCliente({ aid, primary, account, ricarica }) {
  const c = account.cliente;
  const [telefono, setTelefono] = useState(c.telefono || "");
  const [pw, setPw] = useState({ attuale: "", nuova: "", conferma: "" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const salva = async () => {
    if (pw.nuova && pw.nuova !== pw.conferma) { setMsg({ ok: false, testo: "Le due password non coincidono." }); return; }
    setBusy(true); setMsg(null);
    const r = await post(`/api/clienti/${aid}/dati`, { telefono: telefono.trim(), nuovaPassword: pw.nuova, passwordAttuale: pw.attuale });
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, testo: r.data.error || "Non salvato." }); return; }
    setPw({ attuale: "", nuova: "", conferma: "" }); setMsg({ ok: true, testo: "Dati aggiornati." }); ricarica();
  };
  const inp = "w-full px-3 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-400";
  return (
    <section className="lc-card p-5 lc-fade-up space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><div className="text-[11px] uppercase tracking-wide text-stone-400 mb-1">Nome</div><div className="text-sm font-medium">{c.nome} {c.cognome}</div></div>
        <div><div className="text-[11px] uppercase tracking-wide text-stone-400 mb-1">Email (accesso)</div><div className="text-sm font-medium break-all">{c.email}</div></div>
      </div>
      <div><div className="text-[11px] uppercase tracking-wide text-stone-400 mb-1">Telefono</div><input value={telefono} onChange={(e) => setTelefono(e.target.value)} type="tel" className={inp} /></div>
      <div className="pt-2 border-t border-stone-100"><div className="text-[11px] uppercase tracking-wide text-stone-400 mb-2">Cambia password (facoltativo)</div>
        <div className="grid sm:grid-cols-3 gap-2"><input value={pw.attuale} onChange={(e) => setPw({ ...pw, attuale: e.target.value })} type="password" placeholder="Password attuale" className={inp} /><input value={pw.nuova} onChange={(e) => setPw({ ...pw, nuova: e.target.value })} type="password" placeholder="Nuova password" className={inp} /><input value={pw.conferma} onChange={(e) => setPw({ ...pw, conferma: e.target.value })} type="password" placeholder="Ripeti la nuova" className={inp} /></div>
      </div>
      {msg ? <p className={`text-sm flex items-center gap-1.5 ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.ok ? <Check size={14} /> : <AlertCircle size={14} />} {msg.testo}</p> : null}
      <button onClick={salva} disabled={busy} className="w-full text-white font-semibold py-2.5 rounded-xl disabled:opacity-50" style={{ background: primary }}>{busy ? "Salvo…" : "Salva"}</button>
      <p className="text-[11px] text-stone-400">Per cambiare nome o email contatta il salone.</p>
    </section>
  );
}
