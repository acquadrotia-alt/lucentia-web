import { useState } from "react";
import { User, Trash2, ChevronLeft, ChevronRight, Users, History, Search, Gift, Star, AlertTriangle, Layers } from "lucide-react";
import { ESTENSIONI } from "../../cliente/index.jsx";
import { uid, fmtFullDate, eur, clientStats, loyaltyConfig, clientBalance, useMods, Field } from "./comuni.jsx";
import { downloadICS, FidelityCard, CardActions } from "./stampa.jsx";
import { ApptItem, initials } from "./agenda.jsx";
import { VoucherBalanceRow } from "./buoni.jsx";

export function ClientsView({ config, bookings, clients, setClients, sales, catalog, vouchers, setVouchers }) {
  const F = useMods();
  const staff = config.staff, services = config.services;
  const loyalty = loyaltyConfig(config);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [vc, setVc] = useState("");
  const redeemVoucher = (c) => {
    const code = vc.trim().toUpperCase();
    if (!code) return;
    const v = (vouchers || []).find((x) => String(x.code).toUpperCase() === code);
    if (!v) { alert("Codice non valido: nessun buono con questo codice."); return; }
    if (v.stato !== "attivo") { alert("Questo buono è già stato registrato o utilizzato e non è più valido."); return; }
    if (v.tipo === "pacchetto") {
      setClients((cs) => cs.map((x) => (x.code === c.code ? { ...x, packages: [...(x.packages || []), { id: uid(), serviceId: v.serviceId, total: v.sedute, used: 0, price: 0, createdAt: Date.now(), fromVoucher: v.code }] } : x)));
      setVouchers((vs) => vs.map((x) => (x.id === v.id ? { ...x, stato: "riscattato", clienteCode: c.code, clienteNome: c.name, riscattato: Date.now() } : x)));
      alert("Buono pacchetto registrato: le sedute sono state aggiunte ai pacchetti del cliente.");
    } else {
      setVouchers((vs) => vs.map((x) => (x.id === v.id ? { ...x, stato: "assegnato", clienteCode: c.code, clienteNome: c.name, riscattato: Date.now() } : x)));
      alert("Buono valore registrato sul cliente. Trovi il saldo qui sotto.");
    }
    setVc("");
  };
  const scalaVoucher = (v, amount) => {
    const max = Number(v.residuo) || 0; if (max <= 0) return;
    let amt = amount == null ? max : Number(amount);
    if (!(amt > 0)) { alert("Importo non valido."); return; }
    amt = Math.min(amt, max);
    const residuo = Math.round((max - amt) * 100) / 100;
    setVouchers((vs) => vs.map((x) => (x.id === v.id ? { ...x, residuo, stato: residuo <= 0 ? "esaurito" : "assegnato", usi: [{ at: Date.now(), importo: amt }, ...(x.usi || [])] } : x)));
  };
  const nq = q.replace(/\s/g, "");
  const filtered = clients.filter((c) => !q || (c.name || "").toLowerCase().includes(q.toLowerCase()) || c.code.includes(nq) || (c.phone || "").replace(/\s/g, "").includes(nq) || (c.card || "").replace(/\s/g, "").toLowerCase().includes(nq.toLowerCase())).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const patchClient = (code, patch) => setClients(clients.map((x) => (x.code === code ? { ...x, ...patch } : x)));
  const splitName = (c) => (c.firstName != null || c.lastName != null) ? { fn: c.firstName || "", ln: c.lastName || "" } : (function () { const p = (c.name || "").trim().split(/\s+/); return { fn: p[0] || "", ln: p.slice(1).join(" ") }; })();
  const setName = (code, fn, ln) => patchClient(code, { firstName: fn, lastName: ln, name: `${fn} ${ln}`.trim() });
  const [pkSvc, setPkSvc] = useState("");
  const [pkN, setPkN] = useState(5);
  const [pkPrice, setPkPrice] = useState("");
  const addPackage = (c) => { if (!pkSvc) return; patchClient(c.code, { packages: [...(c.packages || []), { id: uid(), serviceId: pkSvc, total: pkN, used: 0, price: pkPrice === "" ? 0 : pkPrice, createdAt: Date.now() }] }); setPkSvc(""); setPkN(5); setPkPrice(""); };
  const delPackage = (c, pid) => patchClient(c.code, { packages: (c.packages || []).filter((p) => p.id !== pid) });
  const adjPackage = (c, pid, d) => patchClient(c.code, { packages: (c.packages || []).map((p) => (p.id === pid ? { ...p, used: Math.max(0, Math.min(p.total, (Number(p.used) || 0) + d)) } : p)) });
  const redeem = (code, reward) => setClients(clients.map((x) => (x.code === code ? { ...x, redeemedPoints: (Number(x.redeemedPoints) || 0) + reward.points, redemptions: [{ label: reward.label, points: reward.points, at: Date.now() }, ...(x.redemptions || [])] } : x)));

  if (sel) {
    const c = clients.find((x) => x.code === sel);
    if (!c) return <button onClick={() => setSel(null)} className="text-sm text-stone-500">Indietro</button>;
    const stats = clientStats(c.code, bookings);
    const balance = clientBalance(c, bookings, sales, config, catalog);
    const nm = splitName(c);
    return (
      <div className="space-y-4">
        <button onClick={() => setSel(null)} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"><ChevronLeft size={16} /> Tutti i clienti</button>
        {F.fidelity && <FidelityCard branding={config.branding} name={c.name} code={c.code} />}
        {F.fidelity && <CardActions branding={config.branding} name={c.name} code={c.code} />}
        <div className="lc-card p-4">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><User size={13} /> Anagrafica cliente</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nome"><input value={nm.fn} onChange={(e) => setName(c.code, e.target.value, nm.ln)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            <Field label="Cognome"><input value={nm.ln} onChange={(e) => setName(c.code, nm.fn, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            <Field label="Telefono"><input value={c.phone || ""} onChange={(e) => patchClient(c.code, { phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            <Field label="Email"><input value={c.email || ""} onChange={(e) => patchClient(c.code, { email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            <Field label="Codice tessera (facoltativo)"><input value={c.card || ""} onChange={(e) => patchClient(c.code, { card: e.target.value })} placeholder="Tessera fisica del cliente" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          </div>
        </div>
        {/* Punto di aggancio del cliente (src/cliente/index.jsx) */}
        {ESTENSIONI.schedaCliente ? <ESTENSIONI.schedaCliente client={c} setClient={(patch) => patchClient(c.code, patch)} config={config} /> : null}

        {F.allergeni && (
        <div className="lc-card p-4">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><AlertTriangle size={13} /> Allergie, patologie e note</div>
          <div className="space-y-3">
            <div><div className="text-[11px] text-stone-400 mb-1">Allergie</div><textarea value={c.allergies || ""} onChange={(e) => patchClient(c.code, { allergies: e.target.value })} rows={2} placeholder="Es. allergia a tinture, lattice…" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
            <div><div className="text-[11px] text-stone-400 mb-1">Patologie</div><textarea value={c.conditions || ""} onChange={(e) => patchClient(c.code, { conditions: e.target.value })} rows={2} placeholder="Es. cuoio capelluto sensibile, dermatiti…" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
            <div><div className="text-[11px] text-stone-400 mb-1">Note importanti</div><textarea value={c.notes || ""} onChange={(e) => patchClient(c.code, { notes: e.target.value })} rows={2} placeholder="Preferenze, indicazioni particolari…" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></div>
          </div>
        </div>
        )}

        {F.fidelity && (
        <div className="lc-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Star size={16} className="brand-accent" /> Programma fedeltà</h3>
            <div className="text-right"><div className="text-2xl font-bold brand-accent leading-none">{balance}</div><div className="text-[11px] text-stone-400 uppercase tracking-wide">punti disponibili</div></div>
          </div>
          {loyalty.rewards.length === 0 ? <p className="text-sm text-stone-400">Nessun premio configurato. Aggiungili dalle Impostazioni → Programma fedeltà.</p> : (
            <div className="space-y-2">{loyalty.rewards.slice().sort((a, b) => a.points - b.points).map((r) => { const ok = balance >= r.points; return (
              <div key={r.id} className={`flex items-center gap-3 rounded-xl border p-3 ${ok ? "border-stone-200" : "border-stone-100 bg-stone-50"}`}>
                <Gift size={18} className={ok ? "brand-accent shrink-0" : "text-stone-300 shrink-0"} />
                <div className="flex-1 min-w-0"><div className={`font-medium truncate ${ok ? "" : "text-stone-400"}`}>{r.label}</div><div className="text-xs text-stone-400">{r.points} punti</div></div>
                <button onClick={() => { if (balance >= r.points && confirm(`Riscattare "${r.label}" usando ${r.points} punti?`)) redeem(c.code, r); }} disabled={!ok} className="text-sm font-medium px-3 py-1.5 rounded-lg brand-bg disabled:opacity-40 disabled:cursor-not-allowed shrink-0">Usa premio</button>
              </div>
            ); })}</div>
          )}
          {c.redemptions && c.redemptions.length > 0 ? (
            <div className="mt-4 pt-3 border-t border-stone-100">
              <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Premi riscattati</div>
              <div className="space-y-1">{c.redemptions.slice(0, 6).map((x, i) => <div key={i} className="flex justify-between text-sm text-stone-500"><span>{x.label}</span><span className="text-stone-400">−{x.points} pt · {fmtFullDate(x.at)}</span></div>)}</div>
            </div>
          ) : null}
        </div>
        )}

        {F.pacchetti && (
        <div className="lc-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Layers size={16} className="brand-accent" /> Pacchetti sedute</h3>
          {(c.packages && c.packages.length) ? (
            <div className="space-y-2 mb-4">{c.packages.map((p) => { const svc = services.find((x) => x.id === p.serviceId); const used = Number(p.used) || 0; const rem = p.total - used; return (
              <div key={p.id} className="border border-stone-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0"><div className="font-medium truncate">{svc ? svc.name : "Servizio"}</div><div className="text-xs text-stone-400">{rem > 0 ? `${rem} di ${p.total} sedute rimaste` : `Esaurito · ${p.total} sedute usate`}{p.price ? ` · ${eur(p.price)}` : ""}</div></div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => adjPackage(c, p.id, -1)} disabled={used <= 0} className="w-7 h-7 rounded-lg border border-stone-200 text-stone-500 disabled:opacity-30" title="Rimborsa 1 seduta">−</button>
                    <button onClick={() => adjPackage(c, p.id, 1)} disabled={used >= p.total} className="w-7 h-7 rounded-lg border border-stone-200 text-stone-500 disabled:opacity-30" title="Usa 1 seduta">+</button>
                    <button onClick={() => { if (confirm("Eliminare il pacchetto?")) delPackage(c, p.id); }} className="w-7 h-7 rounded-lg text-stone-400 hover:text-red-500 flex items-center justify-center"><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="mt-2 bg-stone-100 rounded-full h-2 overflow-hidden"><div className="h-2 rounded-full brand-bg" style={{ width: `${p.total ? (used / p.total) * 100 : 0}%` }} /></div>
              </div>
            ); })}</div>
          ) : <p className="text-sm text-stone-400 mb-4">Nessun pacchetto attivo.</p>}
          <div className="border-t border-stone-100 pt-3">
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Aggiungi pacchetto</div>
            <div className="flex flex-wrap items-end gap-2">
              <select value={pkSvc} onChange={(e) => setPkSvc(e.target.value)} className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring"><option value="">Servizio…</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <div className="flex items-center gap-1"><input type="number" min={1} step={1} value={pkN} onChange={(e) => setPkN(Math.max(1, Math.round(Number(e.target.value) || 1)))} className="w-16 px-2 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-xs text-stone-400">sedute</span></div>
              <div className="flex items-center gap-1"><input type="number" min={0} step={0.5} value={pkPrice} onChange={(e) => setPkPrice(e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0))} placeholder="prezzo" className="w-20 px-2 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-xs text-stone-400">€</span></div>
              <button onClick={() => addPackage(c)} disabled={!pkSvc} className="brand-bg text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-40">Aggiungi</button>
            </div>
          </div>
        </div>
        )}

        {(() => { const myV = (vouchers || []).filter((v) => v.clienteCode === c.code); const val = myV.filter((v) => v.tipo === "valore"); const pkgV = myV.filter((v) => v.tipo === "pacchetto"); return (
        <div className="lc-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Gift size={16} className="brand-accent" /> Buoni regalo</h3>
          <div className="flex flex-wrap items-end gap-2 mb-4">
            <div className="flex-1 min-w-[160px]"><div className="text-[11px] text-stone-400 mb-1">Registra un buono ricevuto</div>
              <input value={vc} onChange={(e) => setVc(e.target.value)} placeholder="Codice (es. BN-XXXXXX)" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring font-mono uppercase" /></div>
            <button onClick={() => redeemVoucher(c)} className="brand-bg text-sm font-medium px-3 py-2 rounded-lg">Registra</button>
          </div>
          {val.length ? (
            <div className="space-y-2">{val.map((v) => (
              <div key={v.id} className="border border-stone-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0"><div className="font-medium">Buono valore <span className="font-mono text-xs text-stone-400">{v.code}</span></div>
                    <div className="text-xs text-stone-400">Saldo <b className="brand-accent">{eur(v.residuo)}</b> di {eur(v.importo)}{v.stato === "esaurito" ? " · esaurito" : ""}</div></div>
                  {v.residuo > 0 ? <VoucherBalanceRow v={v} onScala={scalaVoucher} /> : <span className="text-[11px] px-2 py-1 rounded-full bg-stone-100 text-stone-500">Esaurito</span>}
                </div>
              </div>
            ))}</div>
          ) : null}
          {pkgV.length ? <p className="text-xs text-stone-400 mt-2">Buoni pacchetto registrati ({pkgV.length}): le sedute confluiscono nei <b>Pacchetti sedute</b>.</p> : null}
          {myV.length === 0 ? <p className="text-sm text-stone-400">Nessun buono registrato su questo cliente.</p> : null}
        </div>
        ); })()}

        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2"><History size={16} className="brand-accent" /> Storico servizi</h3>
          {stats.upcoming.length > 0 ? <div className="space-y-2 mb-3"><div className="text-xs text-stone-400 uppercase tracking-wide">In programma</div>{stats.upcoming.map((b) => <ApptItem key={b.id} b={b} staff={staff} services={services} onCal={(bk) => downloadICS(bk, staff, services, config.branding.name)} />)}</div> : null}
          {stats.past.length === 0 ? <p className="text-sm text-stone-400 bg-white border border-stone-200 rounded-xl p-4">Nessun servizio passato.</p> : <div className="space-y-2">{stats.past.map((b) => <ApptItem key={b.id} b={b} staff={staff} services={services} />)}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-stone-900 leading-none">Clienti</h2>
          <p className="text-[13px] text-stone-400 mt-1">{clients.length} sched{clients.length === 1 ? "a" : "e"}{q ? ` · ${filtered.length} risultat${filtered.length === 1 ? "o" : "i"}` : ""}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 bg-white brand-ring transition-colors hover:border-stone-400 focus-within:border-stone-400"><Search size={16} className="text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome, codice, cellulare o tessera" className="flex-1 text-sm focus:outline-none bg-transparent" /></div>
      {filtered.length === 0 ? (
        <div className="lc-card p-10 text-center">
          <div className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3"><Users size={20} className="text-stone-400" /></div>
          <p className="text-sm font-medium text-stone-600">{clients.length === 0 ? "Ancora nessun cliente" : "Nessun risultato"}</p>
          <p className="text-xs text-stone-400 mt-1">{clients.length === 0 ? "I clienti si creano da un appuntamento o dalla cassa." : "Prova con un altro nome, codice o numero."}</p>
        </div>
      ) : (
        <div className="space-y-2">{filtered.map((c, ci) => { const stats = clientStats(c.code, bookings); const bal = clientBalance(c, bookings, sales, config, catalog); return (
          <button key={c.code} onClick={() => setSel(c.code)} style={{ animationDelay: `${Math.min(ci * 30, 300)}ms` }} className="lc-fade-up group w-full text-left lc-card lc-card-hover p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full brand-soft brand-text flex items-center justify-center text-sm font-semibold shrink-0">{initials(c.name)}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-stone-900 truncate leading-tight">{c.name || "Senza nome"} <span className="text-xs text-stone-400 font-normal">#{c.code}</span></div>
              <div className="text-[13px] text-stone-500 truncate mt-0.5 flex items-center gap-1.5"><span>{stats.all.length} appuntament{stats.all.length === 1 ? "o" : "i"}</span><span className="text-stone-300">·</span><span>{stats.servicesUsed} servizi</span></div>
            </div>
            {F.fidelity ? <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium brand-soft brand-text px-2 py-1 rounded-full shrink-0"><Star size={12} className="brand-accent" /> {bal} pt</span> : null}
            <ChevronRight size={18} className="text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5 transition shrink-0" />
          </button>
        ); })}</div>
      )}
    </div>
  );
}
