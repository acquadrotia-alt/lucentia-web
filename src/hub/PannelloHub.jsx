import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, LogOut, Plus, KeyRound, Ban, BadgeCheck, Trash2, CalendarClock, Store, Mail, Boxes, X, Check, Users, Inbox, Phone, Sparkles, Clock, Eraser, AlertTriangle, Globe, Server, Copy, RefreshCw, Pencil, Wifi, WifiOff } from "lucide-react";

// ============================================================================
// Pannello di amministrazione del portale Lucentia.
// - Installazioni: i clienti veri, ognuno col suo sito+gestionale sul proprio
//   dominio. Qui si gestiscono licenza annuale, moduli e chiave.
// - Richieste e demo: richieste di preventivo dal sito e demo attivate.
// - Saloni di prova: saloni ospitati sul portale stesso (prove interne).
// ============================================================================

const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

const DURATE = [[12, "12 mesi"], [24, "24 mesi"], [1, "1 mese"], [3, "3 mesi"], [6, "6 mesi"], [0, "Illimitata"]];
const OPT = [["fidelity", "Fidelity"], ["vendite", "Vendite"], ["statistiche", "Statistiche"], ["marketing", "Marketing"], ["allergeni", "Allergeni e patologie"], ["pacchetti", "Pacchetti sedute"]];
const OPT_KEYS = OPT.map((m) => m[0]);
const OPER = [["1", "1 operatore"], ["3", "Fino a 3 operatori"], ["inf", "Operatori illimitati"]];
const tierFrom = (m) => { const a = Array.isArray(m) ? m : []; return a.includes("opinf") ? "inf" : (a.includes("op3") ? "3" : "1"); };
const optFrom = (m) => (Array.isArray(m) ? m.filter((k) => !["op3", "opinf"].includes(k)) : []);
const buildModuli = (opt, tier) => [...opt, ...(tier === "inf" ? ["opinf"] : tier === "3" ? ["op3"] : [])];

function fmt(d) { if (!d) return "—"; const p = String(d).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; }
function statoBadge(a) {
  if (a.stato === "active" && !a.licenza_scadenza) return { txt: "Illimitata", cls: "bg-green-100 text-green-700" };
  if (a.stato === "active") return { txt: `Attiva fino al ${fmt(a.licenza_scadenza)}`, cls: "bg-green-100 text-green-700" };
  if (a.stato === "expired") return { txt: `Scaduta il ${fmt(a.licenza_scadenza)}`, cls: "bg-red-100 text-red-700" };
  if (a.stato === "disabled") return { txt: "Sospesa", cls: "bg-stone-200 text-stone-600" };
  return { txt: a.stato, cls: "bg-stone-100 text-stone-600" };
}
function giorniRimanenti(scad) {
  if (!scad) return null;
  const exp = new Date(scad + "T23:59:59").getTime();
  return Math.ceil((exp - Date.now()) / 86400000);
}
function waLink(tel) { let d = String(tel || "").replace(/\D/g, ""); if (!d) return ""; if (d.startsWith("00")) d = d.slice(2); if (!d.startsWith("39") && d.length <= 11) d = "39" + d; return "https://wa.me/" + d; }

const Btn = ({ onClick, children, tone = "ghost", className = "", disabled, title }) => {
  const cls = tone === "accent" ? "text-white border-transparent" : tone === "danger" ? "border-red-300 text-red-600 hover:bg-red-50" : tone === "warn" ? "border-amber-300 text-amber-700 hover:bg-amber-50" : tone === "ok" ? "border-green-300 text-green-700 hover:bg-green-50" : "border-stone-300 text-stone-600 hover:bg-stone-50";
  return <button onClick={onClick} disabled={disabled} title={title} className={`text-sm font-medium border px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50 ${cls} ${className}`} style={tone === "accent" ? { background: "var(--lc-accent)" } : undefined}>{children}</button>;
};
const Label = ({ children }) => <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">{children}</div>;
const Input = (props) => <input {...props} className={`w-full px-3 py-2 rounded-lg border border-stone-300 text-sm ${props.className || ""}`} />;

