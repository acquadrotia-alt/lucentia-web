import { useState } from "react";
import { Sparkles, Calendar, Clock, Users, Gift, ShoppingBag, Package, TrendingUp } from "lucide-react";
import { pad, pd, todayStr, addDays, MONTHS, eur } from "./comuni.jsx";

export function StatBar({ rows, fmt }) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  if (rows.length === 0) return <p className="text-sm text-stone-400">Nessun dato nel periodo selezionato.</p>;
  return (
    <div className="space-y-3">{rows.map((r, i) => (
      <div key={i} className="flex items-center gap-3">
        <span className="w-24 sm:w-28 truncate text-[13px] text-stone-600 shrink-0" title={r.label}>{r.label}</span>
        <div className="flex-1 bg-stone-100 rounded-full h-2.5 overflow-hidden">
          <div className="h-2.5 rounded-full brand-bg origin-left" style={{ width: `${Math.max(4, (r.value / max) * 100)}%`, animation: "lc-grow-x .6s var(--lc-ease) both", animationDelay: `${Math.min(i * 45, 360)}ms` }} />
        </div>
        <span className="w-16 text-right text-[13px] font-semibold tabular-nums text-stone-800 shrink-0">{fmt ? fmt(r.value) : r.value}</span>
      </div>
    ))}</div>
  );
}

// Grafico a barre verticali per le serie temporali (andamento mensile).
export function TrendChart({ rows, fmt }) {
  if (!rows || rows.length === 0) return <p className="text-sm text-stone-400">Nessun dato nel periodo selezionato.</p>;
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  return (
    <div>
      <div className="flex items-end gap-2 sm:gap-3 h-36">
        {rows.map((r, i) => { const h = Math.max(2, (r.value / max) * 88); return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
            <div className="text-[11px] font-semibold tabular-nums text-stone-700 mb-1.5 whitespace-nowrap">{fmt ? fmt(r.value) : r.value}</div>
            <div className="w-full rounded-t-md brand-bg origin-bottom hover:brightness-95 transition" style={{ height: `${h}%`, animation: "lc-grow-y .6s var(--lc-ease) both", animationDelay: `${Math.min(i * 60, 420)}ms` }} title={`${r.label}: ${fmt ? fmt(r.value) : r.value}`} />
          </div>
        ); })}
      </div>
      <div className="flex gap-2 sm:gap-3 mt-2">
        {rows.map((r, i) => <div key={i} className="flex-1 text-[11px] text-stone-400 truncate text-center">{r.label}</div>)}
      </div>
    </div>
  );
}

// Scheda KPI elegante (icona + etichetta + valore).
export function Kpi({ icon: Icon, label, value, accent, index = 0 }) {
  return (
    <div className="lc-card lc-fade-up p-4" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-center gap-1.5 text-stone-400"><Icon size={15} /><span className="text-[11px] uppercase tracking-wide font-medium">{label}</span></div>
      <div className={`text-[26px] leading-none font-semibold tracking-tight tabular-nums mt-2 ${accent ? "brand-accent" : "text-stone-900"}`}>{value}</div>
    </div>
  );
}

