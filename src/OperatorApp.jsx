import { useState, useEffect, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight, LogOut, Clock, User, CheckCircle2 } from "lucide-react";

const pad2 = (n) => String(n).padStart(2, "0");
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const parseDate = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const hhmm = (min) => `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const fmtLong = (s) => { const d = parseDate(s); return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`; };

async function loadData(coll) {
  try {
    const r = await fetch(`/api/data/${coll}`, { credentials: "include" });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.value != null ? j.value : null;
  } catch (e) { return null; }
}

export default function OperatorApp({ user, azienda, onLogout }) {
  const [config, setConfig] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [cfg, bk] = await Promise.all([loadData("config"), loadData("bookings")]);
    setConfig(cfg || {});
    setBookings(Array.isArray(bk) ? bk : []);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const staff = (config && config.staff) || [];
  const services = (config && config.services) || [];
  const brandName = (config && config.branding && config.branding.name) || azienda?.denominazione || "Lucentia";
  const me = staff.find((s) => s.id === user.staff_id);
  const opName = (me && me.name) || "Operatore";

  const svcNames = (ids) => (ids || []).map((id) => { const s = services.find((x) => x.id === id); return s ? s.name : "Servizio"; }).join(", ");
  const ofDay = bookings.filter((b) => b.date === date).sort((a, b) => a.startMin - b.startMin);
  const upcoming = bookings.filter((b) => b.date >= todayStr() && b.status !== "done").length;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-lg font-bold leading-tight truncate" style={{ color: "#e11d48" }}>{brandName}</div>
            <div className="text-xs text-stone-400 truncate flex items-center gap-1"><User size={12} /> {opName} · la tua agenda</div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 shrink-0"><LogOut size={16} /> Esci</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-5 flex-1">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button onClick={() => setDate(addDays(date, -1))} className="w-10 h-10 rounded-lg border border-stone-300 bg-white flex items-center justify-center text-stone-500 hover:bg-stone-50"><ChevronLeft size={18} /></button>
          <div className="text-center">
            <div className="font-semibold capitalize flex items-center justify-center gap-1.5"><Calendar size={15} style={{ color: "#e11d48" }} /> {fmtLong(date)}</div>
            {date !== todayStr() ? <button onClick={() => setDate(todayStr())} className="text-xs text-stone-400 hover:text-stone-600 underline">Torna a oggi</button> : <div className="text-xs text-stone-400">oggi</div>}
          </div>
          <button onClick={() => setDate(addDays(date, 1))} className="w-10 h-10 rounded-lg border border-stone-300 bg-white flex items-center justify-center text-stone-500 hover:bg-stone-50"><ChevronRight size={18} /></button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 lc-fade-in"><div className="lc-spinner" style={{ borderTopColor: "#e11d48", borderColor: "rgba(225,29,72,0.2)" }} /><p className="text-sm text-stone-400">Caricamento…</p></div>
        ) : ofDay.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 lc-fade-up">Nessun appuntamento in questa giornata.</div>
        ) : (
          <div key={date} className="space-y-2">
            {ofDay.map((b, bi) => {
              const done = b.status === "done";
              return (
                <div key={b.id} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm flex items-start gap-3 lc-fade-up" style={{ animationDelay: `${Math.min(bi * 50, 400)}ms` }}>
                  <div className="flex flex-col items-center shrink-0 w-16">
                    <div className="font-semibold text-sm">{hhmm(b.startMin)}</div>
                    <div className="text-xs text-stone-400">{hhmm(b.endMin)}</div>
                  </div>
                  <div className="flex-1 min-w-0 border-l border-stone-100 pl-3">
                    <div className="font-medium truncate">{b.clientName || "Cliente"}</div>
                    <div className="text-sm text-stone-500 truncate">{svcNames(b.serviceIds)}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 inline-flex items-center gap-1 ${done ? "bg-green-100 text-green-700" : "bg-sky-100 text-sky-700"}`}>
                    {done ? <><CheckCircle2 size={12} /> Completato</> : <><Clock size={12} /> In programma</>}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-stone-400 text-center mt-6">Hai {upcoming} appuntament{upcoming === 1 ? "o" : "i"} in programma da oggi in poi.</p>
      </main>
    </div>
  );
}
