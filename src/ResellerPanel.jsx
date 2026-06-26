import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, LogOut, Plus, KeyRound, Ban, BadgeCheck, Trash2, CalendarClock, Store, Mail, Boxes, X, Check, Users, Tag, Building2, Receipt, Filter, Inbox, Phone, Sparkles, Clock } from "lucide-react";

const DURATE = [[1, "1 mese"], [3, "3 mesi"], [6, "6 mesi"], [12, "12 mesi"], [24, "24 mesi"], [0, "Illimitata"]];
const OPT = [["fidelity", "Fidelity"], ["vendite", "Vendite"], ["statistiche", "Statistiche"], ["marketing", "Marketing"], ["allergeni", "Allergeni e patologie"], ["pacchetti", "Pacchetti sedute"]];
const OPT_KEYS = OPT.map((m) => m[0]);
const OPER = [["1", "1 operatore (base)"], ["3", "Fino a 3 operatori"], ["inf", "Operatori illimitati"]];
const IVA = 0.22;
const PRESETS = [
  ["Basic", [], "1", 9],
  ["Smart", ["fidelity", "pacchetti", "vendite"], "3", 12],
  ["Pro", OPT_KEYS.slice(), "inf", 19.5],
];
const sameSet = (a, b) => a.length === b.length && a.slice().sort().join(",") === b.slice().sort().join(",");
const presetName = (opt, tier) => { const p = PRESETS.find((x) => x[2] === tier && sameSet(x[1], opt)); return p ? p[0] : "Personalizzato"; };
const planPrice = (opt, tier) => { const p = PRESETS.find((x) => x[2] === tier && sameSet(x[1], opt)); return p ? p[3] : null; };
const tierFrom = (m) => { const a = Array.isArray(m) ? m : []; return a.includes("opinf") ? "inf" : (a.includes("op3") ? "3" : "1"); };
const optFrom = (m) => (Array.isArray(m) ? m.filter((k) => OPT_KEYS.includes(k)) : []);
const buildModuli = (opt, tier) => [...opt, ...(tier === "inf" ? ["opinf"] : tier === "3" ? ["op3"] : [])];

function fmt(d) { if (!d) return "—"; const p = String(d).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; }
function num(v) { const n = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isNaN(n) ? null : n; }
function totale(mensile, mesi) { const n = num(mensile); return n == null ? null : n * (Number(mesi) || 0); }
const eur = (n) => "€ " + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",");
const toMoney = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",");
const applyPlan = (price, setImp, setFin) => { setImp(toMoney(price)); setFin(toMoney(price * (1 + IVA))); };
const thisMonth = () => new Date().toISOString().slice(0, 7);

function statoBadge(a) {
  if (a.stato === "active" && !a.licenza_scadenza) return { txt: "Illimitata", cls: "bg-green-100 text-green-700" };
  if (a.stato === "active") return { txt: `Attiva fino al ${fmt(a.licenza_scadenza)}`, cls: "bg-green-100 text-green-700" };
  if (a.stato === "expired") return { txt: `Scaduta il ${fmt(a.licenza_scadenza)}`, cls: "bg-red-100 text-red-700" };
  if (a.stato === "disabled") return { txt: "Sospesa", cls: "bg-stone-200 text-stone-600" };
  return { txt: a.stato, cls: "bg-stone-100 text-stone-600" };
}

function ModuleEditor({ opt, setOpt, tier, setTier, onPrezzo, planOnly }) {
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
      {!planOnly ? (
        <>
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
        </>
      ) : null}
      <p className="text-[11px] text-stone-400 mt-2">Sempre incluso (base): Agenda e Clienti (anagrafica + storico appuntamenti).</p>
    </div>
  );
}