// Interruttori dei moduli: quelli del core, il livello operatori, l'add-on
// prenotazioni online e, per le installazioni, i moduli su misura che il
// codice di quell'installazione ha dichiarato al portale.
function ModuliEditor({ opt, setOpt, tier, setTier, dichiarati = [], liberi = false }) {
  const toggle = (k) => setOpt((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const Chip = ({ k, label, desc, disabled }) => { const on = opt.includes(k); return (
    <button type="button" disabled={disabled} onClick={() => toggle(k)} title={desc || ""} className={`text-sm px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 transition ${disabled ? "opacity-50 cursor-not-allowed border-stone-200 text-stone-400" : on ? "text-white border-transparent" : "bg-white border-stone-300 text-stone-500 hover:border-stone-400"}`} style={on && !disabled ? { background: "var(--lc-accent)" } : {}}>{on ? <Check size={14} /> : null} {label}</button>
  ); };
  const onlineBloccato = !liberi && tier === "1";
  return (
    <div className="space-y-3">
      <div><Label>Moduli</Label><div className="flex flex-wrap gap-2">{OPT.map((m) => <Chip key={m[0]} k={m[0]} label={m[1]} />)}</div></div>
      <div className="flex items-center gap-2"><Users size={15} className="text-stone-400" /><select value={tier} onChange={(e) => { const t = e.target.value; setTier(t); if (t === "1" && !liberi) setOpt((p) => p.filter((x) => x !== "online")); }} className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white">{OPER.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></div>
      <div><Label>Prenotazioni online e mini-sito</Label><Chip k="online" label="Prenotazioni online" disabled={onlineBloccato} />{onlineBloccato ? <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1"><Ban size={12} /> Richiede più di un operatore.</p> : null}</div>
      {dichiarati.length ? (
        <div><Label>Moduli su misura di questa installazione</Label>
          <div className="flex flex-wrap gap-2">{dichiarati.map((m) => <Chip key={m.key} k={m.key} label={m.label || m.key} desc={m.desc} />)}</div>
          <p className="text-[11px] text-stone-400 mt-1.5">Dichiarati dal codice dell'installazione all'ultimo contatto: si accendono e spengono da qui.</p>
        </div>
      ) : (liberi ? <p className="text-[11px] text-stone-400">Nessun modulo su misura dichiarato: compariranno qui dopo il primo contatto dell'installazione.</p> : null)}
      <p className="text-[11px] text-stone-400">Sempre inclusi: Agenda, Clienti, Buoni regalo, Eventi.</p>
    </div>
  );
}

export default function PannelloHub({ email, onLogout, apiGet, apiSend }) {
  const [tab, setTab] = useState("installazioni");
  const [msg, setMsg] = useState("");
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 3000); };
  const TabBtn = ({ id, icon, label }) => (
    <button onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined} className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition ${tab === id ? "lc-navpill-active" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"}`}>{icon} {label}</button>
  );
  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <header className="bg-white/80 backdrop-blur-xl border-b border-stone-200/70 sticky top-0 z-10" style={{ boxShadow: "var(--lc-shadow-xs)" }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/lucentia-mark.png" alt="Lucentia" className="h-8 w-8 rounded-lg" />
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-stone-800 text-white px-2 py-1 rounded-lg"><ShieldCheck size={13} /> Amministrazione</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-400 hidden sm:inline">{email}</span>
            <button onClick={onLogout} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"><LogOut size={16} /> Esci</button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <TabBtn id="installazioni" icon={<Server size={15} />} label="Installazioni" />
          <TabBtn id="richieste" icon={<Inbox size={15} />} label="Richieste e demo" />
          <TabBtn id="prova" icon={<Store size={15} />} label="Saloni di prova" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {msg ? <div className="bg-stone-800 text-white text-sm rounded-lg px-3 py-2 inline-flex items-center gap-2 lc-pop-in fixed bottom-5 left-1/2 -translate-x-1/2 z-40 shadow-lg"><Check size={15} /> {msg}</div> : null}
        <div key={tab} className="space-y-6 lc-fade-up">
          {tab === "installazioni" ? <InstallazioniView apiGet={apiGet} apiSend={apiSend} flash={flash} /> : null}
          {tab === "richieste" ? <RichiesteView apiGet={apiGet} apiSend={apiSend} flash={flash} /> : null}
          {tab === "prova" ? <SaloniProvaView apiGet={apiGet} apiSend={apiSend} flash={flash} /> : null}
        </div>
      </main>
      <footer className="max-w-4xl mx-auto w-full px-4 pb-5 flex">
        <span className="ml-auto text-[11px] text-stone-400 tabular-nums tracking-wide select-all" title="Versione del programma">Versione {APP_VERSION}</span>
      </footer>
    </div>
  );
}

// ---- Installazioni --------------------------------------------------------
function ChiaveBox({ id, chiave, dominio, onClose }) {
  const [copied, setCopied] = useState("");
  const copy = async (k, v) => { try { await navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(""), 1500); } catch (e) {} };
  const righe = [["MODALITA", "cliente"], ["HUB_URL", typeof window !== "undefined" ? window.location.origin : "https://lucentia-app.com"], ["INSTALLAZIONE_ID", id], ["INSTALLAZIONE_CHIAVE", chiave]];
  const tutto = righe.map(([k, v]) => `${k}=${v}`).join("\n");
  return (
    <div className="mt-3 border-2 border-amber-300 rounded-xl p-4 bg-amber-50/60">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-amber-900 flex items-center gap-1.5"><KeyRound size={15} /> Chiave dell'installazione — visibile solo adesso</div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={16} /></button>
      </div>
      <p className="text-xs text-stone-600 mt-1">Copia queste variabili d'ambiente nel progetto Cloudflare Pages del cliente{dominio ? ` (${dominio})` : ""}, sia per Production che per il build. Nel database resta solo l'impronta: se la perdi, rigenerala.</p>
      <div className="mt-3 space-y-1.5 font-mono text-xs">
        {righe.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-3 py-2">
            <span className="text-stone-400 shrink-0">{k}=</span><span className="flex-1 truncate select-all">{v}</span>
            <button onClick={() => copy(k, v)} className="text-stone-400 hover:text-stone-700 shrink-0" title="Copia">{copied === k ? <Check size={14} /> : <Copy size={14} />}</button>
          </div>
        ))}
      </div>
      <button onClick={() => copy("tutto", tutto)} className="mt-3 text-sm font-medium text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style={{ background: "var(--lc-accent)" }}>{copied === "tutto" ? <><Check size={14} /> Copiato</> : <><Copy size={14} /> Copia tutte le variabili</>}</button>
    </div>
  );
}

