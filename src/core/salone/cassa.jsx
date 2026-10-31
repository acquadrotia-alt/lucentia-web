import { useState } from "react";
import { User, Plus, Trash2, Check, ChevronRight, X, Image as ImageIcon, Search, Star, Timer, Printer, ShoppingCart, Package, Tag, Minus, Boxes, Receipt, Layers, AlertCircle, PackagePlus } from "lucide-react";
import { uid, eur, fmtDateTime, fileToSquareDataURL, generateCode, useMods, Field } from "./comuni.jsx";
import { printSale } from "./stampa.jsx";

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
// Carico magazzino: incrementa le giacenze.
export function applyLoadToCatalog(catalog, items) {
  const products = catalog.products.map((p) => {
    if (!items.some((it) => it.productId === p.id)) return p;
    const formats = p.formats.map((f) => { const it = items.find((x) => x.productId === p.id && x.formatId === f.id); return it ? { ...f, stock: (Number(f.stock) || 0) + it.qty } : f; });
    return { ...p, formats };
  });
  return { ...catalog, products };
}
export function ShopView({ catalog, setCatalog, sales, setSales, clients, setClients, branding, loyalty, hidePartial, canAddClient, demo }) {
  const [tab, setTab] = useState("pos");
  const TABS = [["pos", "Cassa", ShoppingCart], ["load", "Carico", PackagePlus], ["catalog", "Catalogo", Boxes], ["history", "Storico", Receipt]];
  const lock = (node) => (
    <div>
      <div className="mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" /> In demo puoi vendere i prodotti già caricati, ma non modificare il magazzino.</div>
      <fieldset disabled style={{ border: 0, margin: 0, padding: 0, minInlineSize: "auto" }}>{node}</fieldset>
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 bg-stone-100/80 rounded-xl p-1 w-fit">
        {TABS.map((t) => { const k = t[0], l = t[1], Icon = t[2]; return (
          <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? "true" : undefined} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ${tab === k ? "bg-white shadow-[var(--lc-shadow-xs)] text-stone-900" : "text-stone-500 hover:text-stone-700"}`}><Icon size={15} /> {l}</button>
        ); })}
      </div>
      {tab === "pos" ? <PosTab catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} clients={clients} setClients={setClients} branding={branding} loyalty={loyalty} hidePartial={hidePartial} canAddClient={canAddClient} /> : null}
      {tab === "load" ? (demo ? lock(<LoadTab catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} />) : <LoadTab catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} />) : null}
      {tab === "catalog" ? (demo ? lock(<CatalogTab catalog={catalog} setCatalog={setCatalog} loyalty={loyalty} />) : <CatalogTab catalog={catalog} setCatalog={setCatalog} loyalty={loyalty} />) : null}
      {tab === "history" ? <SalesHistoryTab sales={sales} branding={branding} hidePartial={hidePartial} /> : null}
    </div>
  );
}

export function PosTab({ catalog, setCatalog, sales, setSales, clients, setClients, branding, loyalty, hidePartial, canAddClient }) {
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

  const confirm = (partial) => {
    if (!cart.length) return;
    for (const it of cart) { const prod = catalog.products.find((p) => p.id === it.productId); const fmt = prod && prod.formats.find((f) => f.id === it.formatId); if (!fmt || (Number(fmt.stock) || 0) < it.qty) { alert(`Giacenza insufficiente per ${it.name}.`); return; } }
    const sale = { id: uid(), ts: Date.now(), type: "sale", partial: !!partial, clientCode: client ? client.code : null, clientName: client ? (client.name || "") : "", items: cart.map((it) => ({ productId: it.productId, formatId: it.formatId, name: it.name, label: it.label, price: it.price, qty: it.qty })), total };
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
                  <div className="flex items-center gap-1.5 font-medium"><Check size={15} /> Vendita {lastSale.partial ? "parziale " : ""}registrata · {eur(lastSale.total)}</div>
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
                <div className={hidePartial ? "" : "grid grid-cols-2 gap-2"}>
                  <button onClick={() => confirm(false)} className="w-full brand-bg font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-[var(--lc-shadow-xs)] hover:shadow-[var(--lc-shadow-sm)]"><Check size={16} /> {hidePartial ? "Conferma vendita" : "Totale"}</button>
                  {!hidePartial ? <button onClick={() => confirm(true)} className="font-medium py-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-amber-300 text-amber-700 hover:bg-amber-50 transition"><Timer size={16} /> Parziale</button> : null}
                </div>
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

export function CatalogTab({ catalog, setCatalog, loyalty }) {
  const cats = catalog.categories;
  const setCats = (categories) => setCatalog({ ...catalog, categories });
  const setProds = (products) => setCatalog({ ...catalog, products });
  const [newCat, setNewCat] = useState("");
  const addCat = () => { const n = newCat.trim(); if (!n) return; setCats([...cats, { id: uid(), name: n }]); setNewCat(""); };
  const renameCat = (id, name) => setCats(cats.map((c) => (c.id === id ? { ...c, name } : c)));
  const delCat = (id) => { if (!confirm("Eliminare la categoria? I prodotti resteranno senza categoria.")) return; setCatalog({ ...catalog, categories: cats.filter((c) => c.id !== id), products: catalog.products.map((p) => (p.categoryId === id ? { ...p, categoryId: "" } : p)) }); };
  const addProduct = () => setProds([...catalog.products, { id: uid(), name: "Nuovo prodotto", description: "", categoryId: cats[0] ? cats[0].id : "", formats: [{ id: uid(), label: "Standard", price: 0, stock: 0 }] }]);
  const editProduct = (id, patch) => setProds(catalog.products.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const delProduct = (id) => { if (confirm("Eliminare questo prodotto?")) setProds(catalog.products.filter((p) => p.id !== id)); };

  const groups = [...cats, { id: "", name: "Senza categoria" }].map((c) => ({ cat: c, items: catalog.products.filter((p) => (p.categoryId || "") === c.id) })).filter((g) => g.items.length || g.cat.id);

  return (
    <div className="space-y-6">
      <section className="lc-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><Layers size={16} className="brand-accent" /> Categorie</h3>
        <div className="space-y-2">{cats.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <input value={c.name} onChange={(e) => renameCat(c.id, e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
            <span className="text-xs text-stone-400 w-16 text-right">{catalog.products.filter((p) => p.categoryId === c.id).length} prod.</span>
            <button onClick={() => delCat(c.id)} className="p-2 text-stone-400 hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        ))}</div>
        <div className="flex gap-2 mt-3"><input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCat()} placeholder="Nuova categoria" className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /><button onClick={addCat} className="brand-bg px-3 py-2 rounded-lg text-sm inline-flex items-center gap-1"><Plus size={15} /> Aggiungi</button></div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3"><h3 className="font-semibold flex items-center gap-2"><Package size={16} className="brand-accent" /> Prodotti e giacenze</h3><button onClick={addProduct} className="flex items-center gap-1 text-sm brand-bg px-3 py-1.5 rounded-lg"><Plus size={15} /> Aggiungi prodotto</button></div>
        {catalog.products.length === 0 ? <div className="lc-card p-10 text-center text-stone-400">Nessun prodotto. Aggiungine uno.</div> : groups.map((g) => (
          <div key={g.cat.id || "none"} className="mb-4">
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">{g.cat.name}</div>
            <div className="space-y-2">{g.items.map((p) => <ProductEditor key={p.id} product={p} categories={cats} loyalty={loyalty} onChange={(patch) => editProduct(p.id, patch)} onDelete={() => delProduct(p.id)} />)}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

export function ProductEditor({ product, categories, loyalty, onChange, onDelete }) {
  const F = useMods();
  const [open, setOpen] = useState(false);
  const p = product;
  const setFormat = (fid, patch) => onChange({ formats: p.formats.map((f) => (f.id === fid ? { ...f, ...patch } : f)) });
  const addFormat = () => onChange({ formats: [...p.formats, { id: uid(), label: "Nuovo formato", price: 0, stock: 0 }] });
  const delFormat = (fid) => { if (p.formats.length <= 1) return; onChange({ formats: p.formats.filter((f) => f.id !== fid) }); };
  const totalStock = p.formats.reduce((a, f) => a + (Number(f.stock) || 0), 0);
  const prices = p.formats.map((f) => Number(f.price) || 0);
  const priceLabel = prices.length ? (Math.min(...prices) === Math.max(...prices) ? eur(prices[0]) : `${eur(Math.min(...prices))} – ${eur(Math.max(...prices))}`) : "";
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-3 text-left">
        {p.foto ? <img src={p.foto} alt="" className="w-10 h-10 rounded-lg object-cover ring-1 ring-stone-200 shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0"><Package size={17} className="text-stone-300" /></div>}
        <div className="flex-1 min-w-0"><div className="font-medium truncate">{p.name}</div><div className="text-xs text-stone-400">{priceLabel} · {p.formats.length} format{p.formats.length === 1 ? "o" : "i"} · giacenza {totalStock} pz</div></div>
        <ChevronRight size={18} className={`text-stone-300 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open ? (
        <div className="px-3 pb-3 border-t border-stone-100 pt-3 space-y-3">
          <div className="flex items-start gap-3">
            <label className="w-20 h-20 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center cursor-pointer shrink-0 hover:border-stone-300 relative" title="Foto del prodotto (quadrata 1:1)">
              {p.foto ? <img src={p.foto} alt="" className="w-full h-full object-cover" /> : <span className="flex flex-col items-center gap-1 text-stone-300"><ImageIcon size={18} /><span className="text-[9px] font-medium">Foto 1:1</span></span>}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files && e.target.files[0]; if (!file) return; try { onChange({ foto: await fileToSquareDataURL(file, 480) }); } catch (err) { alert("Impossibile caricare la foto."); } e.target.value = ""; }} />
            </label>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Nome"><input value={p.name} onChange={(e) => onChange({ name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
                <Field label="Categoria"><select value={p.categoryId || ""} onChange={(e) => onChange({ categoryId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring"><option value="">Senza categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              </div>
              {p.foto ? <button type="button" onClick={() => onChange({ foto: null })} className="text-xs text-stone-400 hover:text-red-500 flex items-center gap-1"><Trash2 size={12} /> Rimuovi foto</button> : null}
            </div>
          </div>
          <Field label="Descrizione (interna)"><input value={p.description || ""} onChange={(e) => onChange({ description: e.target.value })} placeholder="Breve descrizione" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          <Field label="Descrizione per il mini-sito · visibile solo ai clienti online"><textarea value={p.descrizioneSito || ""} onChange={(e) => onChange({ descrizioneSito: e.target.value })} rows={2} placeholder="Es. Idratazione profonda per capelli secchi e trattati, con olio di argan. Profumo delicato." className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          {F.fidelity && loyalty && loyalty.fromSales ? <Field label="Punti fedeltà per pezzo venduto"><div className="flex items-center gap-1"><input type="number" min={0} step={1} value={p.points != null ? p.points : 0} onChange={(e) => onChange({ points: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="w-24 px-3 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-xs text-stone-400">punti</span></div></Field> : null}
          <div>
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">Formati · prezzo · giacenza</div>
            <div className="space-y-2">{p.formats.map((f) => (
              <div key={f.id} className="flex items-center gap-2">
                <input value={f.label} onChange={(e) => setFormat(f.id, { label: e.target.value })} placeholder="es. 300 ml" className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-stone-300 text-sm brand-ring" />
                <div className="flex items-center gap-1"><input type="number" min={0} step={0.5} value={f.price} onChange={(e) => setFormat(f.id, { price: Math.max(0, Number(e.target.value) || 0) })} className="w-20 px-2 py-1.5 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-xs text-stone-400">€</span></div>
                <div className="flex items-center gap-1"><input type="number" min={0} step={1} value={f.stock} onChange={(e) => setFormat(f.id, { stock: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="w-16 px-2 py-1.5 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-xs text-stone-400">pz</span></div>
                <button onClick={() => delFormat(f.id)} disabled={p.formats.length <= 1} className="p-1.5 text-stone-400 hover:text-red-500 disabled:opacity-30"><Trash2 size={15} /></button>
              </div>
            ))}</div>
            <button onClick={addFormat} className="text-xs brand-accent hover:opacity-70 flex items-center gap-0.5 mt-2"><Plus size={13} /> formato</button>
          </div>
          <button onClick={onDelete} className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 size={13} /> Elimina prodotto</button>
        </div>
      ) : null}
    </div>
  );
}

export function SalesHistoryTab({ sales, branding, hidePartial }) {
  const [openId, setOpenId] = useState(null);
  const [flt, setFlt] = useState("all");
  const isLoad = (r) => r.type === "load";
  const visible = hidePartial ? sales.filter((r) => !r.partial) : sales;
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const onlySales = visible.filter((s) => !isLoad(s));
  const todaySales = onlySales.filter((s) => s.ts >= startToday.getTime());
  const todayTot = todaySales.reduce((a, s) => a + (s.total || 0), 0);
  const allTot = onlySales.reduce((a, s) => a + (s.total || 0), 0);
  const loadCount = visible.filter(isLoad).length;
  const records = visible.filter((r) => flt === "all" || (flt === "sales" && !isLoad(r)) || (flt === "loads" && isLoad(r)));
  const chip = (on) => `px-3 py-1.5 rounded-lg text-sm border transition ${on ? "brand-bg border-transparent" : "bg-white border-stone-200 text-stone-600 brand-hover"}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="lc-card p-4"><div className="text-xs text-stone-400 uppercase tracking-wide">Incasso oggi</div><div className="text-xl font-semibold">{eur(todayTot)}</div><div className="text-xs text-stone-400">{todaySales.length} vendite</div></div>
        <div className="lc-card p-4"><div className="text-xs text-stone-400 uppercase tracking-wide">Incasso totale</div><div className="text-xl font-semibold">{eur(allTot)}</div><div className="text-xs text-stone-400">{onlySales.length} vendite · {loadCount} carichi</div></div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFlt("all")} className={chip(flt === "all")}>Tutti</button>
        <button onClick={() => setFlt("sales")} className={chip(flt === "sales")}>Vendite</button>
        <button onClick={() => setFlt("loads")} className={chip(flt === "loads")}>Carichi</button>
      </div>
      {records.length === 0 ? <div className="lc-card p-10 text-center text-stone-400">Nessun movimento.</div> : (
        <div className="space-y-2">{records.map((s) => { const open = openId === s.id; const load = isLoad(s); const pieces = s.items.reduce((a, it) => a + it.qty, 0); return (
          <div key={s.id} className="bg-white rounded-xl border border-stone-200 shadow-sm">
            <button onClick={() => setOpenId(open ? null : s.id)} className="w-full flex items-center gap-3 p-3 text-left">
              {load ? <PackagePlus size={18} className="text-emerald-500 shrink-0" /> : <Receipt size={18} className="text-stone-400 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2">{load ? <span>Carico magazzino</span> : <span>{eur(s.total)}</span>}<span className="text-xs text-stone-400 font-normal">· {pieces} pz</span>{s.partial ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 inline-flex items-center gap-0.5"><Timer size={10} /> Parziale</span> : null}{load ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Carico</span> : null}</div>
                <div className="text-xs text-stone-400 truncate">{fmtDateTime(s.ts)}{load ? "" : (s.clientName ? ` · ${s.clientName}` : " · Cliente occasionale")}</div>
              </div>
              <ChevronRight size={18} className={`text-stone-300 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
            </button>
            {open ? (
              <div className="px-3 pb-3 border-t border-stone-100 pt-2">
                <div className="space-y-1 text-sm">{s.items.map((it, i) => (<div key={i} className="flex justify-between gap-2"><span className="text-stone-600">{load ? `+${it.qty}` : `${it.qty}×`} {it.name}{it.label ? ` (${it.label})` : ""}</span>{load ? <span className="text-emerald-600 shrink-0">+{it.qty} pz</span> : <span className="text-stone-500 shrink-0">{eur(it.price * it.qty)}</span>}</div>))}</div>
                {!load ? <button onClick={() => printSale(s, branding)} className="mt-3 text-xs font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Printer size={14} /> Stampa scontrino</button> : null}
              </div>
            ) : null}
          </div>
        ); })}</div>
      )}
    </div>
  );
}

export function LoadTab({ catalog, setCatalog, sales, setSales }) {
  const cats = catalog.categories;
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [done, setDone] = useState(null);

  const products = catalog.products.filter((p) => (cat === "all" || (p.categoryId || "") === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const inList = (pid, fid) => { const it = list.find((x) => x.productId === pid && x.formatId === fid); return it ? it.qty : 0; };
  const add = (p, f) => {
    setDone(null);
    setList((c) => { const ex = c.find((x) => x.productId === p.id && x.formatId === f.id); if (ex) return c.map((x) => (x === ex ? { ...x, qty: x.qty + 1 } : x)); return [...c, { productId: p.id, formatId: f.id, name: p.name, label: f.label, qty: 1 }]; });
  };
  const changeQty = (idx, delta) => setList((c) => c.map((it, i) => (i === idx ? { ...it, qty: Math.max(0, it.qty + delta) } : it)).filter((it) => it.qty > 0));
  const setQtyDirect = (idx, val) => setList((c) => c.map((it, i) => (i === idx ? { ...it, qty: Math.max(0, Math.round(Number(val) || 0)) } : it)).filter((it) => it.qty > 0));
  const removeItem = (idx) => setList((c) => c.filter((_, i) => i !== idx));
  const totalPieces = list.reduce((a, it) => a + it.qty, 0);

  const confirm = () => {
    if (!list.length) return;
    const rec = { id: uid(), ts: Date.now(), type: "load", items: list.map((it) => ({ productId: it.productId, formatId: it.formatId, name: it.name, label: it.label, qty: it.qty })), total: 0 };
    setCatalog(applyLoadToCatalog(catalog, list));
    setSales([rec, ...sales]);
    setList([]); setDone(rec);
  };

  const chip = (on) => `px-3 py-1.5 rounded-lg text-sm border transition ${on ? "brand-bg border-transparent" : "bg-white border-stone-200 text-stone-600 brand-hover"}`;

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      <div className="w-full sm:flex-1 sm:min-w-0 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setCat("all")} className={chip(cat === "all")}>Tutti</button>
          {cats.map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={chip(cat === c.id)}>{c.name}</button>)}
        </div>
        <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 bg-white brand-ring"><Search size={16} className="text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca prodotto da rifornire" className="flex-1 text-sm focus:outline-none" /></div>
        {products.length === 0 ? <div className="lc-card p-10 text-center text-stone-400">Nessun prodotto. Aggiungilo dalla scheda Catalogo.</div> : (
          <div className="grid sm:grid-cols-2 gap-3">{products.map((p) => (
            <div key={p.id} className="lc-card p-3">
              <div className="font-medium leading-tight">{p.name}</div>
              {p.description ? <div className="text-xs text-stone-400 mb-2 mt-0.5">{p.description}</div> : <div className="mb-2" />}
              <div className="space-y-1.5">{p.formats.map((f) => { const added = inList(p.id, f.id); return (
                <button key={f.id} onClick={() => add(p, f)} className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-stone-200 text-sm transition brand-hover">
                  <span className="flex items-center gap-1.5 min-w-0"><Tag size={13} className="brand-accent shrink-0" /> <span className="truncate">{f.label}</span></span>
                  <span className="flex items-center gap-2 shrink-0"><span className="text-xs text-stone-400">giac. {Number(f.stock) || 0}{added ? ` +${added}` : ""}</span><PackagePlus size={15} className="brand-accent" /></span>
                </button>
              ); })}</div>
            </div>
          ))}</div>
        )}
      </div>

      <div className="w-full sm:w-80 sm:shrink-0 sm:sticky sm:top-20">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><PackagePlus size={16} className="brand-accent" /> Carico magazzino {totalPieces ? <span className="text-xs font-normal text-stone-400">· {totalPieces} pz</span> : null}</h3>
          {done && list.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 mb-3">
              <div className="flex items-center gap-1.5 font-medium"><Check size={15} /> Carico registrato · {done.items.reduce((a, it) => a + it.qty, 0)} pz</div>
              <button onClick={() => setDone(null)} className="text-xs font-medium text-green-700 mt-1 hover:underline">Nuovo carico</button>
            </div>
          ) : null}
          {list.length === 0 ? <p className="text-sm text-stone-400 text-center py-6">Tocca un prodotto per aggiungerlo al carico.</p> : (
            <>
              <div>{list.map((it, i) => (
                <div key={i} className="flex items-center gap-2 py-2 border-b border-stone-100 last:border-0">
                  <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{it.name}</div><div className="text-xs text-stone-400">{it.label}</div></div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => changeQty(i, -1)} className="w-6 h-6 rounded-md border border-stone-300 flex items-center justify-center text-stone-500 hover:bg-stone-50"><Minus size={13} /></button>
                    <input value={it.qty} onChange={(e) => setQtyDirect(i, e.target.value)} className="w-10 text-center text-sm font-medium border border-stone-200 rounded-md py-0.5 brand-ring" />
                    <button onClick={() => changeQty(i, 1)} className="w-6 h-6 rounded-md border border-stone-300 flex items-center justify-center text-stone-500 hover:bg-stone-50"><Plus size={13} /></button>
                  </div>
                  <button onClick={() => removeItem(i)} className="text-stone-300 hover:text-red-500"><X size={15} /></button>
                </div>
              ))}</div>
              <div className="border-t border-stone-200 pt-3 mt-2 space-y-3">
                <div className="flex items-center justify-between font-semibold"><span>Pezzi totali</span><span className="text-lg">{totalPieces}</span></div>
                <button onClick={confirm} className="w-full brand-bg font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"><PackagePlus size={16} /> Registra carico</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