export function StatsView({ config, bookings, clients, sales, catalog, vouchers }) {
  const [days, setDays] = useState(90);
  const cutoff = days ? addDays(todayStr(), -days) : null;
  const bk = bookings.filter((b) => !cutoff || b.date >= cutoff);
  const counted = bk.filter((b) => b.status !== "cancelled" && b.status !== "noshow");
  const sl = (sales || []).filter((s) => s.type === "sale" && (!cutoff || pd(new Date(s.ts)) >= cutoff));

  const svcCount = {};
  counted.forEach((b) => (b.serviceIds || []).forEach((id) => { svcCount[id] = (svcCount[id] || 0) + 1; }));
  const svcRows = Object.keys(svcCount).map((id) => { const s = config.services.find((x) => x.id === id); return { label: s ? s.name : "—", value: svcCount[id] }; }).sort((a, b) => b.value - a.value).slice(0, 8);

  const hourCount = {};
  counted.forEach((b) => { const h = Math.floor(b.startMin / 60); hourCount[h] = (hourCount[h] || 0) + 1; });
  const hourRows = Object.keys(hourCount).map(Number).sort((a, b) => a - b).map((h) => ({ label: `${pad(h)}:00`, value: hourCount[h] }));

  const cliCount = {};
  counted.forEach((b) => { if (b.clientCode) cliCount[b.clientCode] = (cliCount[b.clientCode] || 0) + 1; });
  const cliRows = Object.keys(cliCount).map((code) => { const c = clients.find((x) => x.code === code); return { label: c ? (c.name || `#${code}`) : `#${code}`, value: cliCount[code] }; }).sort((a, b) => b.value - a.value).slice(0, 8);

  const prodQty = {};
  sl.forEach((s) => (s.items || []).forEach((it) => { prodQty[it.productId] = (prodQty[it.productId] || 0) + it.qty; }));
  const prodRows = Object.keys(prodQty).map((id) => { const p = catalog.products.find((x) => x.id === id); return { label: p ? p.name : "—", value: prodQty[id] }; }).sort((a, b) => b.value - a.value).slice(0, 8);

  const monthRev = {};
  sl.forEach((s) => { const d = new Date(s.ts); const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; monthRev[k] = (monthRev[k] || 0) + s.total; });
  const monthRows = Object.keys(monthRev).sort().slice(-6).map((k) => { const parts = k.split("-"); return { label: `${MONTHS[Number(parts[1]) - 1].slice(0, 3)} ${parts[0].slice(2)}`, value: Math.round(monthRev[k]) }; });

  const totRevenue = sl.reduce((a, s) => a + s.total, 0);

  const realized = bk.filter((b) => b.status === "done" || b.status === "partial");
  const svcPrice = (b) => (b.amount != null ? Number(b.amount) || 0 : (b.serviceIds || []).reduce((a, id) => { const s = config.services.find((x) => x.id === id); return a + ((s && s.price) || 0); }, 0));
  const svcRevTot = realized.reduce((a, b) => a + svcPrice(b), 0);
  const svcMonth = {};
  realized.forEach((b) => { const k = b.date.slice(0, 7); svcMonth[k] = (svcMonth[k] || 0) + svcPrice(b); });
  const svcMonthRows = Object.keys(svcMonth).sort().slice(-6).map((k) => { const parts = k.split("-"); return { label: `${MONTHS[Number(parts[1]) - 1].slice(0, 3)} ${parts[0].slice(2)}`, value: Math.round(svcMonth[k]) }; });

  const card = "lc-card p-5";

  const vch = (vouchers || []).filter((v) => !cutoff || pd(new Date(v.creato)) >= cutoff);
  const vchRevTot = vch.reduce((a, v) => a + (Number(v.prezzo) || 0), 0);
  const vchMonth = {};
  vch.forEach((v) => { const d = new Date(v.creato); const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; vchMonth[k] = (vchMonth[k] || 0) + (Number(v.prezzo) || 0); });
  const vchMonthRows = Object.keys(vchMonth).sort().slice(-6).map((k) => { const parts = k.split("-"); return { label: `${MONTHS[Number(parts[1]) - 1].slice(0, 3)} ${parts[0].slice(2)}`, value: Math.round(vchMonth[k]) }; });
  const vchValore = vch.filter((v) => v.tipo === "valore").length;
  const vchPacchetto = vch.filter((v) => v.tipo === "pacchetto").length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-stone-900 leading-none">Statistiche</h2>
          <p className="text-[13px] text-stone-400 mt-1">Andamento del salone {days ? `· ultimi ${days} giorni` : "· da sempre"}</p>
        </div>
        <div className="flex gap-1 bg-stone-100/80 rounded-xl p-1">
          {[[30, "30 giorni"], [90, "90 giorni"], [0, "Tutto"]].map((o) => <button key={o[0]} onClick={() => setDays(o[0])} aria-current={days === o[0] ? "true" : undefined} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ${days === o[0] ? "bg-white shadow-[var(--lc-shadow-xs)] text-stone-900" : "text-stone-500 hover:text-stone-700"}`}>{o[1]}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Calendar} label="Appuntamenti" value={counted.length} index={0} />
        <Kpi icon={Users} label="Clienti attivi" value={cliRows.length} index={1} />
        <Kpi icon={Sparkles} label="Incasso servizi" value={eur(svcRevTot)} accent index={2} />
        <Kpi icon={ShoppingBag} label="Incasso prodotti" value={eur(totRevenue)} accent index={3} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className={card}><h3 className="font-semibold flex items-center gap-2 mb-5 text-stone-900 tracking-tight"><TrendingUp size={16} className="brand-accent" /> Vendite servizi <span className="text-xs font-normal text-stone-400">· {eur(svcRevTot)}</span></h3><TrendChart rows={svcMonthRows} fmt={(v) => eur(v)} /></section>
        <section className={card}><h3 className="font-semibold flex items-center gap-2 mb-5 text-stone-900 tracking-tight"><TrendingUp size={16} className="brand-accent" /> Vendite prodotti <span className="text-xs font-normal text-stone-400">· {eur(totRevenue)}</span></h3><TrendChart rows={monthRows} fmt={(v) => eur(v)} /></section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className={card}><h3 className="font-semibold flex items-center gap-2 mb-4 text-stone-900 tracking-tight"><Sparkles size={16} className="brand-accent" /> Servizi più richiesti</h3><StatBar rows={svcRows} /></section>
        <section className={card}><h3 className="font-semibold flex items-center gap-2 mb-4 text-stone-900 tracking-tight"><Package size={16} className="brand-accent" /> Prodotti più venduti <span className="text-xs font-normal text-stone-400">· unità</span></h3><StatBar rows={prodRows} /></section>
        <section className={card}><h3 className="font-semibold flex items-center gap-2 mb-4 text-stone-900 tracking-tight"><Clock size={16} className="brand-accent" /> Fasce orarie più richieste</h3><StatBar rows={hourRows} /></section>
        <section className={card}><h3 className="font-semibold flex items-center gap-2 mb-4 text-stone-900 tracking-tight"><Users size={16} className="brand-accent" /> Clienti più attivi</h3><StatBar rows={cliRows} /></section>
      </div>

      <section className={card}>
        <h3 className="font-semibold flex items-center gap-2 mb-4 text-stone-900 tracking-tight"><Gift size={16} className="brand-accent" /> Buoni regalo</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl bg-stone-50 border border-stone-100 p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Totale incassato</div><div className="text-2xl font-semibold tracking-tight tabular-nums mt-1 brand-accent">{eur(vchRevTot)}</div></div>
          <div className="rounded-xl bg-stone-50 border border-stone-100 p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Buoni valore</div><div className="text-2xl font-semibold tracking-tight tabular-nums mt-1 text-stone-900">{vchValore}</div></div>
          <div className="rounded-xl bg-stone-50 border border-stone-100 p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Buoni pacchetto</div><div className="text-2xl font-semibold tracking-tight tabular-nums mt-1 text-stone-900">{vchPacchetto}</div></div>
        </div>
        {vchMonthRows.length ? <TrendChart rows={vchMonthRows} fmt={(v) => eur(v)} /> : <p className="text-sm text-stone-400">Nessun buono venduto nel periodo selezionato.</p>}
      </section>
    </div>
  );
}
