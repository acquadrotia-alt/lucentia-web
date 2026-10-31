import { useState, useEffect, useCallback } from "react";
import { Lock, Mail, LogOut, AlertTriangle, Phone, MessageCircle, Globe, Sparkles, Wrench } from "lucide-react";
import SalonApp from "./core/salone/SalonApp.jsx";
import PannelloHub from "./hub/PannelloHub.jsx";
import OperatorApp from "./OperatorApp.jsx";
import Site from "./site/Site.jsx";
import BookingPage from "./BookingPage.jsx";
import EventoPage from "./EventoPage.jsx";
import SitoSalone from "./core/sito/SitoSalone.jsx";
import { CONTACTS } from "./contatti.js";

// Versione dell'app (da package.json, iniettata da Vite). Serve per verificare
// che il deploy si sia aggiornato: per cambiarla basta aggiornare "version" in package.json.
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
// Modalità decisa al build (variabile MODALITA del progetto Cloudflare). È solo
// l'ipotesi di partenza: quella vera la dice il server con GET /api/installazione.
const MODALITA_BUILD = typeof __MODALITA__ !== "undefined" ? __MODALITA__ : "hub";

export async function apiGet(path) {
  const r = await fetch("/api" + path, { credentials: "include" });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}
export async function apiSend(path, method, body) {
  const r = await fetch("/api" + path, {
    method, credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

// Schermata di accesso. Sul portale porta il logo Lucentia; sul dominio di un
// salone porta il logo e il colore del salone.
function Login({ onLogged, onBack, brand }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const accent = brand && brand.primary ? brand.primary : "var(--lc-accent)";
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
          {brand ? (
            <>
              {brand.logo ? <img src={brand.logo} alt={brand.brandName} className="h-16 w-16 rounded-2xl object-cover mx-auto lc-pop-in ring-1 ring-stone-200" /> : <div className="h-16 w-16 rounded-2xl mx-auto flex items-center justify-center text-white lc-pop-in" style={{ background: accent }}><Sparkles size={28} /></div>}
              <div className="font-display text-xl font-semibold text-stone-900 mt-3">{brand.brandName}</div>
              <div className="text-xs text-stone-400 mt-0.5">Gestionale</div>
            </>
          ) : <img src="/lucentia-logo.png" alt="Lucentia — Gestionale per parrucchieri ed estetisti" className="h-20 w-auto mx-auto lc-pop-in" />}
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-600"><Lock size={15} style={{ color: accent }} /> Accesso</div>
          <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 transition focus-within:border-stone-400 focus-within:ring-2 focus-within:ring-stone-100">
            <Mail size={16} className="text-stone-400" />
            <input type="email" value={email} autoFocus onChange={(e) => { setEmail(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Email" className="flex-1 text-sm focus:outline-none bg-transparent" />
          </div>
          <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 transition focus-within:border-stone-400 focus-within:ring-2 focus-within:ring-stone-100">
            <Lock size={16} className="text-stone-400" />
            <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Password" className="flex-1 text-sm focus:outline-none bg-transparent" />
          </div>
          {err ? <p className="text-xs text-red-500 text-center lc-fade-up">{err}</p> : null}
          <button onClick={submit} disabled={busy} className="w-full text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50 lc-shine hover:shadow-md hover:brightness-105 inline-flex items-center justify-center gap-2" style={{ background: accent }}>{busy ? <><span className="lc-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.4)" }} /> Attendere…</> : "Entra"}</button>
          {onBack ? <button onClick={onBack} className="w-full text-xs text-stone-400 hover:text-stone-600 pt-1">← Torna al sito</button> : null}
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
          <p className="text-sm text-stone-500 mt-2">Grazie per aver provato Lucentia{denominazione ? `, ${denominazione}` : ""}. Per continuare con il tuo sito e il tuo gestionale, contattaci:</p>
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

// Pagina mostrata su TUTTO il dominio di un cliente quando la licenza non è
// attiva: sospesa, scaduta o non verificabile. Con il logo e i colori del salone.
export function Manutenzione({ salone }) {
  const b = salone || {};
  const primary = b.primary || "#b8893b";
  const wa = b.phone ? "39" + String(b.phone).replace(/\D/g, "") : "";
  return (
    <div className="min-h-screen flex items-center justify-center p-6 lc-fade-in" style={{ background: `radial-gradient(70% 60% at 50% 0%, ${primary}22 0%, #fafaf9 70%)` }}>
      <div className="w-full max-w-md text-center lc-scale-in">
        {b.logo ? <img src={b.logo} alt={b.brandName || "Logo"} className="h-24 w-24 rounded-3xl object-cover mx-auto shadow-md ring-4 ring-white" /> : <div className="h-24 w-24 rounded-3xl mx-auto flex items-center justify-center text-white shadow-md ring-4 ring-white" style={{ background: primary }}><Sparkles size={40} /></div>}
        <h1 className="font-display text-3xl font-semibold text-stone-900 mt-6">{b.brandName || b.nome || "Il nostro sito"}</h1>
        {b.tagline ? <p className="text-stone-500 mt-1">{b.tagline}</p> : null}
        <div className="mt-8 bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${primary}1a`, color: primary }}><Wrench size={22} /></div>
          <h2 className="font-semibold text-lg text-stone-900">Sito in manutenzione</h2>
          <p className="text-sm text-stone-500 mt-2">Stiamo lavorando per tornare online il prima possibile. Grazie per la pazienza.</p>
          {(b.phone || b.email) ? (
            <div className="mt-5 flex items-center justify-center gap-2 flex-wrap text-sm">
              {b.phone ? <a href={`tel:+${wa}`} className="inline-flex items-center gap-1.5 border border-stone-200 rounded-xl px-3 py-2 hover:bg-stone-50"><Phone size={15} style={{ color: primary }} /> {b.phone}</a> : null}
              {b.phone ? <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border border-stone-200 rounded-xl px-3 py-2 hover:bg-stone-50"><MessageCircle size={15} className="text-green-600" /> WhatsApp</a> : null}
              {b.email ? <a href={`mailto:${b.email}`} className="inline-flex items-center gap-1.5 border border-stone-200 rounded-xl px-3 py-2 hover:bg-stone-50"><Mail size={15} style={{ color: primary }} /> Email</a> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SetupMancante() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-sm p-6 text-center lc-scale-in">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3"><Wrench size={22} /></div>
        <h2 className="font-semibold text-lg">Installazione da completare</h2>
        <p className="text-sm text-stone-500 mt-2">Il salone non è ancora stato creato su questa installazione. Apri <code className="bg-stone-100 px-1 rounded">/setup.html</code> con il token di configurazione per creare l'accesso del titolare.</p>
      </div>
    </div>
  );
}

function Caricamento() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4 lc-fade-in">
      <div className="lc-spinner" />
      <div className="text-stone-400 text-sm">Caricamento…</div>
    </div>
  );
}

// ---- Installazione cliente: il sito del salone sul suo dominio e, sotto
// /gestionale, il programma. Tutto bloccato dalla pagina di manutenzione
// quando la licenza non è attiva. ----
const PREFISSO_GESTIONALE = "/gestionale";
function AppCliente({ inst, me, stato, refresh, logout }) {
  const [path, setPath] = useState(() => (typeof window !== "undefined" ? window.location.pathname : "/"));
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const vai = useCallback((to) => {
    const dest = String(to || "/");
    if (window.location.pathname + window.location.hash !== dest) window.history.pushState(null, "", dest);
    setPath(dest.split("#")[0]);
    const h = dest.includes("#") ? dest.slice(dest.indexOf("#") + 1) : "";
    if (h) setTimeout(() => { const el = document.getElementById(h); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
    else window.scrollTo({ top: 0 });
  }, []);

  if (inst.stato === "setup") return <SetupMancante />;
  if (inst.stato !== "active") return <Manutenzione salone={inst.salone} />;

  const p = path.replace(/\/+$/, "") || "/";
  if (p === PREFISSO_GESTIONALE || p.startsWith(PREFISSO_GESTIONALE + "/")) {
    if (stato === "loading") return <Caricamento />;
    if (!me) return <Login onLogged={refresh} onBack={() => vai("/")} brand={inst.salone} />;
    const az = me.azienda;
    if (me.user.ruolo === "operatore") {
      if (!az || az.stato !== "active") return <Blocked stato={az ? az.stato : "none"} denominazione={az ? az.denominazione : ""} onLogout={logout} />;
      return <OperatorApp user={me.user} azienda={az} onLogout={logout} />;
    }
    if (!az || az.stato !== "active") return <Blocked stato={az ? az.stato : "none"} denominazione={az ? az.denominazione : ""} onLogout={logout} />;
    return <SalonApp onLogout={logout} moduli={az.moduli} azienda={az} demo={false} modalita="cliente" installazione={me.installazione || null} />;
  }
  if (p === "/prenota") return <BookingPage aid={inst.salone.id} />;
  if (p.startsWith("/evento/")) return <EventoPage token={`${inst.salone.id}:${p.slice("/evento/".length)}`} />;
  return <SitoSalone inst={inst} path={p} vai={vai} />;
}

export default function App() {
  // Link pubblici (nessun login): ?prenota=<aziendaId> per il mini-sito con
  // prenotazione, ?evento=<aziendaId>:<eventoId> per la pagina di un evento.
  const qs = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const prenotaId = qs ? qs.get("prenota") : null;
  const eventoToken = qs ? qs.get("evento") : null;

  const [stato, setStato] = useState("loading"); // loading | login | ready
  const [me, setMe] = useState(null);
  const [inst, setInst] = useState(null); // risposta di GET /api/installazione
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

  useEffect(() => {
    refresh();
    (async () => {
      const r = await apiGet("/installazione");
      // Se il server non risponde si va avanti con la modalità decisa al build.
      setInst(r.ok && r.data && r.data.modalita ? r.data : { modalita: MODALITA_BUILD, stato: "active", salone: null });
    })();
  }, [refresh]);

  const openLogin = () => { setShowLogin(true); if (typeof window !== "undefined") window.history.replaceState(null, "", "#login"); };
  const closeLogin = () => { setShowLogin(false); if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname + window.location.search); };
  const logout = async () => { await apiSend("/logout", "POST"); setMe(null); closeLogin(); setStato("login"); };

  if (eventoToken) return <EventoPage token={eventoToken} />;
  if (prenotaId) return <BookingPage aid={prenotaId} />;

  if (!inst) return <Caricamento />;
  if (inst.modalita === "cliente") return <AppCliente inst={inst} me={me} stato={stato} refresh={refresh} logout={logout} />;

  // ---- Portale Lucentia ----
  if (stato === "loading") return <Caricamento />;
  if (stato === "login" || !me) {
    if (showLogin) return <Login onLogged={refresh} onBack={closeLogin} />;
    return <Site onLogin={openLogin} />;
  }

  if (me.user.ruolo === "reseller") {
    return <PannelloHub email={me.user.email} onLogout={logout} apiGet={apiGet} apiSend={apiSend} />;
  }

  if (me.user.ruolo === "operatore") {
    const azo = me.azienda;
    if (!azo || azo.stato !== "active") return <Blocked stato={azo ? azo.stato : "none"} denominazione={azo ? azo.denominazione : ""} onLogout={logout} />;
    return <OperatorApp user={me.user} azienda={azo} onLogout={logout} />;
  }

  // ruolo azienda (demo pubblica o salone di prova ospitato sul portale)
  const az = me.azienda;
  if (az && az.demo && az.stato !== "active") return <DemoExpired denominazione={az.denominazione} onLogout={logout} />;
  if (!az || az.stato !== "active") return <Blocked stato={az ? az.stato : "none"} denominazione={az ? az.denominazione : ""} onLogout={logout} />;
  return <SalonApp onLogout={logout} moduli={az.moduli} azienda={az} demo={!!az.demo} modalita="hub" />;
}
