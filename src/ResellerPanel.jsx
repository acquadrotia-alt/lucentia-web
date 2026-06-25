import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, LogOut, Plus, KeyRound, Ban, BadgeCheck, Trash2, CalendarClock, Store, Mail, Boxes, X, Check, Users, Tag } from "lucide-react";

const DURATE = [[1, "1 mese"], [3, "3 mesi"], [6, "6 mesi"], [12, "12 mesi"], [24, "24 mesi"], [0, "Illimitata"]];
const OPT = [["fidelity", "Fidelity"], ["vendite", "Vendite"], ["statistiche", "Statistiche"], ["marketing", "Marketing"], ["allergeni", "Allergeni e patologie"], ["pacchetti", "Pacchetti sedute"]];
const OPT_KEYS = OPT.map((m) => m[0]);
const OPER = [["1", "1 operatore (base)"], ["3", "Fino a 3 operatori"], ["inf", "Operatori illimitati"]];
const IVA = 0.22;
const PRESETS = [
  ["Basic", [], "1", 9],
  ["Smart", ["fidelity", "pacchetti", "vendite"], "3", 11.5],
  ["Pro", OPT_KEYS.slice(), "inf", 12.5],
];
const sameSet = (a, b) => a.length === b.length && a.slice().sort().join(",") === b.slice().sort().join(",");
const presetName = (opt, tier) => { const p = PRESETS.find((x) => x[2] === tier && sameSet(x[1], opt)); return p ? p[0] : "Personalizzato"; };

const tierFrom = (m) => { const a = Array.isArray(m) ? m : []; return a.includes("opinf") ? "inf" : (a.includes("op3") ? "3" : "1"); };
const optFrom = (m) => (Array.isArray(m) ? m.filter((k) => OPT_KEYS.includes(k)) : []);
const buildModuli = (opt, tier) => [...opt, ...(tier === "inf" ? ["opinf"] : tier === "3" ? ["op3"] : [])];

function fmt(d) { if (!d) return "—"; const p = String(d).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; }
function num(v) { const n = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isNaN(n) ? null : n; }
function totale(mensile, mesi) { const n = num(mensile); return n == null ? "" : "€ " + (n * mesi).toFixed(2).replace(".", ","); }
const toMoney = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",");
const applyPlan = (price, setImp, setFin) => { setImp(toMoney(price)); setFin(toMoney(price * (1 + IVA))); };
function statoBadge(a) {
  if (a.stato === "active" && !a.licenza_scadenza) return { txt: "Illimitata", cls: "bg-green-100 text-green-700" };
  if (a.stato === "active") return { txt: `Attiva fino al ${fmt(a.licenza_scadenza)}`, cls: "bg-green-100 text-green-700" };
  if (a.stato === "expired") return { txt: `Scaduta il ${fmt(a.licenza_scadenza)}`, cls: "bg-red-100 text-red-700" };
  if (a.stato === "disabled") return { txt: "Sospesa", cls: "bg-stone-200 text-stone-600" };
  return { txt: a.stato, cls: "bg-stone-100 text-stone-600" };
}