function InstallazioniView({ apiGet, apiSend, flash }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const r = await apiGet("/installazioni"); setItems(r.ok && r.data.items ? r.data.items : []); setLoading(false); }, [apiGet]);
  useEffect(() => { load(); }, [load]);

  const [nome, setNome] = useState("");
  const [dominio, setDominio] = useState("");
  const [note, setNote] = useState("");
  const [mesi, setMesi] = useState(12);
  const [opt, setOpt] = useState(OPT_KEYS.slice());
  const [tier, setTier] = useState("inf");
  const [creating, setCreating] = useState(false);
  const [nuova, setNuova] = useState(null); // { id, chiave, dominio } dopo la creazione

  const crea = async () => {
    if (!nome.trim()) { flash("Inserisci il nome del cliente."); return; }
    setCreating(true);
    const r = await apiSend("/installazioni", "POST", { nome: nome.trim(), dominio: dominio.trim(), note: note.trim(), mesi, moduli: buildModuli(opt, tier) });
    setCreating(false);
    if (r.ok) { setNuova({ id: r.data.id, chiave: r.data.chiave, dominio: dominio.trim() }); setNome(""); setDominio(""); setNote(""); setMesi(12); setOpt(OPT_KEYS.slice()); setTier("inf"); flash("Installazione creata."); load(); }
    else flash(r.data && r.data.error ? r.data.error : "Errore nella creazione.");
  };
  const patch = async (id, body, ok) => { const r = await apiSend(`/installazioni/${id}`, "PATCH", body); if (r.ok) { flash(ok || "Aggiornato."); load(); } else flash(r.data && r.data.error ? r.data.error : "Errore."); return r; };
  const elimina = async (a) => { if (!confirm(`Eliminare l'installazione "${a.nome}" dal portale? Il sito del cliente smetterà di essere riconosciuto e andrà in manutenzione. I suoi dati restano nel suo database.`)) return; const r = await apiSend(`/installazioni/${a.id}`, "DELETE"); if (r.ok) { flash("Installazione eliminata."); load(); } else flash("Errore."); };

  return (
    <>
      <section className="lc-card p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-1"><Plus size={16} style={{ color: "var(--lc-accent)" }} /> Nuova installazione cliente</h2>
        <p className="text-sm text-stone-500 mb-4">Crea la licenza e la chiave; poi segui LEGGIMI.md per preparare repository, progetto Cloudflare, database e dominio.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Nome del cliente</Label><div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2"><Store size={15} className="text-stone-400" /><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Salone Bellezza" className="flex-1 text-sm focus:outline-none" /></div></div>
          <div><Label>Dominio</Label><div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2"><Globe size={15} className="text-stone-400" /><input value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="salonebellezza.it" className="flex-1 text-sm focus:outline-none" /></div></div>
          <div><Label>Durata licenza</Label><select value={mesi} onChange={(e) => setMesi(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white">{DURATE.map((d) => <option key={d[0]} value={d[0]}>{d[1]}</option>)}</select></div>
          <div><Label>Note interne</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Referente, accordi, repository…" /></div>
        </div>
        <div className="mt-4"><ModuliEditor opt={opt} setOpt={setOpt} tier={tier} setTier={setTier} liberi /></div>
        <button onClick={crea} disabled={creating} className="mt-4 text-white font-medium px-4 py-2.5 rounded-lg inline-flex items-center gap-2 disabled:opacity-50" style={{ background: "var(--lc-accent)" }}><Plus size={16} /> {creating ? "Creazione…" : "Crea installazione"}</button>
        {nuova ? <ChiaveBox id={nuova.id} chiave={nuova.chiave} dominio={nuova.dominio} onClose={() => setNuova(null)} /> : null}
      </section>

      <section>
        <h2 className="font-semibold mb-3">Installazioni {items.length ? <span className="text-sm font-normal text-stone-400">· {items.length}</span> : null}</h2>
        {loading ? <p className="text-sm text-stone-400">Caricamento…</p> : items.length === 0 ? <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400">Nessuna installazione ancora. Crea la prima qui sopra.</div> : (
          <div className="space-y-3">{items.map((a) => <InstallazioneRow key={a.id} a={a} onPatch={patch} onDelete={elimina} />)}</div>
        )}
      </section>
    </>
  );
}