export default function ResellerPanel({ email, master, onLogout, apiGet, apiSend }) {
  const [tab, setTab] = useState("licenze");
  const [msg, setMsg] = useState("");
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 3000); };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("all");
  const [resellers, setResellers] = useState([]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    const q = master && filtro !== "all" ? `?reseller=${encodeURIComponent(filtro)}` : "";
    const r = await apiGet("/aziende" + q);
    setItems(r.ok && r.data.items ? r.data.items : []);
    setLoading(false);
  }, [apiGet, master, filtro]);
  useEffect(() => { loadClients(); }, [loadClients]);

  const loadResellers = useCallback(async () => {
    if (!master) return;
    const r = await apiGet("/rivenditori");
    setResellers(r.ok && r.data.items ? r.data.items : []);
  }, [apiGet, master]);
  useEffect(() => { loadResellers(); }, [loadResellers]);

  const [den, setDen] = useState("");
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [mesi, setMesi] = useState(12);
  const [opt, setOpt] = useState(master ? OPT_KEYS.slice() : []);
  const [tier, setTier] = useState(master ? "inf" : "1");
  const [pImp, setPImp] = useState(master ? "" : toMoney(9));
  const [pFin, setPFin] = useState(master ? "" : toMoney(9 * (1 + IVA)));
  const [creating, setCreating] = useState(false);

  const crea = async () => {
    if (!den.trim() || !em.trim() || pw.length < 6) { flash("Compila nome, email e password (min 6)."); return; }
    setCreating(true);
    const r = await apiSend("/aziende", "POST", { denominazione: den.trim(), email: em.trim(), password: pw, mesi, moduli: buildModuli(opt, tier), prezzo_imponibile: pImp, prezzo_finale: pFin });
    setCreating(false);
    if (r.ok) { setDen(""); setEm(""); setPw(""); setMesi(12); setOpt(master ? OPT_KEYS.slice() : []); setTier(master ? "inf" : "1"); setPImp(master ? "" : toMoney(9)); setPFin(master ? "" : toMoney(9 * (1 + IVA))); flash("Cliente creato."); loadClients(); }
    else flash(r.data && r.data.error ? r.data.error : "Errore nella creazione.");
  };
  const patch = async (id, body, ok) => { const r = await apiSend(`/aziende/${id}`, "PATCH", body); if (r.ok) { flash(ok || "Aggiornato."); loadClients(); } else flash(r.data && r.data.error ? r.data.error : "Errore."); };
  const elimina = async (a) => { if (!confirm(`Eliminare definitivamente "${a.denominazione}" e tutti i suoi dati? L'operazione non è reversibile.`)) return; const r = await apiSend(`/aziende/${a.id}`, "DELETE"); if (r.ok) { flash("Cliente eliminato."); loadClients(); } else flash("Errore nell'eliminazione."); };

  const filterOpts = [["all", "Tutte le licenze"], ["me", "Solo le mie"], ...resellers.map((r) => [r.id, r.ragione_sociale || r.email])];
  const showResellerBadge = master && filtro === "all";

  const TabBtn = ({ id, icon, label }) => (
    <button onClick={() => setTab(id)} className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg ${tab === id ? "text-white" : "text-stone-600 hover:bg-stone-100"}`} style={tab === id ? { background: "#e11d48" } : {}}>{icon} {label}</button>
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/lucentia-mark.png" alt="Lucentia" className="h-8 w-8 rounded-lg" />
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-stone-800 text-white px-2 py-1 rounded-lg"><ShieldCheck size={13} /> {master ? "Principale" : "Rivenditore"}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-400 hidden sm:inline">{email}</span>
            <button onClick={onLogout} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"><LogOut size={16} /> Esci</button>
          </div>
        </div>
        {master ? (
          <div className="max-w-3xl mx-auto px-4 pb-2 flex items-center gap-1.5">
            <TabBtn id="licenze" icon={<Store size={15} />} label="Licenze" />
            <TabBtn id="rivenditori" icon={<Building2 size={15} />} label="Rivenditori" />
            <TabBtn id="fatturazione" icon={<Receipt size={15} />} label="Fatturazione" />
            <TabBtn id="richieste" icon={<Inbox size={15} />} label="Richieste" />
          </div>
        ) : null}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {msg ? <div className="bg-stone-800 text-white text-sm rounded-lg px-3 py-2 inline-flex items-center gap-2"><Check size={15} /> {msg}</div> : null}

        {tab === "licenze" ? (
          <>
            <section className="bg-white rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: "#e11d48" }}>
              <h2 className="font-semibold flex items-center gap-2 mb-3"><Plus size={16} style={{ color: "#e11d48" }} /> Nuovo salone-cliente</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Nome salone</div><div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2"><Store size={15} className="text-stone-400" /><input value={den} onChange={(e) => setDen(e.target.value)} placeholder="Es. Salone Bellezza" className="flex-1 text-sm focus:outline-none" /></div></div>
                <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Email di accesso</div><div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2"><Mail size={15} className="text-stone-400" /><input value={em} onChange={(e) => setEm(e.target.value)} placeholder="cliente@email.it" className="flex-1 text-sm focus:outline-none" /></div></div>
                <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Password iniziale</div><div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2"><KeyRound size={15} className="text-stone-400" /><input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="min 6 caratteri" className="flex-1 text-sm focus:outline-none" /></div></div>
                <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Durata licenza</div><select value={mesi} onChange={(e) => setMesi(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white">{DURATE.map((d) => <option key={d[0]} value={d[0]}>{d[1]}</option>)}</select></div>
              </div>
              {master ? (
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Imponibile (IVA escl.) €/mese</div><input value={pImp} inputMode="decimal" onChange={(e) => setPImp(e.target.value)} placeholder="lascia vuoto" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" /></div>
                <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Prezzo finale mensile €</div><input value={pFin} inputMode="decimal" onChange={(e) => setPFin(e.target.value)} placeholder="lascia vuoto" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" /></div>
              </div>
              ) : null}
              <div className="mt-4"><ModuleEditor opt={opt} setOpt={setOpt} tier={tier} setTier={setTier} planOnly={!master} onPrezzo={(price) => applyPlan(price, setPImp, setPFin)} /></div>
              {mesi > 0 && (num(pImp) != null || num(pFin) != null) ? (
                <div className="mt-4 text-sm bg-stone-50 rounded-lg px-3 py-2.5 text-stone-700">Costo cliente per la durata della licenza ({mesi} mesi):{num(pImp) != null ? <> imponibile <b>{eur(totale(pImp, mesi))}</b></> : null}{num(pFin) != null ? <> · IVA incl. <b>{eur(totale(pFin, mesi))}</b></> : null}</div>
              ) : null}
              <button onClick={crea} disabled={creating} className="mt-4 text-white font-medium px-4 py-2.5 rounded-lg inline-flex items-center gap-2 disabled:opacity-50" style={{ background: "#e11d48" }}><Plus size={16} /> {creating ? "Creazione…" : "Crea cliente"}</button>
            </section>

            <section>
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <h2 className="font-semibold">Saloni-cliente {items.length ? <span className="text-sm font-normal text-stone-400">· {items.length}</span> : null}</h2>
                {master ? (
                  <div className="flex items-center gap-1.5"><Filter size={14} className="text-stone-400" /><select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-sm bg-white">{filterOpts.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></div>
                ) : null}
              </div>
              {loading ? <p className="text-sm text-stone-400">Caricamento…</p> : items.length === 0 ? <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400">Nessuna licenza per questo filtro.</div> : (
                <div className="space-y-3">{items.map((a) => <ClientRow key={a.id} a={a} onPatch={patch} onDelete={elimina} showReseller={showResellerBadge} master={master} />)}</div>
              )}
            </section>
          </>
        ) : null}

        {master && tab === "rivenditori" ? <ResellerView items={resellers} apiSend={apiSend} flash={flash} reload={loadResellers} /> : null}
        {master && tab === "fatturazione" ? <FatturazioneView apiGet={apiGet} apiSend={apiSend} flash={flash} resellers={resellers} /> : null}
        {master && tab === "richieste" ? <RichiesteView apiGet={apiGet} apiSend={apiSend} flash={flash} /> : null}
      </main>
    </div>
  );
}

function ClientRow({ a, onPatch, onDelete, showReseller, master }) {
  const planOnly = !master;
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
          {showReseller ? <div className="text-[11px] mt-1"><span className="inline-flex items-center gap-1 bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full"><Building2 size={11} /> {a.reseller_nome ? a.reseller_nome : "Mie"}</span></div> : null}
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
        {master ? <button onClick={() => setPrezzoOpen((o) => !o)} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:bg-stone-50"><Tag size={14} /> Prezzo</button> : null}
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
          <ModuleEditor opt={opt} setOpt={setOpt} tier={tier} setTier={setTier} planOnly={planOnly} onPrezzo={(price) => applyPlan(price, setPImp, setPFin)} />
          <button onClick={() => { const extra = {}; if (planOnly) { const pr = planPrice(opt, tier); if (pr != null) { extra.prezzo_imponibile = toMoney(pr); extra.prezzo_finale = toMoney(pr * (1 + IVA)); } } onPatch(a.id, { moduli: buildModuli(opt, tier), ...extra }, "Piano aggiornato."); setModsOpen(false); }} className="mt-3 text-sm font-medium text-white px-3 py-1.5 rounded-lg" style={{ background: "#e11d48" }}>Salva {planOnly ? "piano" : "moduli"}</button>
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

const BILL = [["ragione_sociale", "Ragione sociale"], ["piva", "Partita IVA"], ["codice_fiscale", "Codice fiscale"], ["indirizzo", "Indirizzo"], ["cap", "CAP"], ["citta", "Città"], ["provincia", "Provincia"], ["sdi", "Codice SDI"], ["pec", "PEC"], ["telefono", "Telefono"]];

function BillingFields({ v, set }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {BILL.map(([k, label]) => (
        <div key={k}><div className="text-[11px] text-stone-400 mb-1">{label}</div><input value={v[k] || ""} onChange={(e) => set(k, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" /></div>
      ))}
    </div>
  );
}

function ResellerView({ items, apiSend, flash, reload }) {
  const empty = { ragione_sociale: "", piva: "", codice_fiscale: "", indirizzo: "", cap: "", citta: "", provincia: "", sdi: "", pec: "", telefono: "" };
  const [v, setV] = useState(empty);
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }));

  const crea = async () => {
    const req = ["ragione_sociale", "piva", "codice_fiscale", "indirizzo", "cap", "citta", "provincia"];
    if (req.some((k) => !String(v[k]).trim()) || !em.trim() || pw.length < 6 || (!v.sdi.trim() && !v.pec.trim())) {
      flash("Compila tutti i dati di fatturazione, email, password (min 6) e SDI o PEC."); return;
    }
    setBusy(true);
    const r = await apiSend("/rivenditori", "POST", { ...v, email: em.trim(), password: pw });
    setBusy(false);
    if (r.ok) { setV(empty); setEm(""); setPw(""); flash("Rivenditore creato."); reload(); }
    else flash(r.data && r.data.error ? r.data.error : "Errore.");
  };
  const patch = async (id, body, ok) => { const r = await apiSend(`/rivenditori/${id}`, "PATCH", body); if (r.ok) { flash(ok || "Aggiornato."); reload(); } else flash(r.data && r.data.error ? r.data.error : "Errore."); };
  const elimina = async (r) => { if (!confirm(`Eliminare il rivenditore "${r.ragione_sociale}"? I suoi saloni-cliente passeranno a te.`)) return; const x = await apiSend(`/rivenditori/${r.id}`, "DELETE"); if (x.ok) { flash("Rivenditore eliminato."); reload(); } else flash("Errore."); };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: "#e11d48" }}>
        <h2 className="font-semibold flex items-center gap-2 mb-1"><Building2 size={16} style={{ color: "#e11d48" }} /> Nuovo rivenditore</h2>
        <p className="text-sm text-stone-500 mb-3">Licenza annuale (12 mesi). Inserisci tutti i dati di fatturazione.</p>
        <div className="grid sm:grid-cols-2 gap-2 mb-2">
          <div><div className="text-[11px] text-stone-400 mb-1">Email di accesso</div><input value={em} onChange={(e) => setEm(e.target.value)} placeholder="rivenditore@email.it" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" /></div>
          <div><div className="text-[11px] text-stone-400 mb-1">Password iniziale (min 6)</div><input value={pw} onChange={(e) => setPw(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" /></div>
        </div>
        <BillingFields v={v} set={set} />
        <button onClick={crea} disabled={busy} className="mt-4 text-white font-medium px-4 py-2.5 rounded-lg inline-flex items-center gap-2 disabled:opacity-50" style={{ background: "#e11d48" }}><Plus size={16} /> {busy ? "Creazione…" : "Crea rivenditore"}</button>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Rivenditori {items.length ? <span className="text-sm font-normal text-stone-400">· {items.length}</span> : null}</h2>
        {items.length === 0 ? <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400">Nessun rivenditore.</div> : (
          <div className="space-y-3">{items.map((r) => <ResellerRow key={r.id} r={r} onPatch={patch} onDelete={elimina} />)}</div>
        )}
      </section>
    </div>
  );
}

function ResellerRow({ r, onPatch, onDelete }) {
  const badge = statoBadge(r);
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [v, setV] = useState(r);
  const [sconto, setSconto] = useState(r.sconto != null ? r.sconto : 50);
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }));
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium truncate">{r.ragione_sociale}</div>
          <div className="text-xs text-stone-400 truncate flex items-center gap-1"><Mail size={12} /> {r.email} · {r.clienti} clienti · sconto {r.sconto != null ? r.sconto : 50}%</div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${badge.cls}`}>{badge.txt}</span>
      </div>
      <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
        <button onClick={() => onPatch(r.id, { rinnova: true }, "Licenza rinnovata (12 mesi).")} className="text-sm font-medium text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style={{ background: "#e11d48" }}><CalendarClock size={14} /> Rinnova 12 mesi</button>
        {r.attiva
          ? <button onClick={() => onPatch(r.id, { attiva: false }, "Rivenditore sospeso.")} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:bg-stone-50"><Ban size={14} /> Sospendi</button>
          : <button onClick={() => onPatch(r.id, { attiva: true }, "Rivenditore riattivato.")} className="text-sm font-medium border border-green-300 text-green-700 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:bg-green-50"><BadgeCheck size={14} /> Riattiva</button>}
        <button onClick={() => setPwOpen((o) => !o)} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:bg-stone-50"><KeyRound size={14} /> Password</button>
        <button onClick={() => setEditOpen((o) => !o)} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:bg-stone-50"><Building2 size={14} /> Dati</button>
        <button onClick={() => onDelete(r)} className="text-sm font-medium border border-red-300 text-red-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:bg-red-50 ml-auto"><Trash2 size={14} /> Elimina</button>
      </div>
      {pwOpen ? (
        <div className="mt-2 flex items-center gap-2">
          <input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Nuova password (min 6)" className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-sm" />
          <button onClick={() => { if (newPw.length >= 6) { onPatch(r.id, { nuovaPassword: newPw }, "Password aggiornata."); setNewPw(""); setPwOpen(false); } }} className="text-sm font-medium text-white px-3 py-1.5 rounded-lg" style={{ background: "#e11d48" }}>Salva</button>
          <button onClick={() => { setPwOpen(false); setNewPw(""); }} className="text-stone-400"><X size={16} /></button>
        </div>
      ) : null}
      {editOpen ? (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <BillingFields v={v} set={set} />
          <div className="mt-2 flex items-center gap-2"><span className="text-[11px] text-stone-400">Sconto sul canone</span><input type="number" min={0} max={100} value={sconto} onChange={(e) => setSconto(e.target.value)} className="w-20 px-2 py-1.5 rounded-lg border border-stone-300 text-sm text-right" /><span className="text-xs text-stone-400">%</span></div>
          <button onClick={() => { const body = {}; BILL.forEach(([k]) => { body[k] = v[k] || ""; }); body.sconto = Number(sconto); onPatch(r.id, body, "Dati aggiornati."); setEditOpen(false); }} className="mt-3 text-sm font-medium text-white px-3 py-1.5 rounded-lg" style={{ background: "#e11d48" }}>Salva dati</button>
        </div>
      ) : null}
    </div>
  );
}

