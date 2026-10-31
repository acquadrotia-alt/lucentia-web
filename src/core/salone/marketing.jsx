import { useState } from "react";
import { Settings, X, MessageCircle } from "lucide-react";
import { pd, todayStr, addDays, fmtDate, DEFAULT_MARKETING, marketingConfig, waNumber } from "./comuni.jsx";

export function MarketingView({ config, saveConfig, bookings, clients, sales, catalog }) {
  const M = marketingConfig(config);
  const services = config.services || [];
  const products = (catalog && catalog.products) || [];
  const [svc, setSvc] = useState("");
  const [prod, setProd] = useState("");
  const [inact, setInact] = useState(0);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [mi, setMi] = useState(M.msgInactive);
  const [ms, setMs] = useState(M.msgServices);
  const [mp, setMp] = useState(M.msgProducts);

  const lastVisit = (code) => {
    let last = "";
    bookings.forEach((b) => { if (b.clientCode === code && b.date > last) last = b.date; });
    (sales || []).forEach((s) => { if (s.type === "sale" && s.clientCode === code) { const d = pd(new Date(s.ts)); if (d > last) last = d; } });
    return last;
  };
  const usedService = (code, sid) => bookings.some((b) => b.clientCode === code && (b.serviceIds || []).includes(sid));
  const boughtProduct = (code, pid) => (sales || []).some((s) => s.type === "sale" && s.clientCode === code && (s.items || []).some((it) => it.productId === pid));

  const cutoff = inact ? addDays(todayStr(), -inact) : null;
  const withPhone = clients.filter((c) => (c.phone || "").replace(/\D/g, "").length >= 6);
  const filtered = withPhone.filter((c) => {
    if (svc && !usedService(c.code, svc)) return false;
    if (prod && !boughtProduct(c.code, prod)) return false;
    if (cutoff) { const lv = lastVisit(c.code); if (lv && lv >= cutoff) return false; }
    return true;
  }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const activeMsg = inact ? M.msgInactive : (svc ? M.msgServices : (prod ? M.msgProducts : ""));
  const firstNameOf = (c) => (c.firstName != null && c.firstName.trim()) ? c.firstName.trim() : ((c.name || "").trim().split(/\s+/)[0] || "");
  const lastNameOf = (c) => (c.lastName != null) ? c.lastName.trim() : ((c.name || "").trim().split(/\s+/).slice(1).join(" "));
  const waHref = (c) => { const num = waNumber(c.phone); const txt = activeMsg ? activeMsg.replace(/\{nome_completo\}/g, (c.name || "").trim()).replace(/\{cognome\}/g, lastNameOf(c)).replace(/\{nome\}/g, firstNameOf(c)) : ""; return `https://wa.me/${num}${txt ? `?text=${encodeURIComponent(txt)}` : ""}`; };

  const openCfg = () => { setMi(M.msgInactive); setMs(M.msgServices); setMp(M.msgProducts); setCfgOpen(true); };
  const saveMsgs = () => { saveConfig({ ...config, marketing: { msgInactive: mi, msgServices: ms, msgProducts: mp } }); setCfgOpen(false); };
  const resetMsgs = () => { setMi(DEFAULT_MARKETING.msgInactive); setMs(DEFAULT_MARKETING.msgServices); setMp(DEFAULT_MARKETING.msgProducts); };
  const inactOpts = [[0, "Tutti"], [30, "Inattivi 1+ mese"], [90, "Inattivi 3+ mesi"], [180, "Inattivi 6+ mesi"]];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">Marketing</h2>
        <button onClick={openCfg} className="flex items-center gap-1.5 text-sm border border-stone-300 text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-50"><Settings size={15} /> Messaggi</button>
      </div>

      <div className="lc-card p-4 grid sm:grid-cols-3 gap-3">
        <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Servizio usato</div><select value={svc} onChange={(e) => setSvc(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring"><option value="">Tutti</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Prodotto acquistato</div><select value={prod} onChange={(e) => setProd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring"><option value="">Tutti</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Cliente inattivo</div><select value={inact} onChange={(e) => setInact(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring">{inactOpts.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></div>
      </div>

      {activeMsg ? <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2"><MessageCircle size={14} className="shrink-0 mt-0.5" /><span>Con il filtro attivo, WhatsApp si aprirà con un messaggio già pronto: potrai completarlo o modificarlo prima di inviarlo.</span></p> : null}

      {filtered.length === 0 ? <div className="lc-card p-10 text-center text-stone-400">{withPhone.length === 0 ? "Nessun cliente con numero di telefono." : "Nessun cliente corrisponde ai filtri."}</div> : (
        <div className="space-y-2">{filtered.map((c) => { const lv = lastVisit(c.code); return (
          <div key={c.code} className="bg-white rounded-xl border border-stone-200 p-3 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-full brand-soft brand-accent flex items-center justify-center font-semibold shrink-0">{(c.name || "?").slice(0, 1).toUpperCase()}</div>
            <div className="flex-1 min-w-0"><div className="font-medium truncate">{c.name || "Senza nome"} <span className="text-xs text-stone-400 font-normal">#{c.code}</span></div><div className="text-xs text-stone-400 truncate">{c.phone}{lv ? ` · ultima attività ${fmtDate(lv)}` : " · mai venuto"}</div></div>
            <a href={waHref(c)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-medium bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 shrink-0"><MessageCircle size={15} /> <span className="hidden sm:inline">WhatsApp</span></a>
          </div>
        ); })}</div>
      )}
      {filtered.length > 0 ? <p className="text-xs text-stone-400 text-center">{filtered.length} client{filtered.length === 1 ? "e" : "i"} con numero · tocca WhatsApp per scrivere</p> : null}

      {cfgOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setCfgOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl overflow-auto" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-lg flex items-center gap-2"><Settings size={18} className="brand-accent" /> Messaggi WhatsApp</h3><button onClick={() => setCfgOpen(false)} className="text-stone-400 hover:text-stone-600"><X size={20} /></button></div>
            <p className="text-sm text-stone-500 mb-3">Segnaposto disponibili: <code className="bg-stone-100 px-1 rounded">{"{nome}"}</code> (solo nome, più amichevole), <code className="bg-stone-100 px-1 rounded">{"{cognome}"}</code>, <code className="bg-stone-100 px-1 rounded">{"{nome_completo}"}</code>. Gli asterischi attorno a una parola (*testo*) la rendono in grassetto su WhatsApp.</p>
            <div className="space-y-3">
              <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Cliente inattivo</div><textarea value={mi} onChange={(e) => setMi(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
              <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Filtro servizio usato</div><textarea value={ms} onChange={(e) => setMs(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
              <div><div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Filtro prodotto acquistato</div><textarea value={mp} onChange={(e) => setMp(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
            </div>
            <div className="flex gap-2 mt-4"><button onClick={saveMsgs} className="flex-1 brand-bg font-medium py-2.5 rounded-lg">Salva messaggi</button><button onClick={resetMsgs} className="text-sm text-stone-500 px-3 py-2.5 rounded-lg border border-stone-200">Ripristina default</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