function InstallazioneRow({ a, onPatch, onDelete }) {
  const badge = statoBadge(a);
  const [rinnovo, setRinnovo] = useState(12);
  const [modsOpen, setModsOpen] = useState(false);
  const [opt, setOpt] = useState(optFrom(a.moduli));
  const [tier, setTier] = useState(tierFrom(a.moduli));
  const [editOpen, setEditOpen] = useState(false);
  const [nome, setNome] = useState(a.nome);
  const [dominio, setDominio] = useState(a.dominio || "");
  const [note, setNote] = useState(a.note || "");
  const [chiave, setChiave] = useState(null);
  useEffect(() => { setOpt(optFrom(a.moduli)); setTier(tierFrom(a.moduli)); }, [a.moduli]);
  const gg = giorniRimanenti(a.licenza_scadenza);
  const contatto = a.ultimo_contatto ? a.ultimo_contatto : null;
  const recente = contatto && (Date.now() - new Date(contatto.replace(" ", "T")).getTime()) < 36 * 3600 * 1000;
  const rigenera = async () => {
    if (!confirm("Rigenerare la chiave? Quella attuale smette di valere: l'installazione andrà in manutenzione finché non aggiorni la variabile INSTALLAZIONE_CHIAVE su Cloudflare.")) return;
    const r = await onPatch(a.id, { rigeneraChiave: true }, "Chiave rigenerata.");
    if (r && r.ok && r.data.chiave) setChiave(r.data.chiave);
  };
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium truncate flex items-center gap-2">{a.nome}{a.dominio ? <a href={`https://${a.dominio}`} target="_blank" rel="noreferrer" className="text-xs font-normal text-stone-400 hover:text-stone-700 inline-flex items-center gap-1 truncate"><Globe size={12} /> {a.dominio}</a> : null}</div>
          <div className="text-xs text-stone-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className={`inline-flex items-center gap-1 ${recente ? "text-green-600" : ""}`}>{recente ? <Wifi size={12} /> : <WifiOff size={12} />} {contatto ? `ultimo contatto ${fmt(contatto.slice(0, 10))} ${contatto.slice(11, 16)}` : "mai collegata"}</span>
            {a.versione ? <span>v {a.versione}</span> : null}
            {a.dominio_rilevato && a.dominio_rilevato !== a.dominio ? <span className="text-amber-600 inline-flex items-center gap-1"><AlertTriangle size={11} /> risponde da {a.dominio_rilevato}</span> : null}
            {a.stato === "active" && gg != null && gg <= 30 ? <span className="text-amber-600">scade tra {gg} giorni</span> : null}
          </div>
          {a.note ? <div className="text-xs text-stone-500 mt-1 italic truncate">{a.note}</div> : null}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${badge.cls}`}>{badge.txt}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
        <select value={rinnovo} onChange={(e) => setRinnovo(Number(e.target.value))} className="px-2 py-1.5 rounded-lg border border-stone-300 text-sm bg-white">{DURATE.map((d) => <option key={d[0]} value={d[0]}>{d[1]}</option>)}</select>
        <Btn tone="accent" onClick={() => onPatch(a.id, { rinnovaMesi: rinnovo }, "Licenza rinnovata.")}><CalendarClock size={14} /> Rinnova</Btn>
        {a.attiva ? <Btn onClick={() => onPatch(a.id, { attiva: false }, "Installazione sospesa: il sito va in manutenzione.")}><Ban size={14} /> Sospendi</Btn> : <Btn tone="ok" onClick={() => onPatch(a.id, { attiva: true }, "Installazione riattivata.")}><BadgeCheck size={14} /> Riattiva</Btn>}
        <Btn onClick={() => setModsOpen((o) => !o)}><Boxes size={14} /> Moduli</Btn>
        <Btn onClick={() => setEditOpen((o) => !o)}><Pencil size={14} /> Dati</Btn>
        <Btn onClick={rigenera}><RefreshCw size={14} /> Rigenera chiave</Btn>
        <Btn tone="danger" className="ml-auto" onClick={() => onDelete(a)}><Trash2 size={14} /> Elimina</Btn>
      </div>

      {chiave ? <ChiaveBox id={a.id} chiave={chiave} dominio={a.dominio} onClose={() => setChiave(null)} /> : null}

      {modsOpen ? (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <ModuliEditor opt={opt} setOpt={setOpt} tier={tier} setTier={setTier} dichiarati={a.moduli_disponibili || []} liberi />
          <button onClick={() => { onPatch(a.id, { moduli: buildModuli(opt, tier) }, "Moduli aggiornati: l'installazione li riceve al prossimo contatto."); setModsOpen(false); }} className="mt-3 text-sm font-medium text-white px-3 py-1.5 rounded-lg" style={{ background: "var(--lc-accent)" }}>Salva moduli</button>
        </div>
      ) : null}

      {editOpen ? (
        <div className="mt-3 pt-3 border-t border-stone-100 grid sm:grid-cols-3 gap-3">
          <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div><Label>Dominio</Label><Input value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="salonebellezza.it" /></div>
          <div><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="sm:col-span-3"><button onClick={() => { onPatch(a.id, { nome, dominio, note }, "Dati aggiornati."); setEditOpen(false); }} className="text-sm font-medium text-white px-3 py-1.5 rounded-lg" style={{ background: "var(--lc-accent)" }}>Salva dati</button></div>
        </div>
      ) : null}
    </div>
  );
}

// ---- Saloni di prova (ospitati sul portale) --------------------------------
function SaloniProvaView({ apiGet, apiSend, flash }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const r = await apiGet("/aziende"); setItems(r.ok && r.data.items ? r.data.items.filter((a) => !a.demo) : []); setLoading(false); }, [apiGet]);
  useEffect(() => { load(); }, [load]);
  const [den, setDen] = useState(""); const [em, setEm] = useState(""); const [pw, setPw] = useState(""); const [mesi, setMesi] = useState(12);
  const [opt, setOpt] = useState(OPT_KEYS.slice()); const [tier, setTier] = useState("inf"); const [creating, setCreating] = useState(false);
  const crea = async () => {
    if (!den.trim() || !em.trim() || pw.length < 6) { flash("Compila nome, email e password (min 6)."); return; }
    setCreating(true);
    const r = await apiSend("/aziende", "POST", { denominazione: den.trim(), email: em.trim(), password: pw, mesi, moduli: buildModuli(opt, tier) });
    setCreating(false);
    if (r.ok) { setDen(""); setEm(""); setPw(""); flash("Salone creato."); load(); } else flash(r.data && r.data.error ? r.data.error : "Errore nella creazione.");
  };
  const patch = async (id, body, ok) => { const r = await apiSend(`/aziende/${id}`, "PATCH", body); if (r.ok) { flash(ok || "Aggiornato."); load(); } else flash(r.data && r.data.error ? r.data.error : "Errore."); };
  const elimina = async (a) => { if (!confirm(`Eliminare definitivamente "${a.denominazione}" e tutti i suoi dati? L'operazione non è reversibile.`)) return; const r = await apiSend(`/aziende/${a.id}`, "DELETE"); if (r.ok) { flash("Salone eliminato."); load(); } else flash("Errore nell'eliminazione."); };
  const svuota = async (a) => { const r = await apiSend(`/aziende/${a.id}/svuota`, "POST"); if (r.ok) flash(`Dati di "${a.denominazione}" azzerati.`); else flash(r.data && r.data.error ? r.data.error : "Errore nell'azzeramento."); return r.ok; };
  return (
    <>
      <section className="lc-card p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-1"><Plus size={16} style={{ color: "var(--lc-accent)" }} /> Nuovo salone di prova</h2>
        <p className="text-sm text-stone-500 mb-4">Un salone ospitato qui sul portale, utile per prove e presentazioni. I clienti veri hanno la loro installazione.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Nome salone</Label><div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2"><Store size={15} className="text-stone-400" /><input value={den} onChange={(e) => setDen(e.target.value)} placeholder="Es. Salone Bellezza" className="flex-1 text-sm focus:outline-none" /></div></div>
          <div><Label>Email di accesso</Label><div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2"><Mail size={15} className="text-stone-400" /><input value={em} onChange={(e) => setEm(e.target.value)} placeholder="cliente@email.it" className="flex-1 text-sm focus:outline-none" /></div></div>
          <div><Label>Password iniziale</Label><div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2"><KeyRound size={15} className="text-stone-400" /><input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="min 6 caratteri" className="flex-1 text-sm focus:outline-none" /></div></div>
          <div><Label>Durata licenza</Label><select value={mesi} onChange={(e) => setMesi(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white">{DURATE.map((d) => <option key={d[0]} value={d[0]}>{d[1]}</option>)}</select></div>
        </div>
        <div className="mt-4"><ModuliEditor opt={opt} setOpt={setOpt} tier={tier} setTier={setTier} /></div>
        <button onClick={crea} disabled={creating} className="mt-4 text-white font-medium px-4 py-2.5 rounded-lg inline-flex items-center gap-2 disabled:opacity-50" style={{ background: "var(--lc-accent)" }}><Plus size={16} /> {creating ? "Creazione…" : "Crea salone"}</button>
      </section>
      <section>
        <h2 className="font-semibold mb-3">Saloni di prova {items.length ? <span className="text-sm font-normal text-stone-400">· {items.length}</span> : null}</h2>
        {loading ? <p className="text-sm text-stone-400">Caricamento…</p> : items.length === 0 ? <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400">Nessun salone di prova.</div> : (
          <div className="space-y-3">{items.map((a) => <SaloneRow key={a.id} a={a} onPatch={patch} onDelete={elimina} onSvuota={svuota} />)}</div>
        )}
      </section>
    </>
  );
}

function SaloneRow({ a, onPatch, onDelete, onSvuota }) {
  const badge = statoBadge(a);
  const [rinnovo, setRinnovo] = useState(12);
  const [pwOpen, setPwOpen] = useState(false); const [newPw, setNewPw] = useState("");
  const [modsOpen, setModsOpen] = useState(false);
  const [opt, setOpt] = useState(optFrom(a.moduli)); const [tier, setTier] = useState(tierFrom(a.moduli));
  const [svuotaOpen, setSvuotaOpen] = useState(false); const [svuotaChk, setSvuotaChk] = useState(false); const [svuotaBusy, setSvuotaBusy] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium truncate">{a.denominazione}</div>
          <div className="text-xs text-stone-400 truncate flex items-center gap-1"><Mail size={12} /> {a.email || "—"}</div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${badge.cls}`}>{badge.txt}</span>
      </div>
      <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
        <select value={rinnovo} onChange={(e) => setRinnovo(Number(e.target.value))} className="px-2 py-1.5 rounded-lg border border-stone-300 text-sm bg-white">{DURATE.map((d) => <option key={d[0]} value={d[0]}>{d[1]}</option>)}</select>
        <Btn tone="accent" onClick={() => onPatch(a.id, { rinnovaMesi: rinnovo }, "Licenza rinnovata.")}><CalendarClock size={14} /> Rinnova</Btn>
        {a.attiva ? <Btn onClick={() => onPatch(a.id, { attiva: false }, "Salone sospeso.")}><Ban size={14} /> Sospendi</Btn> : <Btn tone="ok" onClick={() => onPatch(a.id, { attiva: true }, "Salone riattivato.")}><BadgeCheck size={14} /> Riattiva</Btn>}
        <Btn onClick={() => setPwOpen((o) => !o)}><KeyRound size={14} /> Password</Btn>
        <Btn onClick={() => setModsOpen((o) => !o)}><Boxes size={14} /> Moduli</Btn>
        <Btn tone="warn" onClick={() => { setSvuotaOpen((o) => !o); setSvuotaChk(false); }}><Eraser size={14} /> Svuota dati</Btn>
        <Btn tone="danger" className="ml-auto" onClick={() => onDelete(a)}><Trash2 size={14} /> Elimina</Btn>
      </div>
      {pwOpen ? (
        <div className="mt-2 flex items-center gap-2">
          <input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Nuova password (min 6)" className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-sm" />
          <button onClick={() => { if (newPw.length >= 6) { onPatch(a.id, { nuovaPassword: newPw }, "Password aggiornata."); setNewPw(""); setPwOpen(false); } }} className="text-sm font-medium text-white px-3 py-1.5 rounded-lg" style={{ background: "var(--lc-accent)" }}>Salva</button>
          <button onClick={() => { setPwOpen(false); setNewPw(""); }} className="text-stone-400"><X size={16} /></button>
        </div>
      ) : null}
      {svuotaOpen ? (
        <div className="mt-3 border border-amber-300 rounded-xl p-3 bg-amber-50/50">
          <div className="text-sm font-medium text-amber-800 flex items-center gap-1.5"><AlertTriangle size={14} /> Svuota i dati di "{a.denominazione}"</div>
          <p className="text-xs text-stone-600 mt-1.5">Elimina servizi, operatori e accessi operatore, clienti, appuntamenti, prenotazioni online, catalogo prodotti, vendite, buoni ed eventi — dati di esempio compresi. Il salone riparte da zero.</p>
          <p className="text-xs text-stone-500 mt-1">Restano invariati la licenza con la sua scadenza, i moduli attivi e l'account di accesso del salone. Se il salone è collegato in questo momento verrà disconnesso.</p>
          <label className="flex items-start gap-2 text-xs text-stone-600 cursor-pointer mt-2.5"><input type="checkbox" checked={svuotaChk} onChange={(e) => setSvuotaChk(e.target.checked)} className="w-4 h-4 mt-0.5" /> Confermo: l'operazione non è reversibile e i dati eliminati non potranno essere recuperati.</label>
          <div className="flex items-center gap-2 mt-2.5">
            <button onClick={async () => { setSvuotaBusy(true); const ok = await onSvuota(a); setSvuotaBusy(false); if (ok) { setSvuotaOpen(false); setSvuotaChk(false); } }} disabled={!svuotaChk || svuotaBusy} className="text-sm font-medium text-white px-3 py-1.5 rounded-lg bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"><Eraser size={14} /> {svuotaBusy ? "Azzeramento…" : "Svuota ora"}</button>
            <button onClick={() => { setSvuotaOpen(false); setSvuotaChk(false); }} className="text-sm text-stone-500 px-3 py-1.5">Annulla</button>
          </div>
        </div>
      ) : null}
      {modsOpen ? (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <ModuliEditor opt={opt} setOpt={setOpt} tier={tier} setTier={setTier} />
          <button onClick={() => { onPatch(a.id, { moduli: buildModuli(opt, tier) }, "Moduli aggiornati."); setModsOpen(false); }} className="mt-3 text-sm font-medium text-white px-3 py-1.5 rounded-lg" style={{ background: "var(--lc-accent)" }}>Salva moduli</button>
        </div>
      ) : null}
    </div>
  );
}

// ---- Richieste dal sito e demo attivate -------------------------------------
function RichiesteView({ apiGet, apiSend, flash }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const r = await apiGet("/richieste"); setItems(r.ok && r.data.items ? r.data.items : []); setLoading(false); }, [apiGet]);
  useEffect(() => { load(); }, [load]);
  const segna = async (id, stato) => { const r = await apiSend(`/richieste/${id}`, "PATCH", { stato }); if (r.ok) { flash("Aggiornato."); load(); } };
  const elimina = async (id) => { if (!confirm("Eliminare questa voce dall'elenco? (Non elimina l'eventuale account demo collegato.)")) return; const r = await apiSend(`/richieste/${id}`, "DELETE"); if (r.ok) { flash("Eliminata."); load(); } };
  const eliminaDemo = async (r) => { if (!r.azienda_id) return; if (!confirm(`Eliminare l'account demo di "${r.ragione_sociale}" e tutti i suoi dati?`)) return; const x = await apiSend(`/aziende/${r.azienda_id}`, "DELETE"); if (x.ok) { await apiSend(`/richieste/${r.id}`, "DELETE"); flash("Demo eliminata."); load(); } else flash("Errore."); };
  const licenze = items.filter((x) => x.tipo === "licenza");
  const demo = items.filter((x) => x.tipo === "demo");
  if (loading) return <p className="text-sm text-stone-400">Caricamento…</p>;
  return (
    <div className="space-y-6">
      <section className="lc-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4"><Inbox size={16} style={{ color: "var(--lc-accent)" }} /> Richieste di preventivo e informazioni <span className="text-xs font-normal text-stone-400">· {licenze.length}</span></h3>
        {licenze.length === 0 ? <p className="text-sm text-stone-400">Nessuna richiesta dal sito.</p> : (
          <div className="space-y-2">{licenze.map((r) => (
            <div key={r.id} className="border border-stone-200 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium">{r.ragione_sociale}{r.piano ? <span className="text-xs text-stone-400 font-normal"> · {r.piano}</span> : null}</div>
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

      <section className="lc-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4"><Sparkles size={16} style={{ color: "var(--lc-accent)" }} /> Demo attivate <span className="text-xs font-normal text-stone-400">· {demo.length}</span></h3>
        {demo.length === 0 ? <p className="text-sm text-stone-400">Nessuna demo attivata dal sito.</p> : (
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
                    {r.azienda_id ? <button onClick={() => eliminaDemo(r)} className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50" title="Elimina l'account demo e i suoi dati">Elimina demo</button> : null}
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