function FatturazioneView({ apiGet, apiSend, flash, resellers }) {
  const [mese, setMese] = useState(thisMonth());
  const [filtro, setFiltro] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiGet(`/fatturazione?mese=${mese}&reseller=${encodeURIComponent(filtro)}`);
    setItems(r.ok && r.data.items ? r.data.items : []);
    setLoading(false);
  }, [apiGet, mese, filtro]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (e) => { const r = await apiSend(`/fatturazione/${e.id}`, "PATCH", { fatturato: !e.fatturato }); if (r.ok) { setItems((p) => p.map((x) => (x.id === e.id ? { ...x, fatturato: !x.fatturato } : x))); } else flash("Errore."); };

  const nuove = items.filter((e) => e.tipo === "nuova");
  const rinnovi = items.filter((e) => e.tipo === "rinnovo");
  const info = (e) => { const r = resellers.find((x) => x.id === e.reseller_id); const sc = r ? (r.sconto == null ? 50 : r.sconto) : 0; const clientImp = totale(e.prezzo_imponibile, e.mesi) || 0; return { isSub: !!r, sc, clientImp, invoice: r ? clientImp * (1 - sc / 100) : 0, nome: r ? (r.ragione_sociale || r.email) : "Mie" }; };
  const invoiceTot = (list) => list.reduce((s, e) => s + info(e).invoice, 0);
  const daFatturare = items.filter((e) => !e.fatturato);
  const filtroOpts = [["all", "Tutti i rivenditori"], ["me", "Mie"], ...resellers.map((r) => [r.id, r.ragione_sociale || r.email])];

  const Riga = ({ e }) => { const i = info(e); return (
    <div className="bg-white rounded-xl border border-stone-200 p-3 shadow-sm flex items-center gap-3">
      <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${e.tipo === "nuova" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>{e.tipo === "nuova" ? "Nuova" : "Rinnovo"}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate text-sm">{e.denominazione} <span className="text-xs font-normal text-stone-400">· {i.nome}</span></div>
        <div className="text-xs text-stone-400">{fmt(String(e.creato_il).slice(0, 10))} · {e.mesi} mesi · cliente {eur(i.clientImp)}{i.isSub ? <> · da fatturare <b className="text-stone-600">{eur(i.invoice)}</b> (−{i.sc}%)</> : null}</div>
      </div>
      <button onClick={() => toggle(e)} className={`text-xs font-medium px-2.5 py-1.5 rounded-lg shrink-0 inline-flex items-center gap-1 ${e.fatturato ? "bg-green-100 text-green-700" : "border border-stone-300 text-stone-600 hover:bg-stone-50"}`}>{e.fatturato ? <><Check size={13} /> Fatturata</> : "Segna fatturata"}</button>
    </div>
  ); };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5"><Receipt size={15} className="text-stone-400" /><input type="month" value={mese} onChange={(e) => setMese(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-sm bg-white" /></div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-sm bg-white">{filtroOpts.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-stone-200 p-4"><div className="text-xs text-stone-400 uppercase tracking-wide">Nuove ({nuove.length})</div><div className="text-lg font-bold">{eur(invoiceTot(nuove))}</div><div className="text-[11px] text-stone-400">da fatturare</div></div>
        <div className="bg-white rounded-xl border border-stone-200 p-4"><div className="text-xs text-stone-400 uppercase tracking-wide">Rinnovi ({rinnovi.length})</div><div className="text-lg font-bold">{eur(invoiceTot(rinnovi))}</div><div className="text-[11px] text-stone-400">da fatturare</div></div>
      </div>
      <div className="bg-stone-800 text-white rounded-xl p-4 flex items-center justify-between">
        <div><div className="text-xs text-stone-300 uppercase tracking-wide">Totale da fatturare</div><div className="text-[11px] text-stone-400">{daFatturare.length} voci · sconto applicato</div></div>
        <div className="text-2xl font-bold">{eur(invoiceTot(daFatturare))}</div>
      </div>

      {loading ? <p className="text-sm text-stone-400">Caricamento…</p> : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400">Nessun movimento in questo mese.</div>
      ) : (
        <div className="space-y-4">
          {nuove.length ? <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Nuove attivazioni</div><div className="space-y-2">{nuove.map((e) => <Riga key={e.id} e={e} />)}</div></div> : null}
          {rinnovi.length ? <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Rinnovi</div><div className="space-y-2">{rinnovi.map((e) => <Riga key={e.id} e={e} />)}</div></div> : null}
        </div>
      )}
    </div>
  );
}

