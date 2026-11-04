import { useState } from "react";
import { User, Plus, Trash2, Check, ChevronRight, X, Image as ImageIcon, Search, Star, Timer, Printer, ShoppingCart, Package, Tag, Minus, Boxes, Receipt, Layers, AlertCircle, PackagePlus, FileText, Undo2, Ban } from "lucide-react";
import { uid, eur, fmtDateTime, fileToSquareDataURL, generateCode, useMods, Field } from "./comuni.jsx";
import { printSale } from "./stampa.jsx";
import { cassaRtDisponibile, emettiScontrino, annullaScontrino, resoScontrino, righeDaCarrello, SceltaPagamento, RegistratorePannello, etichettaRt, rtChiedi } from "./cassaRt.jsx";

export const cartTotal = (cart) => cart.reduce((a, it) => a + it.price * it.qty, 0);
// Scarica le giacenze dal catalogo in base al carrello venduto.
export function applySaleToCatalog(catalog, cart) {
  const products = catalog.products.map((p) => {
    const touched = cart.some((it) => it.productId === p.id);
    if (!touched) return p;
    const formats = p.formats.map((f) => { const it = cart.find((x) => x.productId === p.id && x.formatId === f.id); return it ? { ...f, stock: Math.max(0, (Number(f.stock) || 0) - it.qty) } : f; });
    return { ...p, formats };
  });
  return { ...catalog, products };
}
export function ShopView({ catalog, setCatalog, sales, setSales, clients, setClients, branding, loyalty, hidePartial, canAddClient, demo, onFattura = null, cassaRt = null }) {
  const [sezione, setSezione] = useState("cassa");
  const rt = cassaRt && cassaRt.attiva ? cassaRt : null;
  const TAB = [["cassa", "Cassa", ShoppingCart], ["storico", "Storico", Receipt], ...(rt ? [["registratore", "Registratore", Printer]] : [])];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h2 className="text-xl font-semibold tracking-tight text-stone-900 leading-none">Vendita</h2><p className="text-[13px] text-stone-400 mt-1">{rt ? "Scontrini fiscali col registratore telematico e storico" : "Cassa prodotti e storico delle vendite"}</p></div>
        <div className="flex gap-1 bg-stone-100/80 rounded-xl p-1">{TAB.map(([k, l, Icon]) => <button key={k} onClick={() => setSezione(k)} aria-current={sezione === k ? "true" : undefined} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${sezione === k ? "bg-white shadow-[var(--lc-shadow-xs)] text-stone-900" : "text-stone-500 hover:text-stone-700"}`}><Icon size={15} /> {l}</button>)}</div>
      </div>
      {sezione === "cassa" ? <PosTab catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} clients={clients} setClients={setClients} branding={branding} loyalty={loyalty} hidePartial={hidePartial} canAddClient={canAddClient} cassaRt={rt} /> : null}
      {sezione === "storico" ? <SalesHistoryTab sales={sales} setSales={setSales} catalog={catalog} setCatalog={setCatalog} branding={branding} hidePartial={hidePartial} onFattura={onFattura} cassaRt={rt} /> : null}
      {sezione === "registratore" && rt ? <RegistratorePannello cfg={rt.cfg} onRicarica={rt.ricarica} /> : null}
    </div>
  );
}

export function PosTab({ catalog, setCatalog, sales, setSales, clients, setClients, branding, loyalty, hidePartial, canAddClient, cassaRt = null }) {
  const [inStampa, setInStampa] = useState(false);
  const F = useMods();
  const cats = catalog.categories;
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState([]);
  const [client, setClient] = useState(null);
  const [lastSale, setLastSale] = useState(null);

  const products = catalog.products.filter((p) => (cat === "all" || (p.categoryId || "") === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const inCart = (pid, fid) => { const it = cart.find((x) => x.productId === pid && x.formatId === fid); return it ? it.qty : 0; };
  const add = (p, f) => {
    const remaining = (Number(f.stock) || 0) - inCart(p.id, f.id);
    if (remaining <= 0) return;
    setLastSale(null);
    setCart((c) => { const ex = c.find((x) => x.productId === p.id && x.formatId === f.id); if (ex) return c.map((x) => (x === ex ? { ...x, qty: x.qty + 1 } : x)); return [...c, { productId: p.id, formatId: f.id, name: p.name, label: f.label, price: Number(f.price) || 0, qty: 1 }]; });
  };
  const changeQty = (idx, delta) => setCart((c) => c.map((it, i) => { if (i !== idx) return it; const prod = catalog.products.find((p) => p.id === it.productId); const fmt = prod && prod.formats.find((f) => f.id === it.formatId); const max = fmt ? (Number(fmt.stock) || 0) : it.qty; return { ...it, qty: Math.min(max, Math.max(0, it.qty + delta)) }; }).filter((it) => it.qty > 0));
  const removeItem = (idx) => setCart((c) => c.filter((_, i) => i !== idx));
  const total = cartTotal(cart);
  const count = cart.reduce((a, it) => a + it.qty, 0);
  const salePoints = (loyalty && loyalty.fromSales) ? cart.reduce((a, it) => { const p = catalog.products.find((x) => x.id === it.productId); return a + ((p && p.points) || 0) * it.qty; }, 0) : 0;

  const confirm = async (partial, metodo) => {
    if (!cart.length || inStampa) return;
    for (const it of cart) { const prod = catalog.products.find((p) => p.id === it.productId); const fmt = prod && prod.formats.find((f) => f.id === it.formatId); if (!fmt || (Number(fmt.stock) || 0) < it.qty) { alert(`Giacenza insufficiente per ${it.name}.`); return; } }
    const sale = { id: uid(), ts: Date.now(), type: "sale", partial: !!partial, clientCode: client ? client.code : null, clientName: client ? (client.name || "") : "", items: cart.map((it) => ({ productId: it.productId, formatId: it.formatId, name: it.name, label: it.label, price: it.price, qty: it.qty })), total };
    // Col registratore: la vendita si registra SOLO dopo che lo scontrino è uscito. Il carrello resta com'è fino ad allora.
    if (cassaRt && cassaRt.cfg) {
      setInStampa(true);
      const esito = await emettiScontrino(righeDaCarrello(cart, catalog), metodo || "contanti", total, cassaRt.cfg);
      setInStampa(false);
      if (!esito.ok) return;
      sale.rt = esito.rt; sale.metodo = metodo || "contanti";
    }
    setCatalog(applySaleToCatalog(catalog, cart));
    setSales([sale, ...sales]);
    setCart([]); setClient(null); setLastSale(sale);
  };

  const prodQty = (pid) => cart.reduce((a, x) => (x.productId === pid ? a + x.qty : a), 0);
  const CATS = [{ id: "all", name: "Tutti" }, ...cats];

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      {/* Colonna prodotti */}
      <div className="w-full lg:flex-1 lg:min-w-0 space-y-3">
        <div className="flex items-center gap-2 border border-stone-300 rounded-xl px-3.5 py-2.5 bg-white brand-ring transition-colors hover:border-stone-400 focus-within:border-stone-400">
          <Search size={17} className="text-stone-400 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca un prodotto…" className="flex-1 text-sm focus:outline-none bg-transparent" />
          {q ? <button onClick={() => setQ("")} aria-label="Pulisci ricerca" className="text-stone-300 hover:text-stone-500 transition-colors"><X size={16} /></button> : null}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {CATS.map((c) => { const on = cat === c.id; return (
            <button key={c.id} onClick={() => setCat(c.id)} aria-current={on ? "true" : undefined} className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border transition whitespace-nowrap ${on ? "brand-soft brand-text border-transparent" : "bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700"}`}>{c.name}</button>
          ); })}
        </div>
        {products.length === 0 ? (
          <div className="lc-card p-10 text-center">
            <div className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3"><Boxes size={20} className="text-stone-400" /></div>
            <p className="text-sm font-medium text-stone-600">Nessun prodotto</p>
            <p className="text-xs text-stone-400 mt-1">{q ? "Nessun risultato per la ricerca." : "Aggiungilo dalla scheda Catalogo."}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">{products.map((p, pi) => { const inP = prodQty(p.id); return (
            <div key={p.id} className={`lc-card lc-fade-up p-3.5 flex flex-col transition ${inP > 0 ? "brand-border" : "lc-card-hover"}`} style={{ animationDelay: `${Math.min(pi * 35, 280)}ms` }}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="font-semibold leading-tight text-stone-900 truncate">{p.name}</div>
                  {p.description ? <div className="text-xs text-stone-400 mt-0.5 truncate">{p.description}</div> : null}
                </div>
                {inP > 0 ? <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold brand-bg px-2 py-0.5 rounded-full"><ShoppingCart size={11} /> {inP}</span> : null}
              </div>
              <div className="space-y-1.5 mt-auto">{p.formats.map((f) => { const remaining = (Number(f.stock) || 0) - inCart(p.id, f.id); const out = remaining <= 0; return (
                <button key={f.id} onClick={() => add(p, f)} disabled={out} className={`group/fmt w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-sm transition ${out ? "border-stone-200 bg-stone-50 text-stone-300 cursor-not-allowed" : "border-stone-200 brand-hover hover:bg-stone-50 active:scale-[0.99]"}`}>
                  <span className="flex items-center gap-1.5 min-w-0"><Tag size={13} className={out ? "text-stone-300 shrink-0" : "brand-accent shrink-0"} /> <span className="truncate">{f.label}</span></span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-stone-800 tabular-nums">{eur(f.price)}</span>
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${out ? "bg-red-50 text-red-500" : "bg-stone-100 text-stone-500"}`}>{out ? "esaurito" : `${remaining} pz`}</span>
                    {!out ? <Plus size={15} className="brand-accent opacity-30 group-hover/fmt:opacity-100 transition-opacity" /> : null}
                  </span>
                </button>
              ); })}</div>
            </div>
          ); })}</div>
        )}
      </div>

      {/* Carrello / scontrino */}
      <div className="w-full lg:w-80 lg:shrink-0 lg:sticky lg:top-20">
        <div className="lc-card p-0 overflow-hidden flex flex-col lg:max-h-[calc(100vh-6.5rem)]">
          <div className="px-4 py-3.5 border-b border-stone-100 flex items-center justify-between shrink-0">
            <h3 className="font-semibold flex items-center gap-2 text-stone-900 tracking-tight"><ShoppingCart size={16} className="brand-accent" /> Carrello</h3>
            {count ? <span className="text-xs font-medium brand-soft brand-text px-2 py-0.5 rounded-full tabular-nums">{count} pz</span> : null}
          </div>

          {cart.length === 0 ? (
            <div className="px-4">
              {lastSale ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 my-4">
                  <div className="flex items-center gap-1.5 font-medium"><Check size={15} /> {lastSale.rt ? `Scontrino ${etichettaRt(lastSale.rt)} emesso` : `Vendita ${lastSale.partial ? "parziale " : ""}registrata`} · {eur(lastSale.total)}</div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => printSale(lastSale, branding)} className="text-xs font-medium border border-green-300 text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-100 inline-flex items-center gap-1"><Printer size={13} /> Scontrino</button>
                    <button onClick={() => setLastSale(null)} className="text-xs font-medium text-green-700 px-2.5 py-1.5 hover:underline">Nuova vendita</button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12"><ShoppingCart size={30} className="mx-auto text-stone-300 mb-3" /><p className="text-sm text-stone-400 leading-relaxed">Tocca un prodotto<br />per aggiungerlo al carrello.</p></div>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 min-h-0">{cart.map((it, i) => (
                <div key={i} className="flex items-center gap-2 py-2.5 border-b border-stone-100 last:border-0">
                  <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate text-stone-900">{it.name}</div><div className="text-xs text-stone-400 truncate">{it.label} · {eur(it.price)}</div></div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => changeQty(i, -1)} className="w-7 h-7 rounded-lg border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 active:scale-90 transition"><Minus size={13} /></button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">{it.qty}</span>
                    <button onClick={() => changeQty(i, 1)} className="w-7 h-7 rounded-lg border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 active:scale-90 transition"><Plus size={13} /></button>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold tabular-nums text-stone-900">{eur(it.price * it.qty)}</div>
                  <button onClick={() => removeItem(i)} aria-label="Rimuovi" className="text-stone-300 hover:text-red-500 transition-colors"><X size={15} /></button>
                </div>
              ))}</div>
              <div className="border-t border-stone-100 p-4 space-y-3 shrink-0 bg-white">
                <ClientAssign clients={clients} setClients={setClients} client={client} setClient={setClient} canAddClient={canAddClient} />
                {F.fidelity && loyalty && loyalty.fromSales ? <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-1.5 text-stone-500"><Star size={14} className="brand-accent" /> Punti generati</span><span className="font-medium brand-accent">+{salePoints}{client ? "" : " (assegna un cliente)"}</span></div> : null}
                <div className="flex items-baseline justify-between pt-1"><span className="text-sm font-medium text-stone-500">Totale</span><span className="text-2xl font-semibold tracking-tight tabular-nums text-stone-900">{eur(total)}</span></div>
                {cassaRt ? <SceltaPagamento totale={total} disabled={inStampa} onScegli={(m) => confirm(false, m)} /> : (
                <div className={hidePartial ? "" : "grid grid-cols-2 gap-2"}>
                  <button onClick={() => confirm(false)} className="w-full brand-bg font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-[var(--lc-shadow-xs)] hover:shadow-[var(--lc-shadow-sm)]"><Check size={16} /> {hidePartial ? "Conferma vendita" : "Totale"}</button>
                  {!hidePartial ? <button onClick={() => confirm(true)} className="font-medium py-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-amber-300 text-amber-700 hover:bg-amber-50 transition"><Timer size={16} /> Parziale</button> : null}
                </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ClientAssign({ clients, setClients, client, setClient, canAddClient }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [nn, setNn] = useState("");
  const [np, setNp] = useState("");
  const nq = q.replace(/\s/g, "");
  const matches = q ? clients.filter((c) => (c.name || "").toLowerCase().includes(q.toLowerCase()) || c.code.includes(nq) || (c.phone || "").replace(/\s/g, "").includes(nq) || (c.card || "").replace(/\s/g, "").toLowerCase().includes(nq.toLowerCase())).slice(0, 6) : [];
  const reset = () => { setOpen(false); setQ(""); setCreating(false); setNn(""); setNp(""); };
  const createClient = () => {
    if (!nn.trim()) return;
    if (canAddClient === false) { alert("Limite demo raggiunto: massimo 3 clienti."); return; }
    const code = generateCode(clients);
    const nc = { code, name: nn.trim(), email: "", phone: np.trim(), card: "", createdAt: Date.now() };
    setClients([...clients, nc]); setClient(nc); reset();
  };
  if (client) return (
    <div className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2 text-sm">
      <span className="flex items-center gap-1.5 min-w-0"><User size={14} className="text-stone-400 shrink-0" /> <span className="truncate">{client.name || "Cliente"} <span className="text-stone-400">#{client.code}</span></span></span>
      <button onClick={() => setClient(null)} className="text-stone-400 hover:text-red-500 shrink-0"><X size={16} /></button>
    </div>
  );
  return (
    <div>
      {!open ? <button onClick={() => setOpen(true)} className="w-full text-sm border border-dashed border-stone-300 text-stone-500 rounded-lg py-2 hover:bg-stone-50 flex items-center justify-center gap-1.5"><Plus size={14} /> Assegna cliente (facoltativo)</button> : (
        <div className="border border-stone-200 rounded-lg p-2">
          {!creating ? (
            <>
              <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-2 py-1.5 brand-ring mb-1"><Search size={14} className="text-stone-400" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, codice, cellulare o tessera" className="flex-1 text-sm focus:outline-none" /><button onClick={reset} className="text-stone-400"><X size={15} /></button></div>
              {matches.map((c) => <button key={c.code} onClick={() => { setClient(c); reset(); }} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-stone-50 text-sm flex justify-between gap-2"><span className="truncate">{c.name || "Senza nome"} <span className="text-stone-400">#{c.code}</span></span>{c.phone ? <span className="text-stone-400 text-xs shrink-0">{c.phone}</span> : null}</button>)}
              {q && matches.length === 0 ? <p className="text-xs text-stone-400 px-2 py-1.5">Nessun cliente trovato.</p> : null}
              <button onClick={() => { setCreating(true); setNn(q); }} className="w-full mt-1 text-sm brand-accent flex items-center justify-center gap-1.5 py-1.5 hover:bg-stone-50 rounded-md"><Plus size={14} /> Nuovo cliente</button>
            </>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-medium text-stone-400 uppercase tracking-wide">Nuovo cliente</div>
              <input autoFocus value={nn} onChange={(e) => setNn(e.target.value)} placeholder="Nome e cognome" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
              <input value={np} onChange={(e) => setNp(e.target.value)} placeholder="Telefono (facoltativo)" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
              <div className="flex gap-2"><button onClick={createClient} disabled={!nn.trim()} className="flex-1 brand-bg text-sm font-medium py-2 rounded-lg disabled:opacity-40">Crea e assegna</button><button onClick={() => setCreating(false)} className="text-sm text-stone-500 px-3 py-2 rounded-lg border border-stone-200">Indietro</button></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SalesHistoryTab({ sales, setSales, catalog, setCatalog, branding, hidePartial, onFattura = null, cassaRt = null }) {
  const [busyRt, setBusyRt] = useState("");
  // Annullo (tutto lo scontrino) o reso (una parte) col registratore: prima chiede, poi emette, e solo se è uscito registra.
  const rettifica = async (s, tipo) => {
    if (!cassaRt || !cassaRt.cfg || busyRt) return;
    const righe = s.items.map((it) => { const p = (catalog.products || []).find((x) => x.id === it.productId) || {}; const f = (p.formats || []).find((x) => x.id === it.formatId) || {}; return { descrizione: it.name + (it.label && it.label !== "Standard" ? " " + it.label : ""), qta: it.qty, prezzo: it.price, aliquota: f.aliquota || p.aliquota || "", categoria: p.categoryId || "", productId: it.productId, formatId: it.formatId }; });
    let daRendere = righe, totale = s.total;
    if (tipo === "reso") {
      const q = prompt("Quanti pezzi rendere per ogni riga, nell'ordine, separati da virgola?\n" + righe.map((r, i) => `${i + 1}. ${r.descrizione} (venduti ${r.qta})`).join("\n"), righe.map((r) => r.qta).join(","));
      if (q == null) return;
      const nums = q.split(/[,;\s]+/).map((x) => Math.max(0, Math.round(Number(x) || 0)));
      daRendere = righe.map((r, i) => ({ ...r, qta: Math.min(r.qta, nums[i] || 0) })).filter((r) => r.qta > 0);
      if (!daRendere.length) return;
      totale = Math.round(daRendere.reduce((a, r) => a + r.prezzo * r.qta, 0) * 100) / 100;
    } else if (!(await rtChiedi("Annullare lo scontrino?", `Annullo lo scontrino ${etichettaRt(s.rt)} di ${eur(s.total)}: il registratore emette un documento di annullo e la vendita viene stornata (i prodotti tornano in magazzino).`, [{ label: "Sì, annulla", value: "si" }, { label: "No", value: "no", soft: true }], "warn")) === "si") return;
    setBusyRt(s.id);
    const r = tipo === "reso" ? await resoScontrino(s, daRendere, totale, cassaRt.cfg) : await annullaScontrino(s, righe, cassaRt.cfg);
    setBusyRt("");
    if (!r.fatto) { if (r.errore) await rtChiedi("Operazione non riuscita", r.errore, [{ label: "Chiudi", value: "close" }], "warn"); return; }
    // le giacenze tornano su; la vendita resta nello storico, stornata o con il reso collegato
    if (setCatalog) setCatalog({ ...catalog, products: catalog.products.map((p) => ({ ...p, formats: p.formats.map((f) => { const it = daRendere.find((x) => x.productId === p.id && x.formatId === f.id); return it ? { ...f, stock: (Number(f.stock) || 0) + it.qta } : f; }) })) });
    const rec = { id: uid(), ts: Date.now(), type: tipo, riferimento: s.id, clientCode: s.clientCode, clientName: s.clientName, items: daRendere.map((r) => ({ productId: r.productId, formatId: r.formatId, name: r.descrizione, label: "", price: r.prezzo, qty: r.qta })), total: -totale, rt: r.rt, metodo: s.metodo };
    setSales([rec, ...sales.map((x) => (x.id === s.id ? { ...x, [tipo === "reso" ? "resoId" : "annulloId"]: rec.id, ...(tipo === "annullo" ? { annullato: true } : {}) } : x))]);
  };
  const [openId, setOpenId] = useState(null);
  const [q, setQ] = useState("");
  const isLoad = (r) => r.type === "load" || r.type === "rettifica";
  const isReso = (r) => r.type === "reso" || r.type === "annullo";
  const visible = (hidePartial ? sales.filter((r) => !r.partial) : sales).filter((r) => !isLoad(r));
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const onlySales = visible.filter((s) => !isLoad(s) && !isReso(s) && !s.annullato);
  const todaySales = onlySales.filter((s) => s.ts >= startToday.getTime());
  const todayTot = todaySales.reduce((a, s) => a + (s.total || 0), 0);
  const allTot = onlySales.reduce((a, s) => a + (s.total || 0), 0);
  const records = visible.filter((r) => !q || `${r.clientName || ""} ${(r.items || []).map((i) => i.name).join(" ")} ${r.fatturaNumero || ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="lc-card p-4"><div className="text-xs text-stone-400 uppercase tracking-wide">Incasso oggi</div><div className="text-xl font-semibold">{eur(todayTot)}</div><div className="text-xs text-stone-400">{todaySales.length} vendite</div></div>
        <div className="lc-card p-4"><div className="text-xs text-stone-400 uppercase tracking-wide">Incasso totale</div><div className="text-xl font-semibold">{eur(allTot)}</div><div className="text-xs text-stone-400">{onlySales.length} vendite</div></div>
      </div>
      <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 bg-white brand-ring"><Search size={16} className="text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per cliente, prodotto o fattura" className="flex-1 text-sm focus:outline-none" /></div>
      {records.length === 0 ? <div className="lc-card p-10 text-center text-stone-400">Nessuna vendita{q ? " per questa ricerca" : ""}.</div> : (
        <div className="space-y-2">{records.map((s) => { const open = openId === s.id; const load = isLoad(s); const pieces = s.items.reduce((a, it) => a + it.qty, 0); return (
          <div key={s.id} className="bg-white rounded-xl border border-stone-200 shadow-sm">
            <button onClick={() => setOpenId(open ? null : s.id)} className="w-full flex items-center gap-3 p-3 text-left">
              {load ? <PackagePlus size={18} className="text-emerald-500 shrink-0" /> : <Receipt size={18} className="text-stone-400 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2 flex-wrap">{load ? <span>Carico magazzino</span> : <span className={s.annullato ? "line-through text-stone-400" : ""}>{eur(s.total)}</span>}<span className="text-xs text-stone-400 font-normal">· {pieces} pz</span>{isReso(s) ? <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${s.type === "reso" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{s.type === "reso" ? "Reso" : "Annullo"}</span> : null}{s.annullato ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">Annullata</span> : null}{s.rt ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 inline-flex items-center gap-0.5"><Receipt size={10} /> {etichettaRt(s.rt)}</span> : null}{s.partial ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 inline-flex items-center gap-0.5"><Timer size={10} /> Parziale</span> : null}{load ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Carico</span> : null}</div>
                <div className="text-xs text-stone-400 truncate">{fmtDateTime(s.ts)}{load ? "" : (s.clientName ? ` · ${s.clientName}` : " · Cliente occasionale")}</div>
              </div>
              <ChevronRight size={18} className={`text-stone-300 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
            </button>
            {open ? (
              <div className="px-3 pb-3 border-t border-stone-100 pt-2">
                <div className="space-y-1 text-sm">{s.items.map((it, i) => (<div key={i} className="flex justify-between gap-2"><span className="text-stone-600">{load ? `+${it.qty}` : `${it.qty}×`} {it.name}{it.label ? ` (${it.label})` : ""}</span>{load ? <span className="text-emerald-600 shrink-0">+{it.qty} pz</span> : <span className="text-stone-500 shrink-0">{eur(it.price * it.qty)}</span>}</div>))}</div>
                {!load ? <div className="mt-3 flex flex-wrap gap-2 items-center"><button onClick={() => printSale(s, branding)} className="text-xs font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Printer size={14} /> Stampa scontrino</button>
                  {onFattura ? (s.fatturaId ? <span className="text-xs text-stone-500 inline-flex items-center gap-1"><FileText size={13} /> Fattura n. {s.fatturaNumero}</span> : <button onClick={() => onFattura(s)} className="text-xs font-medium border brand-border brand-accent bg-white px-3 py-1.5 rounded-lg hover:brand-soft inline-flex items-center gap-1.5"><FileText size={14} /> Fattura</button>) : null}
                  {cassaRt && s.rt && s.type === "sale" && !s.annullato ? <>
                    <button onClick={() => rettifica(s, "reso")} disabled={!!busyRt} className="text-xs font-medium border border-amber-300 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-50 inline-flex items-center gap-1.5 disabled:opacity-50"><Undo2 size={14} /> Reso</button>
                    <button onClick={() => rettifica(s, "annullo")} disabled={!!busyRt} className="text-xs font-medium border border-red-300 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 inline-flex items-center gap-1.5 disabled:opacity-50"><Ban size={14} /> Annulla scontrino</button>
                  </> : null}</div> : null}
              </div>
            ) : null}
          </div>
        ); })}</div>
      )}
    </div>
  );
}
