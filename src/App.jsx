import { useState, useEffect, useCallback } from "react";
import { Lock, Mail, LogOut, AlertTriangle, ShieldCheck } from "lucide-react";
import SalonApp from "./SalonApp.jsx";
import ResellerPanel from "./ResellerPanel.jsx";
import OperatorApp from "./OperatorApp.jsx";

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

function Login({ onLogged }) {
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
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-6 pt-8 pb-5 text-center border-b border-stone-100">
          <div className="text-3xl font-bold" style={{ color: "#e11d48" }}>Lucentia</div>
          <div className="text-xs text-stone-400 mt-2">Gestionale per centri estetici e parrucchieri</div>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-600"><Lock size={15} style={{ color: "#e11d48" }} /> Accesso</div>
          <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2">
            <Mail size={16} className="text-stone-400" />
            <input type="email" value={email} autoFocus onChange={(e) => { setEmail(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Email" className="flex-1 text-sm focus:outline-none" />
          </div>
          <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2">
            <Lock size={16} className="text-stone-400" />
            <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Password" className="flex-1 text-sm focus:outline-none" />
          </div>
          {err ? <p className="text-xs text-red-500 text-center">{err}</p> : null}
          <button onClick={submit} disabled={busy} className="w-full text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50" style={{ background: "#e11d48" }}>{busy ? "Attendere…" : "Entra"}</button>
        </div>
      </div>
    </div>
  );
}

function Blocked({ stato, denominazione, onLogout }) {
  const msg = stato === "expired" ? "La licenza di questo salone è scaduta." : stato === "disabled" ? "L'accesso a questo salone è stato sospeso." : "Licenza non attiva.";
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3"><AlertTriangle size={22} /></div>
        <h2 className="font-semibold text-lg">{denominazione || "Lucentia"}</h2>
        <p className="text-sm text-stone-500 mt-2">{msg}</p>
        <p className="text-sm text-stone-500 mt-1">Contatta il fornitore per il rinnovo.</p>
        <button onClick={onLogout} className="mt-5 w-full border border-stone-300 text-stone-600 font-medium py-2.5 rounded-lg hover:bg-stone-50 inline-flex items-center justify-center gap-2"><LogOut size={16} /> Esci</button>
      </div>
    </div>
  );
}

export default function App() {
  const [stato, setStato] = useState("loading"); // loading | login | ready
  const [me, setMe] = useState(null);

  const refresh = useCallback(async () => {
    const r = await apiGet("/me");
    if (r.ok && r.data && r.data.user) { setMe(r.data); setStato("ready"); }
    else { setMe(null); setStato("login"); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = async () => { await apiSend("/logout", "POST"); setMe(null); setStato("login"); };

  if (stato === "loading") return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400 text-sm">Caricamento…</div>
  );
  if (stato === "login" || !me) return <Login onLogged={refresh} />;

  if (me.user.ruolo === "reseller") return <ResellerPanel email={me.user.email} onLogout={logout} apiGet={apiGet} apiSend={apiSend} />;

  if (me.user.ruolo === "operatore") {
    const azo = me.azienda;
    if (!azo || azo.stato !== "active") return <Blocked stato={azo ? azo.stato : "none"} denominazione={azo ? azo.denominazione : ""} onLogout={logout} />;
    return <OperatorApp user={me.user} azienda={azo} onLogout={logout} />;
  }

  // ruolo azienda
  const az = me.azienda;
  if (!az || az.stato !== "active") return <Blocked stato={az ? az.stato : "none"} denominazione={az ? az.denominazione : ""} onLogout={logout} />;
  return <SalonApp onLogout={logout} moduli={az.moduli} />;
}
