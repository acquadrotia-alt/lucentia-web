import { useState, useMemo } from "react";
import { Sparkles, Calendar, Clock, Users, Gift, ShoppingBag, Package, TrendingUp, ChevronLeft, ChevronRight, LayoutDashboard, UserX, Percent, Download } from "lucide-react";
import { pad, pd, todayStr, addDays, MONTHS, WDAY_SHORT, eur } from "./comuni.jsx";
import { cruscottoSettimana, lunediDi, spostaGiorni, costoDelVenduto } from "../statistiche/cruscotto.js";

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

      <CruscottoSettimanale config={config} bookings={bookings} sales={sales} clients={clients} />

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

      <CostoVenduto sales={sales} catalog={catalog} cutoff={cutoff} days={days} />

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

// ---- Cruscotto della settimana ----------------------------------------------
const oreMin = (m) => `${Math.floor(m / 60)}:${pad(m % 60)}`;
const Delta = ({ v, soldi, invertito }) => { if (v == null || v === 0) return <span className="text-[11px] text-stone-400">= settimana prima</span>; const bene = invertito ? v < 0 : v > 0; return <span className={`text-[11px] font-medium ${bene ? "text-green-600" : "text-red-500"}`}>{v > 0 ? "+" : ""}{soldi ? eur(v) : v} vs settimana prima</span>; };
export function CruscottoSettimanale({ config, bookings, sales, clients }) {
  const [lunedi, setLunedi] = useState(() => lunediDi(todayStr()));
  const c = useMemo(() => cruscottoSettimana(config, bookings, sales, clients, lunedi), [config, bookings, sales, clients, lunedi]);
  const T = c.tot;
  const maxInc = Math.max(1, ...c.perGiorno.map((g) => g.incassoServizi + g.incassoProdotti));
  const questa = lunedi === lunediDi(todayStr());
  const etichetta = (d) => { const [y, m, g] = d.split("-").map(Number); return `${g} ${MONTHS[m - 1]}`; };
  const csv = () => {
    const righe = [["Operatore", "Appuntamenti", "Svolti", "No-show", "Ore occupate", "Ore disponibili", "Occupazione %", "Incasso servizi"].join(";"), ...c.perOperatore.map((o) => [o.nome, o.appuntamenti, o.svolti, o.noshow, oreMin(o.minutiOccupati), oreMin(o.minutiDisponibili), o.occupazione == null ? "" : o.occupazione, o.incassoServizi.toFixed(2).replace(".", ",")].join(";")), "", ["Giorno", "Appuntamenti", "Svolti", "No-show", "Annullati", "Incasso servizi", "Incasso prodotti"].join(";"), ...c.perGiorno.map((g) => [g.data, g.appuntamenti, g.svolti, g.noshow, g.annullati, g.incassoServizi.toFixed(2).replace(".", ","), g.incassoProdotti.toFixed(2).replace(".", ",")].join(";"))];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + righe.join("\n")], { type: "text/csv;charset=utf-8" })); a.download = `cruscotto-${c.lunedi}.csv`; a.click();
  };
  const box = "rounded-xl bg-stone-50 border border-stone-100 p-3";
  return (
    <section className="lc-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div><h3 className="font-semibold flex items-center gap-2 text-stone-900 tracking-tight"><LayoutDashboard size={16} className="brand-accent" /> Cruscotto della settimana</h3><p className="text-[13px] text-stone-400 mt-0.5">Da lunedì {etichetta(c.da)} a domenica {etichetta(c.a)}{questa ? " · questa settimana" : ""}</p></div>
        <div className="flex items-center gap-1">
          <button onClick={() => setLunedi(spostaGiorni(lunedi, -7))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-50" aria-label="Settimana precedente"><ChevronLeft size={16} /></button>
          {!questa ? <button onClick={() => setLunedi(lunediDi(todayStr()))} className="text-xs font-medium px-2.5 h-8 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50">Oggi</button> : null}
          <button onClick={() => setLunedi(spostaGiorni(lunedi, 7))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-50" aria-label="Settimana successiva"><ChevronRight size={16} /></button>
          <button onClick={csv} className="ml-1 text-xs font-medium px-2.5 h-8 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 inline-flex items-center gap-1"><Download size={13} /> CSV</button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className={box}><div className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Incasso</div><div className="text-2xl font-semibold tracking-tight tabular-nums mt-1 brand-accent">{eur(T.incasso)}</div><div className="text-[11px] text-stone-500">servizi {eur(T.incassoServizi)} · prodotti {eur(T.incassoProdotti)}</div><Delta v={c.delta.incasso} soldi /></div>
        <div className={box}><div className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Appuntamenti</div><div className="text-2xl font-semibold tracking-tight tabular-nums mt-1 text-stone-900">{T.appuntamenti}</div><div className="text-[11px] text-stone-500">{T.svolti} svolti · {T.online} online · {T.annullati} annullati</div><Delta v={c.delta.appuntamenti} /></div>
        <div className={box}><div className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Occupazione</div><div className="text-2xl font-semibold tracking-tight tabular-nums mt-1 text-stone-900">{T.occupazione == null ? "—" : `${T.occupazione}%`}</div><div className="text-[11px] text-stone-500">{oreMin(T.minutiOccupati)} h su {oreMin(T.minutiDisponibili)} h disponibili</div><Delta v={c.delta.occupazione} /></div>
        <div className={box}><div className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Clienti</div><div className="text-2xl font-semibold tracking-tight tabular-nums mt-1 text-stone-900">{T.clienti}</div><div className="text-[11px] text-stone-500">{T.nuovi} nuov{T.nuovi === 1 ? "o" : "i"} · {T.abituali} abitual{T.abituali === 1 ? "e" : "i"} · {T.noshow} no-show ({T.tassoNoshow}%)</div><Delta v={c.delta.nuovi} /></div>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">Giorno per giorno</div>
          <div className="flex items-end gap-1.5 h-28">{c.perGiorno.map((g) => { const v = g.incassoServizi + g.incassoProdotti; const h = Math.max(3, (v / maxInc) * 100); const oggi = g.data === todayStr(); return (
            <div key={g.data} className="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={`${g.data}: ${eur(v)} · ${g.appuntamenti} appuntamenti${g.noshow ? ` · ${g.noshow} no-show` : ""}`}>
              <div className="text-[10px] tabular-nums text-stone-500 mb-1 whitespace-nowrap">{v ? eur(v).replace(",00", "") : ""}</div>
              <div className={`w-full rounded-t-md ${g.chiuso ? "bg-stone-200" : oggi ? "brand-bg" : "brand-bg opacity-70"}`} style={{ height: `${h}%` }} />
            </div>
          ); })}</div>
          <div className="flex gap-1.5 mt-1.5">{c.perGiorno.map((g) => <div key={g.data} className="flex-1 text-center"><div className="text-[11px] text-stone-500">{WDAY_SHORT[new Date(g.data + "T12:00:00").getDay()]}</div><div className={`text-[11px] font-semibold tabular-nums ${g.noshow ? "text-amber-600" : "text-stone-700"}`}>{g.appuntamenti || "–"}</div></div>)}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">Per operatore</div>
          {c.perOperatore.length === 0 ? <p className="text-sm text-stone-400">Nessun operatore.</p> : <div className="space-y-2.5">{c.perOperatore.map((o) => (
            <div key={o.id}>
              <div className="flex items-center justify-between gap-2 text-sm"><span className="font-medium text-stone-800 truncate">{o.nome}</span><span className="text-xs text-stone-500 tabular-nums shrink-0">{o.appuntamenti} app. · {eur(o.incassoServizi)}{o.noshow ? <span className="text-amber-600"> · {o.noshow} no-show</span> : null}</span></div>
              <div className="flex items-center gap-2 mt-1"><div className="flex-1 bg-stone-100 rounded-full h-2 overflow-hidden"><div className="h-2 rounded-full brand-bg" style={{ width: `${o.occupazione || 0}%` }} /></div><span className="text-xs tabular-nums text-stone-600 w-24 text-right">{o.occupazione == null ? "non in turno" : `${o.occupazione}% · ${oreMin(o.minutiOccupati)} h`}</span></div>
            </div>
          ))}</div>}
        </div>
      </div>
    </section>
  );
}

// ---- Costo del venduto e margine sui prodotti --------------------------------
export function CostoVenduto({ sales, catalog, cutoff, days }) {
  const r = useMemo(() => costoDelVenduto(sales, catalog, cutoff || null, null), [sales, catalog, cutoff]);
  const box = "rounded-xl bg-stone-50 border border-stone-100 p-3";
  return (
    <section className="lc-card p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-1 text-stone-900 tracking-tight"><Percent size={16} className="brand-accent" /> Costo del venduto e margine <span className="text-xs font-normal text-stone-400">· prodotti{days ? `, ultimi ${days} giorni` : ""}</span></h3>
      <p className="text-[13px] text-stone-400 mb-4">Il costo è quello scritto sulle righe di vendita (fissato alla cassa) o, per le vendite più vecchie, il costo attuale del formato nel catalogo.{r.senzaCosto ? ` ${r.senzaCosto} pezz${r.senzaCosto === 1 ? "o" : "i"} senza costo: inserisci il costo nei formati del catalogo.` : ""}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className={box}><div className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Ricavo</div><div className="text-xl font-semibold tabular-nums mt-1">{eur(r.ricavo)}</div></div>
        <div className={box}><div className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Costo della merce</div><div className="text-xl font-semibold tabular-nums mt-1">{eur(r.costo)}</div></div>
        <div className={box}><div className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Margine</div><div className="text-xl font-semibold tabular-nums mt-1 brand-accent">{eur(r.margine)}</div></div>
        <div className={box}><div className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Margine %</div><div className="text-xl font-semibold tabular-nums mt-1">{r.marginePct == null ? "—" : `${r.marginePct}%`}</div></div>
      </div>
      {r.righe.length === 0 ? <p className="text-sm text-stone-400">Nessun prodotto venduto nel periodo.</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[28rem]">
          <thead><tr className="text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-100"><th className="text-left font-medium py-1.5 pr-3">Prodotto</th><th className="text-right font-medium py-1.5 px-2">Pezzi</th><th className="text-right font-medium py-1.5 px-2">Ricavo</th><th className="text-right font-medium py-1.5 px-2">Costo</th><th className="text-right font-medium py-1.5 px-2">Margine</th><th className="text-right font-medium py-1.5 pl-2">%</th></tr></thead>
          <tbody>{r.righe.slice(0, 15).map((x) => <tr key={x.productId} className="border-b border-stone-50 last:border-0"><td className="py-1.5 pr-3 font-medium text-stone-800">{x.nome}{x.senzaCosto ? <span className="text-[10px] text-amber-600 ml-1">({x.senzaCosto} senza costo)</span> : null}</td><td className="py-1.5 px-2 text-right tabular-nums">{x.qta}</td><td className="py-1.5 px-2 text-right tabular-nums">{eur(x.ricavo)}</td><td className="py-1.5 px-2 text-right tabular-nums text-stone-500">{eur(x.costo)}</td><td className="py-1.5 px-2 text-right tabular-nums font-medium">{eur(x.margine)}</td><td className={`py-1.5 pl-2 text-right tabular-nums ${x.marginePct != null && x.marginePct < 30 ? "text-amber-600" : "text-stone-600"}`}>{x.marginePct == null ? "—" : `${x.marginePct}%`}</td></tr>)}</tbody>
        </table></div>
      )}
    </section>
  );
}
