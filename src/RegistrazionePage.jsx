// ============================================================================
// /registrazione — l'account del cliente per prenotare online. Il link non è
// sul sito: lo dà il salone. Nome, cognome, telefono, email e password sono
// obbligatori; a registrazione fatta arriva l'email di benvenuto col riepilogo
// dei dati e la password scelta, e si entra in «Prenota» con email e password.
// ============================================================================
import { useState, useEffect } from "react";
import { User, Phone, Mail, Lock, Check, AlertCircle, ArrowRight } from "lucide-react";
import { setBrandTab } from "./favicon.js";

export default function RegistrazionePage({ aid }) {
  const [info, setInfo] = useState(null);
  const [stato, setStato] = useState("loading");
  const [f, setF] = useState({ nome: "", cognome: "", telefono: "", email: "", password: "", conferma: "" });
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fatto, setFatto] = useState(null);
  const suDominio = typeof window !== "undefined" && window.location.pathname.startsWith("/registrazione");
  const linkPrenota = suDominio ? "/prenota" : `/?prenota=${encodeURIComponent(aid)}`;
  const privacyUrl = suDominio ? "/privacy" : `/privacy?salone=${encodeURIComponent(aid)}`;
  useEffect(() => {
    (async () => {
      try { const r = await fetch("/api/prenota/" + aid); const j = await r.json().catch(() => ({})); if (r.ok && j.ok) { setInfo(j); setStato("ready"); setBrandTab((j.sito && j.sito.favicon) || j.salone.logo, `Registrazione · ${j.salone.brandName}`); } else setStato("error"); }
      catch (e) { setStato("error"); }
    })();
  }, [aid]);
  const primary = (info && info.salone.primary) || "#b8893b";
  const invia = async () => {
    setErr("");
    if (!f.nome.trim() || !f.cognome.trim()) { setErr("Nome e cognome sono obbligatori."); return; }
    if (f.telefono.replace(/\D/g, "").length < 6) { setErr("Inserisci un numero di telefono valido."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setErr("Inserisci un indirizzo email valido."); return; }
    if (f.password.length < 6) { setErr("La password deve avere almeno 6 caratteri."); return; }
    if (f.password !== f.conferma) { setErr("Le due password non coincidono."); return; }
    if (!privacy) { setErr("Per registrarti devi accettare l'informativa sulla privacy."); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/clienti/${aid}/registra`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: f.nome.trim(), cognome: f.cognome.trim(), telefono: f.telefono.trim(), email: f.email.trim(), password: f.password, privacy: true }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || "Registrazione non riuscita."); setBusy(false); return; }
      setFatto(j);
    } catch (e) { setErr("Rete assente: riprova fra poco."); }
    setBusy(false);
  };
  if (stato === "loading") return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><div className="lc-spinner" /></div>;
  if (stato === "error") return <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4"><div className="lc-card p-8 text-center max-w-sm"><AlertCircle size={22} className="mx-auto text-amber-500 mb-3" /><h2 className="font-display text-xl font-semibold text-stone-900">Registrazione non disponibile</h2><p className="text-sm text-stone-500 mt-2">Le prenotazioni online non sono attive per questo salone. Contatta direttamente l'attività.</p></div></div>;
  const b = info.salone;
  const inp = "flex-1 text-sm focus:outline-none bg-transparent";
  const Riga = ({ icon: Icon, children }) => <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2.5 transition-colors focus-within:border-stone-400"><Icon size={16} className="text-stone-400 shrink-0" />{children}</div>;
  return (
    <div className="min-h-screen bg-stone-50" style={{ "--brand": primary }}>
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="text-center mb-6 lc-fade-up">
          {b.logo ? <img src={b.logo} alt={b.brandName} className="h-16 w-16 rounded-2xl object-cover mx-auto mb-3 ring-2 ring-white shadow-md" /> : null}
          <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-900">{b.brandName}</h1>
          <p className="text-sm text-stone-500 mt-1">{fatto ? "Registrazione completata" : "Crea il tuo account per prenotare online"}</p>
        </div>
        {fatto ? (
          <div className="lc-card lc-scale-in p-7 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: primary, color: "#fff" }}><Check size={28} /></div>
            <h2 className="font-display text-xl font-semibold text-stone-900">Benvenuto, {fatto.cliente.nome}!</h2>
            <p className="text-sm text-stone-500 mt-2 leading-relaxed">{fatto.emailInviata ? <>Ti abbiamo mandato un'email a <b>{fatto.cliente.email}</b> con il riepilogo dei tuoi dati e la password scelta.</> : <>Il tuo account è pronto. Conserva la password che hai scelto: ti serve per prenotare.</>}</p>
            <div className="mt-5 rounded-xl bg-stone-50 border border-stone-100 p-4 text-left text-sm space-y-1">
              <div><span className="text-stone-400">Nome</span> · {fatto.cliente.nome} {fatto.cliente.cognome}</div>
              <div><span className="text-stone-400">Telefono</span> · {fatto.cliente.telefono}</div>
              <div><span className="text-stone-400">Email</span> · {fatto.cliente.email}</div>
            </div>
            <a href={linkPrenota} className="mt-5 w-full text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 lc-shine" style={{ background: primary }}>Vai a Prenota <ArrowRight size={16} /></a>
          </div>
        ) : (
          <div className="lc-card lc-fade-up p-5">
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <Riga icon={User}><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Nome *" className={inp} autoComplete="given-name" /></Riga>
                <Riga icon={User}><input value={f.cognome} onChange={(e) => setF({ ...f, cognome: e.target.value })} placeholder="Cognome *" className={inp} autoComplete="family-name" /></Riga>
              </div>
              <Riga icon={Phone}><input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} type="tel" placeholder="Telefono *" className={inp} autoComplete="tel" /></Riga>
              <Riga icon={Mail}><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} type="email" placeholder="Email *" className={inp} autoComplete="email" /></Riga>
              <Riga icon={Lock}><input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} type="password" placeholder="Scegli una password (almeno 6 caratteri) *" className={inp} autoComplete="new-password" /></Riga>
              <Riga icon={Lock}><input value={f.conferma} onChange={(e) => setF({ ...f, conferma: e.target.value })} type="password" placeholder="Ripeti la password *" className={inp} autoComplete="new-password" /></Riga>
            </div>
            <label className="mt-4 flex items-start gap-2.5 text-xs text-stone-600 cursor-pointer">
              <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="w-4 h-4 mt-0.5 shrink-0" style={{ accentColor: primary }} />
              <span>Ho letto l'<a href={privacyUrl} target="_blank" rel="noreferrer" className="underline" style={{ color: primary }}>informativa sulla privacy</a> e acconsento al trattamento dei miei dati per gestire il mio account e le prenotazioni. *</span>
            </label>
            {err ? <p className="text-xs text-red-500 mt-3 flex items-center gap-1.5"><AlertCircle size={13} /> {err}</p> : null}
            <button onClick={invia} disabled={busy} className="mt-4 w-full text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 lc-shine" style={{ background: primary }}>{busy ? "Registro…" : "Registrati"}</button>
            <p className="text-[11px] text-stone-400 mt-3 text-center">Hai già un account? Entra da <a href={linkPrenota} className="underline">Prenota</a>.</p>
          </div>
        )}
        <p className="text-center text-[11px] text-stone-300 mt-6">Prenotazioni online · powered by Lucentia</p>
      </div>
    </div>
  );
}