function ModuleEditor({ opt, setOpt, tier, setTier, onPrezzo }) {
  const toggle = (k) => setOpt((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const cur = presetName(opt, tier);
  return (
    <div>
      <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Piano</div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {PRESETS.map((p) => { const on = cur === p[0]; return (
          <button key={p[0]} type="button" onClick={() => { setOpt(p[1].slice()); setTier(p[2]); if (onPrezzo && p[3] != null) onPrezzo(p[3]); }} className={`text-sm px-3 py-1.5 rounded-lg border transition ${on ? "text-white border-transparent" : "bg-white border-stone-300 text-stone-600"}`} style={on ? { background: "#0d9488" } : {}}>{p[0]}</button>
        ); })}
        {cur === "Personalizzato" ? <span className="text-xs text-stone-400">· personalizzato</span> : null}
      </div>
      <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Moduli opzionali</div>
      <div className="flex flex-wrap gap-2">
        {OPT.map((m) => { const on = opt.includes(m[0]); return (
          <button key={m[0]} type="button" onClick={() => toggle(m[0])} className={`text-sm px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 transition ${on ? "text-white border-transparent" : "bg-white border-stone-300 text-stone-500"}`} style={on ? { background: "#e11d48" } : {}}>
            {on ? <Check size={14} /> : null} {m[1]}
          </button>
        ); })}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Users size={15} className="text-stone-400" />
        <select value={tier} onChange={(e) => setTier(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white">{OPER.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>
      </div>
      <p className="text-[11px] text-stone-400 mt-2">Sempre incluso (base): Agenda e Clienti (anagrafica + storico appuntamenti).</p>
    </div>
  );
}

export default function ResellerPanel({ email, onLogout, apiGet, apiSend }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiGet("/aziende");
    setItems(r.ok && r.data.items ? r.data.items : []);
    setLoading(false);
  }, [apiGet]);
  useEffect(() => { load(); }, [load]);

  const [den, setDen] = useState("");
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [mesi, setMesi] = useState(12);
  const [opt, setOpt] = useState(OPT_KEYS.slice());
  const [tier, setTier] = useState("inf");
  const [pImp, setPImp] = useState("");
  const [pFin, setPFin] = useState("");
  const [creating, setCreating] = useState(false);
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 3000); };

  const crea = async () => {
    if (!den.trim() || !em.trim() || pw.length < 6) { flash("Compila nome, email e password (min 6)."); return; }
    setCreating(true);
    const r = await apiSend("/aziende", "POST", { denominazione: den.trim(), email: em.trim(), password: pw, mesi, moduli: buildModuli(opt, tier), prezzo_imponibile: pImp, prezzo_finale: pFin });
    setCreating(false);
    if (r.ok) { setDen(""); setEm(""); setPw(""); setMesi(12); setOpt(OPT_KEYS.slice()); setTier("inf"); setPImp(""); setPFin(""); flash("Cliente creato."); load(); }
    else flash(r.data && r.data.error ? r.data.error : "Errore nella creazione.");
  };
  const patch = async (id, body, ok) => { const r = await apiSend(`/aziende/${id}`, "PATCH", body); if (r.ok) { flash(ok || "Aggiornato."); load(); } else flash(r.data && r.data.error ? r.data.error : "Errore."); };
  const elimina = async (a) => { if (!confirm(`Eliminare definitivamente "${a.denominazione}" e tutti i suoi dati? L'operazione non è reversibile.`)) return; const r = await apiSend(`/aziende/${a.id}`, "DELETE"); if (r.ok) { flash("Cliente eliminato."); load(); } else flash("Errore nell'eliminazione."); };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold" style={{ color: "#e11d48" }}>Lucentia</div>
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-stone-800 text-white px-2 py-1 rounded-lg"><ShieldCheck size={13} /> Rivenditore</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-400 hidden sm:inline">{email}</span>
            <button onClick={onLogout} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"><LogOut size={16} /> Esci</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {msg ? <div className="bg-stone-800 text-white text-sm rounded-lg px-3 py-2 inline-flex items-center gap-2"><Check size={15} /> {msg}</div> : null}

        <section className="bg-white rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: "#e11d48" }}>
          <h2 className="font-semibold flex items-center gap-2 mb-3"><Plus size={16} style={{ color: "#e11d48" }} /> Nuovo salone-cliente</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Nome salone</div><div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2"><Store size={15} className="text-stone-400" /><input value={den} onChange={(e) => setDen(e.target.value)} placeholder="Es. Salone Bellezza" className="flex-1 text-sm focus:outline-none" /></div></div>
            <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Email di accesso</div><div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2"><Mail size={15} className="text-stone-400" /><input value={em} onChange={(e) => setEm(e.target.value)} placeholder="cliente@email.it" className="flex-1 text-sm focus:outline-none" /></div></div>
            <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Password iniziale</div><div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2"><KeyRound size={15} className="text-stone-400" /><input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="min 6 caratteri" className="flex-1 text-sm focus:outline-none" /></div></div>
            <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Durata licenza</div><select value={mesi} onChange={(e) => setMesi(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white">{DURATE.map((d) => <option key={d[0]} value={d[0]}>{d[1]}</option>)}</select></div>
          </div>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Imponibile (IVA escl.) €/mese</div><input value={pImp} inputMode="decimal" onChange={(e) => setPImp(e.target.value)} placeholder="lascia vuoto" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" /></div>
            <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Prezzo finale mensile €</div><input value={pFin} inputMode="decimal" onChange={(e) => setPFin(e.target.value)} placeholder="lascia vuoto" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" /></div>
          </div>
          <div className="mt-4"><ModuleEditor opt={opt} setOpt={setOpt} tier={tier} setTier={setTier} onPrezzo={(price) => applyPlan(price, setPImp, setPFin)} /></div>
          {mesi > 0 && (num(pImp) != null || num(pFin) != null) ? (
            <div className="mt-4 text-sm bg-stone-50 rounded-lg px-3 py-2.5 text-stone-700">Costo cliente per la durata della licenza ({mesi} mesi):{num(pImp) != null ? <> imponibile <b>{totale(pImp, mesi)}</b></> : null}{num(pFin) != null ? <> · IVA incl. <b>{totale(pFin, mesi)}</b></> : null}</div>
          ) : null}
          <button onClick={crea} disabled={creating} className="mt-4 text-white font-medium px-4 py-2.5 rounded-lg inline-flex items-center gap-2 disabled:opacity-50" style={{ background: "#e11d48" }}><Plus size={16} /> {creating ? "Creazione…" : "Crea cliente"}</button>
        </section>

        <section>
          <h2 className="font-semibold mb-3">Saloni-cliente {items.length ? <span className="text-sm font-normal text-stone-400">· {items.length}</span> : null}</h2>
          {loading ? <p className="text-sm text-stone-400">Caricamento…</p> : items.length === 0 ? <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400">Ancora nessun cliente. Creane uno qui sopra.</div> : (
            <div className="space-y-3">{items.map((a) => <ClientRow key={a.id} a={a} onPatch={patch} onDelete={elimina} />)}</div>
          )}
        </section>
      </main>
    </div>
  );
}