function giorniRimanenti(scad) {
  if (!scad) return null;
  const exp = new Date(scad + "T23:59:59").getTime();
  return Math.ceil((exp - Date.now()) / 86400000);
}
function waLink(tel) { let d = String(tel || "").replace(/\D/g, ""); if (!d) return ""; if (d.startsWith("00")) d = d.slice(2); if (!d.startsWith("39") && d.length <= 11) d = "39" + d; return "https://wa.me/" + d; }
function RichiesteView({ apiGet, apiSend, flash }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const r = await apiGet("/richieste"); setItems(r.ok && r.data.items ? r.data.items : []); setLoading(false); }, [apiGet]);
  useEffect(() => { load(); }, [load]);
  const segna = async (id, stato) => { const r = await apiSend(`/richieste/${id}`, "PATCH", { stato }); if (r.ok) { flash("Aggiornato."); load(); } };
  const elimina = async (id) => { if (!confirm("Eliminare questa voce dall'elenco? (Non elimina l'eventuale account demo collegato.)")) return; const r = await apiSend(`/richieste/${id}`, "DELETE"); if (r.ok) { flash("Eliminata."); load(); } };
  const licenze = items.filter((x) => x.tipo === "licenza");
  const demo = items.filter((x) => x.tipo === "demo");

  if (loading) return <p className="text-sm text-stone-400">Caricamento…</p>;

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
        <h3 className="font-semibold flex items-center gap-2 mb-4"><Inbox size={16} style={{ color: "#e11d48" }} /> Richieste di licenza <span className="text-xs font-normal text-stone-400">· {licenze.length}</span></h3>
        {licenze.length === 0 ? <p className="text-sm text-stone-400">Nessuna richiesta dalla copertina.</p> : (
          <div className="space-y-2">{licenze.map((r) => (
            <div key={r.id} className="border border-stone-200 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium">{r.ragione_sociale}{r.piano ? <span className="text-xs text-stone-400 font-normal"> · piano {r.piano}</span> : null}</div>
                  <div className="text-xs text-stone-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail size={12} /> {r.email}</a>
                    {r.telefono ? <a href={`tel:${r.telefono}`} className="inline-flex items-center gap-1 hover:underline"><Phone size={12} /> {r.telefono}</a> : null}
                    {r.piva ? <span>P.IVA {r.piva}</span> : null}
                  </div>
                  {r.messaggio ? <div className="text-sm text-stone-600 mt-1.5 bg-stone-50 rounded-lg p-2">{r.messaggio}</div> : null}
                  <div className="text-[11px] text-stone-400 mt-1">{fmt((r.creato_il || "").slice(0, 10))}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-[11px] px-2 py-1 rounded-full ${r.stato === "gestita" ? "bg-stone-100 text-stone-500" : "bg-amber-100 text-amber-700"}`}>{r.stato === "gestita" ? "Gestita" : "Nuova"}</span>
                  <div className="flex items-center gap-1">
                    {r.telefono ? <a href={waLink(r.telefono)} target="_blank" rel="noreferrer" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="WhatsApp"><Phone size={15} /></a> : null}
                    {r.stato === "gestita" ? <button onClick={() => segna(r.id, "nuova")} className="text-xs px-2 py-1 rounded-lg border border-stone-300 text-stone-600">Riapri</button> : <button onClick={() => segna(r.id, "gestita")} className="text-xs px-2 py-1 rounded-lg border border-stone-300 text-stone-600">Segna gestita</button>}
                    <button onClick={() => elimina(r.id)} className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}</div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
        <h3 className="font-semibold flex items-center gap-2 mb-4"><Sparkles size={16} style={{ color: "#e11d48" }} /> Demo attivate <span className="text-xs font-normal text-stone-400">· {demo.length}</span></h3>
        {demo.length === 0 ? <p className="text-sm text-stone-400">Nessuna demo attivata dai clienti.</p> : (
          <div className="space-y-2">{demo.map((r) => { const gg = giorniRimanenti(r.scadenza); const scaduta = r.stato_licenza && r.stato_licenza !== "active"; return (
            <div key={r.id} className="border border-stone-200 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium">{r.ragione_sociale}</div>
                  <div className="text-xs text-stone-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail size={12} /> {r.email}</a>
                    {r.telefono ? <a href={`tel:${r.telefono}`} className="inline-flex items-center gap-1 hover:underline"><Phone size={12} /> {r.telefono}</a> : null}
                    {r.piva ? <span>P.IVA {r.piva}</span> : null}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1 flex items-center gap-1"><Clock size={11} /> Attivata {fmt((r.creato_il || "").slice(0, 10))} · scade {fmt(r.scadenza)}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-[11px] px-2 py-1 rounded-full ${scaduta ? "bg-stone-100 text-stone-500" : "bg-green-100 text-green-700"}`}>{scaduta ? "Scaduta" : (gg != null ? `${gg} giorni` : "Attiva")}</span>
                  <div className="flex items-center gap-1">
                    {r.telefono ? <a href={waLink(r.telefono)} target="_blank" rel="noreferrer" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="WhatsApp"><Phone size={15} /></a> : null}
                    <button onClick={() => elimina(r.id)} className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg" title="Rimuovi dall'elenco"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            </div>
          ); })}</div>
        )}
      </section>
    </div>
  );
}
