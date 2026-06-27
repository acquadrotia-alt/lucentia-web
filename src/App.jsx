import { useState, useEffect, useCallback } from "react";
import { Lock, Mail, LogOut, AlertTriangle, ShieldCheck, Phone, MessageCircle, Globe, Sparkles } from "lucide-react";
import SalonApp from "./SalonApp.jsx";
import ResellerPanel from "./ResellerPanel.jsx";
import OperatorApp from "./OperatorApp.jsx";
import Landing from "./Landing.jsx";
import BookingPage from "./BookingPage.jsx";

// Versione dell'app (da package.json, iniettata da Vite). Serve per verificare
// che il deploy si sia aggiornato: per cambiarla basta aggiornare "version" in package.json.
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

async function apiGet(path) {
  const r = await fetch("/api" + path, { credentials: "include" });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}
async function apiSend(path, method, body) {
  const r = await fetch("/api" + path, {
    method, credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

function Login({ onLogged, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!email || !password) return;
    setBusy(true); setErr("");
    const r = await apiSend("/login", "POST", { email: email.trim(), password });
    setBusy(false);
    if (r.ok) onLogged();
    else setErr(r.data && r.data.error ? r.data.error : "Accesso non riuscito.");
  };
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 lc-fade-in">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden lc-scale-in">
        <div className="px-6 pt-8 pb-5 text-center border-b border-stone-100">
          <img src="/lucentia-logo.png" alt="Lucentia — Gestionale per parrucchieri ed estetisti" className="h-20 w-auto mx-auto lc-pop-in" />
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-600"><Lock size={15} style={{ color: "var(--lc-accent)" }} /> Accesso</div>
          <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 transition focus-within:border-[#b8893b] focus-within:ring-2 focus-within:ring-[#efe4cf]">
            <Mail size={16} className="text-stone-400" />
            <input type="email" value={email} autoFocus onChange={(e) => { setEmail(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Email" className="flex-1 text-sm focus:outline-none bg-transparent" />
          </div>
          <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 transition focus-within:border-[#b8893b] focus-within:ring-2 focus-within:ring-[#efe4cf]">
            <Lock size={16} className="text-stone-400" />
            <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Password" className="flex-1 text-sm focus:outline-none bg-transparent" />
          </div>
          {err ? <p className="text-xs text-red-500 text-center lc-fade-up">{err}</p> : null}
          <button onClick={submit} disabled={busy} className="w-full text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50 lc-shine hover:shadow-md hover:brightness-105 inline-flex items-center justify-center gap-2" style={{ background: "var(--lc-accent)" }}>{busy ? <><span className="lc-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.4)" }} /> Attendere…</> : "Entra"}</button>
          {onBack ? <button onClick={onBack} className="w-full text-xs text-stone-400 hover:text-stone-600 pt-1">← Torna alla home</button> : null}
          <p className="text-center text-[11px] text-stone-300 pt-2 select-none tracking-wide">V {APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
}

function Blocked({ stato, denominazione, onLogout }) {
  const msg = stato === "expired" ? "La licenza di questo salone è scaduta." : stato === "disabled" ? "L'accesso a questo salone è stato sospeso." : "Licenza non attiva.";
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 lc-fade-in">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-sm p-6 text-center lc-scale-in">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3 lc-pop-in"><AlertTriangle size={22} /></div>
        <h2 className="font-semibold text-lg">{denominazione || "Lucentia"}</h2>
        <p className="text-sm text-stone-500 mt-2">{msg}</p>
        <p className="text-sm text-stone-500 mt-1">Contatta il fornitore per il rinnovo.</p>
        <button onClick={onLogout} className="mt-5 w-full border border-stone-300 text-stone-600 font-medium py-2.5 rounded-lg hover:bg-stone-50 inline-flex items-center justify-center gap-2"><LogOut size={16} /> Esci</button>
      </div>
    </div>
  );
}

const CONTACTS = { nome: "Office Solution", tel: "3920241955", email: "Amministrazione@cmav.it", sito: "officesolutionoleggio.com" };

function DemoExpired({ denominazione, onLogout }) {
  const wa = "39" + CONTACTS.tel.replace(/\D/g, "");
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 lc-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden lc-scale-in">
        <div className="px-6 pt-8 pb-5 text-center border-b border-stone-100">
          <img src="/lucentia-logo.png" alt="Lucentia" className="h-16 w-auto mx-auto lc-pop-in" />
        </div>
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3 lc-float"><Sparkles size={22} /></div>
          <h2 className="font-semibold text-lg">La tua prova demo è terminata</h2>
          <p className="text-sm text-stone-500 mt-2">Grazie per aver provato Lucentia{denominazione ? `, ${denominazione}` : ""}. Per continuare e attivare una licenza completa, contattaci:</p>
          <div className="mt-5 space-y-2 text-left">
            <a href={`tel:+${wa}`} className="flex items-center gap-3 border border-stone-200 rounded-xl p-3 hover:bg-stone-50 hover:border-stone-300 hover:translate-x-1 transition"><Phone size={18} className="text-stone-500" /><span className="text-sm"><b>Telefono</b><br />{CONTACTS.tel}</span></a>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 border border-stone-200 rounded-xl p-3 hover:bg-stone-50 hover:border-stone-300 hover:translate-x-1 transition"><MessageCircle size={18} className="text-green-600" /><span className="text-sm"><b>WhatsApp</b><br />Scrivici subito</span></a>
            <a href={`mailto:${CONTACTS.email}`} className="flex items-center gap-3 border border-stone-200 rounded-xl p-3 hover:bg-stone-50 hover:border-stone-300 hover:translate-x-1 transition"><Mail size={18} className="text-stone-500" /><span className="text-sm"><b>Email</b><br />{CONTACTS.email}</span></a>
            <a href={`https://${CONTACTS.sito}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 border border-stone-200 rounded-xl p-3 hover:bg-stone-50 hover:border-stone-300 hover:translate-x-1 transition"><Globe size={18} className="text-stone-500" /><span className="text-sm"><b>Sito web</b><br />{CONTACTS.sito}</span></a>
          </div>
          <button onClick={onLogout} className="mt-5 w-full border border-stone-300 text-stone-600 font-medium py-2.5 rounded-lg hover:bg-stone-50 inline-flex items-center justify-center gap-2"><LogOut size={16} /> Esci</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Link pubblico di prenotazione online: ?prenota=<aziendaId> (nessun login).
  const prenotaId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("prenota") : null;
  if (prenotaId) return <BookingPage aid={prenotaId} />;

  const [stato, setStato] = useState("loading"); // loading | login | ready
  const [me, setMe] = useState(null);
  const [showLogin, setShowLogin] = useState(() => {
    if (typeof window === "undefined") return false;
    const h = (window.location.hash || "").toLowerCase();
    return h === "#login" || h === "#accedi" || new URLSearchParams(window.location.search).has("login");
  });

  const refresh = useCallback(async () => {
    const r = await apiGet("/me");
    if (r.ok && r.data && r.data.user) { setMe(r.data); setStato("ready"); }
    else { setMe(null); setStato("login"); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const openLogin = () => { setShowLogin(true); if (typeof window !== "undefined") window.history.replaceState(null, "", "#login"); };
  const closeLogin = () => { setShowLogin(false); if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname + window.location.search); };

  const logout = async () => { await apiSend("/logout", "POST"); setMe(null); closeLogin(); setStato("login"); };

  if (stato === "loading") return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4 lc-fade-in">
      <div className="lc-spinner" />
      <div className="text-stone-400 text-sm">Caricamento…</div>
    </div>
  );
  if (stato === "login" || !me) {
    if (showLogin) return <Login onLogged={refresh} onBack={closeLogin} />;
    return <Landing onLogin={openLogin} />;
  }

  if (me.user.ruolo === "reseller") {
    if (me.reseller && me.reseller.stato !== "active") return <Blocked stato={me.reseller.stato} denominazione={me.reseller.ragione_sociale || ""} onLogout={logout} />;
    return <ResellerPanel email={me.user.email} master={!!me.user.master} onLogout={logout} apiGet={apiGet} apiSend={apiSend} />;
  }

  if (me.user.ruolo === "operatore") {
    const azo = me.azienda;
    if (!azo || azo.stato !== "active") return <Blocked stato={azo ? azo.stato : "none"} denominazione={azo ? azo.denominazione : ""} onLogout={logout} />;
    return <OperatorApp user={me.user} azienda={azo} onLogout={logout} />;
  }

  // ruolo azienda
  const az = me.azienda;
  if (az && az.demo && az.stato !== "active") return <DemoExpired denominazione={az.denominazione} onLogout={logout} />;
  if (!az || az.stato !== "active") return <Blocked stato={az ? az.stato : "none"} denominazione={az ? az.denominazione : ""} onLogout={logout} />;
  return <SalonApp onLogout={logout} moduli={az.moduli} azienda={az} demo={!!az.demo} />;
}