function ClientRow({ a, onPatch, onDelete }) {
  const badge = statoBadge(a);
  const [rinnovo, setRinnovo] = useState(12);
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [modsOpen, setModsOpen] = useState(false);
  const [opt, setOpt] = useState(optFrom(a.moduli));
  const [tier, setTier] = useState(tierFrom(a.moduli));
  const [prezzoOpen, setPrezzoOpen] = useState(false);
  const [pImp, setPImp] = useState(a.prezzo_imponibile || "");
  const [pFin, setPFin] = useState(a.prezzo_finale || "");

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium truncate">{a.denominazione}</div>
          <div className="text-xs text-stone-400 truncate flex items-center gap-1"><Mail size={12} /> {a.email || "—"}{a.prezzo_finale ? <span className="text-stone-300">· €{a.prezzo_finale}/mese</span> : null}</div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${badge.cls}`}>{badge.txt}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
        <select value={rinnovo} onChange={(e) => setRinnovo(Number(e.target.value))} className="px-2 py-1.5 rounded-lg border border-stone-300 text-sm bg-white">{DURATE.map((d) => <option key={d[0]} value={d[0]}>{d[1]}</option>)}</select>
        <button onClick={() => onPatch(a.id, { rinnovaMesi: rinnovo }, "Licenza rinnovata.")} className="text-sm font-medium text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style={{ background: "#e11d48" }}><CalendarClock size={14} /> Rinnova</button>

        {a.attiva
          ? <button onClick={() => onPatch(a.id, { attiva: false }, "Cliente sospeso.")} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:bg-stone-50"><Ban size={14} /> Sospendi</button>
          : <button onClick={() => onPatch(a.id, { attiva: true }, "Cliente riattivato.")} className="text-sm font-medium border border-green-300 text-green-700 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:bg-green-50"><BadgeCheck size={14} /> Riattiva</button>}

        <button onClick={() => setPwOpen((o) => !o)} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:bg-stone-50"><KeyRound size={14} /> Password</button>
        <button onClick={() => setModsOpen((o) => !o)} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:bg-stone-50"><Boxes size={14} /> Moduli</button>
        <button onClick={() => setPrezzoOpen((o) => !o)} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:bg-stone-50"><Tag size={14} /> Prezzo</button>
        <button onClick={() => onDelete(a)} className="text-sm font-medium border border-red-300 text-red-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:bg-red-50 ml-auto"><Trash2 size={14} /> Elimina</button>
      </div>

      {pwOpen ? (
        <div className="mt-2 flex items-center gap-2">
          <input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Nuova password (min 6)" className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-sm" />
          <button onClick={() => { if (newPw.length >= 6) { onPatch(a.id, { nuovaPassword: newPw }, "Password aggiornata."); setNewPw(""); setPwOpen(false); } }} className="text-sm font-medium text-white px-3 py-1.5 rounded-lg" style={{ background: "#e11d48" }}>Salva</button>
          <button onClick={() => { setPwOpen(false); setNewPw(""); }} className="text-stone-400"><X size={16} /></button>
        </div>
      ) : null}

      {modsOpen ? (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <ModuleEditor opt={opt} setOpt={setOpt} tier={tier} setTier={setTier} onPrezzo={(price) => applyPlan(price, setPImp, setPFin)} />
          <button onClick={() => { onPatch(a.id, { moduli: buildModuli(opt, tier) }, "Moduli aggiornati."); setModsOpen(false); }} className="mt-3 text-sm font-medium text-white px-3 py-1.5 rounded-lg" style={{ background: "#e11d48" }}>Salva moduli</button>
        </div>
      ) : null}

      {prezzoOpen ? (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Imponibile (IVA escl.) €/mese</div><input value={pImp} inputMode="decimal" onChange={(e) => setPImp(e.target.value)} placeholder="lascia vuoto" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" /></div>
            <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Prezzo finale mensile €</div><input value={pFin} inputMode="decimal" onChange={(e) => setPFin(e.target.value)} placeholder="lascia vuoto" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" /></div>
          </div>
          <button onClick={() => { onPatch(a.id, { prezzo_imponibile: pImp, prezzo_finale: pFin }, "Prezzo aggiornato."); setPrezzoOpen(false); }} className="mt-3 text-sm font-medium text-white px-3 py-1.5 rounded-lg" style={{ background: "#e11d48" }}>Salva prezzo</button>
        </div>
      ) : null}
    </div>
  );
}
