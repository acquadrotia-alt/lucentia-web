// ============================================================================
// AREA ARTICOLI: catalogo, documenti di carico e magazzino (modulo vendite).
//
// · Catalogo: categorie, prodotti con i loro formati, prezzi e foto.
// · Carichi: ogni rifornimento è un DOCUMENTO, come in un negozio — fornitore,
//   tipo e numero del documento (bolla/DDT o fattura), data, righe con quantità
//   e costo. Resta nello storico (`sales`, record `type: "load"`) e alza le
//   giacenze. Con il modulo fatture, un carico può partire da una fattura del
//   fornitore scaricata da Effatta (`acquisti`).
// · Magazzino: tutte le giacenze in una tabella, con scorta minima, valore,
//   filtri, rettifiche d'inventario (record `type: "rettifica"`) ed esportazione.
// ============================================================================
import { useState, useMemo } from "react";
import { Plus, Trash2, Check, ChevronRight, X, Image as ImageIcon, Search, Package, Tag, Minus, Boxes, Layers, PackagePlus, Truck, Warehouse, AlertTriangle, Download, FileText, ClipboardList, SlidersHorizontal, ShoppingCart, Send, Printer, Wand2, Mail } from "lucide-react";
import { uid, eur, fmtDateTime, fileToSquareDataURL, todayStr, useMods, Field, registraAttivita } from "./comuni.jsx";
import { gmailApi } from "./google.jsx";

// Carico magazzino: incrementa le giacenze (qty negativa = rettifica in meno).
export function applyLoadToCatalog(catalog, items) {
  const products = catalog.products.map((p) => {
    if (!items.some((it) => it.productId === p.id)) return p;
    const formats = p.formats.map((f) => { const it = items.find((x) => x.productId === p.id && x.formatId === f.id); return it ? { ...f, stock: Math.max(0, (Number(f.stock) || 0) + it.qty) } : f; });
    return { ...p, formats };
  });
  return { ...catalog, products };
}
export const TIPI_DOC_CARICO = [["ddt", "Bolla / DDT"], ["fattura", "Fattura"], ["scontrino", "Scontrino"], ["altro", "Altro"]];
export const etichettaDocCarico = (r) => { const t = (TIPI_DOC_CARICO.find((x) => x[0] === r.docTipo) || [])[1]; return [t, r.docNumero ? `n. ${r.docNumero}` : "", r.docData ? `del ${String(r.docData).split("-").reverse().join("/")}` : ""].filter(Boolean).join(" "); };
const scortaMinDi = (catalog, f) => (f.scortaMin != null && f.scortaMin !== "" ? Number(f.scortaMin) : Number(catalog.scortaMin != null ? catalog.scortaMin : 2)) || 0;

export function ArticoliView({ catalog, setCatalog, sales, setSales, loyalty, acquisti, demo, sezione, setSezione, branding = null }) {
  const lock = (node) => (
    <div>
      <div className="mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" /> In demo il magazzino è <b>visibile ma non modificabile</b>.</div>
      <fieldset disabled style={{ border: 0, margin: 0, padding: 0, minInlineSize: "auto" }}>{node}</fieldset>
    </div>
  );
  const wrap = (node) => (demo ? lock(node) : node);
  return (
    <>
      {sezione === "catalogo" ? wrap(<CatalogTab catalog={catalog} setCatalog={setCatalog} loyalty={loyalty} />) : null}
      {sezione === "carichi" ? wrap(<CarichiTab catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} acquisti={acquisti} />) : null}
      {sezione === "magazzino" ? wrap(<MagazzinoTab catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} onVaiACarichi={() => setSezione("carichi")} />) : null}
      {sezione === "ordini" ? wrap(<OrdiniTab catalog={catalog} setCatalog={setCatalog} sales={sales} setSales={setSales} branding={branding} />) : null}
    </>
  );
}

// ---- Catalogo --------------------------------------------------------------
export function CatalogTab({ catalog, setCatalog, loyalty }) {
  const cats = catalog.categories;
  const setCats = (categories) => setCatalog({ ...catalog, categories });
  const setProds = (products) => setCatalog({ ...catalog, products });
  const [newCat, setNewCat] = useState("");
  const [q, setQ] = useState("");
  const addCat = () => { const n = newCat.trim(); if (!n) return; setCats([...cats, { id: uid(), name: n }]); setNewCat(""); };
  const renameCat = (id, name) => setCats(cats.map((c) => (c.id === id ? { ...c, name } : c)));
  const delCat = (id) => { if (!confirm("Eliminare la categoria? I prodotti resteranno senza categoria.")) return; setCatalog({ ...catalog, categories: cats.filter((c) => c.id !== id), products: catalog.products.map((p) => (p.categoryId === id ? { ...p, categoryId: "" } : p)) }); };
  const addProduct = () => setProds([{ id: uid(), name: "Nuovo prodotto", description: "", categoryId: cats[0] ? cats[0].id : "", formats: [{ id: uid(), label: "Standard", price: 0, stock: 0 }], _nuovo: true }, ...catalog.products]);
  const editProduct = (id, patch) => setProds(catalog.products.map((p) => (p.id === id ? { ...p, ...patch, _nuovo: undefined } : p)));
  const delProduct = (id) => { if (confirm("Eliminare questo prodotto?")) setProds(catalog.products.filter((p) => p.id !== id)); };
  const visibili = catalog.products.filter((p) => !q || `${p.name} ${p.description || ""}`.toLowerCase().includes(q.toLowerCase()));
  const groups = [...cats, { id: "", name: "Senza categoria" }].map((c) => ({ cat: c, items: visibili.filter((p) => (p.categoryId || "") === c.id) })).filter((g) => g.items.length);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h3 className="font-semibold flex items-center gap-2 text-stone-900 tracking-tight"><Package size={16} className="brand-accent" /> Prodotti <span className="text-xs font-normal text-stone-400">{catalog.products.length}</span></h3>
          <button onClick={addProduct} className="flex items-center gap-1 text-sm brand-bg px-3 py-1.5 rounded-lg"><Plus size={15} /> Nuovo prodotto</button>
        </div>
        <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 bg-white brand-ring mb-3"><Search size={16} className="text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nel catalogo" className="flex-1 text-sm focus:outline-none" />{q ? <button onClick={() => setQ("")} className="text-stone-300 hover:text-stone-500"><X size={15} /></button> : null}</div>
        {catalog.products.length === 0 ? <div className="lc-card p-10 text-center text-stone-400">Nessun prodotto. Premi «Nuovo prodotto».</div> : groups.length === 0 ? <div className="lc-card p-10 text-center text-stone-400">Nessun prodotto corrisponde alla ricerca.</div> : groups.map((g) => (
          <div key={g.cat.id || "none"} className="mb-4">
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">{g.cat.name} <span className="normal-case tracking-normal text-stone-300">· {g.items.length}</span></div>
            <div className="space-y-2">{g.items.map((p) => <ProductEditor key={p.id} product={p} categories={cats} loyalty={loyalty} catalog={catalog} onChange={(patch) => editProduct(p.id, patch)} onDelete={() => delProduct(p.id)} />)}</div>
          </div>
        ))}
      </section>
      <section className="lc-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-1 text-stone-900 tracking-tight"><Layers size={16} className="brand-accent" /> Categorie</h3>
        <p className="text-xs text-stone-400 mb-3">Servono a raggruppare i prodotti in cassa, nel magazzino e sul sito.</p>
        <div className="space-y-2">{cats.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <input value={c.name} onChange={(e) => renameCat(c.id, e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" />
            <span className="text-xs text-stone-400 w-16 text-right">{catalog.products.filter((p) => p.categoryId === c.id).length} prod.</span>
            <button onClick={() => delCat(c.id)} className="p-2 text-stone-400 hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        ))}</div>
        <div className="flex gap-2 mt-3"><input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCat()} placeholder="Nuova categoria" className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /><button onClick={addCat} className="brand-bg px-3 py-2 rounded-lg text-sm inline-flex items-center gap-1"><Plus size={15} /> Aggiungi</button></div>
      </section>
    </div>
  );
}

export function ProductEditor({ product, categories, loyalty, catalog, onChange, onDelete }) {
  const F = useMods();
  const [open, setOpen] = useState(!!product._nuovo);
  const p = product;
  const setFormat = (fid, patch) => onChange({ formats: p.formats.map((f) => (f.id === fid ? { ...f, ...patch } : f)) });
  const addFormat = () => onChange({ formats: [...p.formats, { id: uid(), label: "Nuovo formato", price: 0, stock: 0 }] });
  const delFormat = (fid) => { if (p.formats.length <= 1) return; onChange({ formats: p.formats.filter((f) => f.id !== fid) }); };
  const totalStock = p.formats.reduce((a, f) => a + (Number(f.stock) || 0), 0);
  const sotto = catalog ? p.formats.some((f) => (Number(f.stock) || 0) <= scortaMinDi(catalog, f)) : false;
  const prices = p.formats.map((f) => Number(f.price) || 0);
  const priceLabel = prices.length ? (Math.min(...prices) === Math.max(...prices) ? eur(prices[0]) : `${eur(Math.min(...prices))} – ${eur(Math.max(...prices))}`) : "";
  const inp = "w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring";
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-3 text-left">
        {p.foto ? <img src={p.foto} alt="" className="w-10 h-10 rounded-lg object-cover ring-1 ring-stone-200 shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0"><Package size={17} className="text-stone-300" /></div>}
        <div className="flex-1 min-w-0"><div className="font-medium truncate">{p.name}</div><div className="text-xs text-stone-400">{priceLabel} · {p.formats.length} format{p.formats.length === 1 ? "o" : "i"} · giacenza {totalStock} pz{sotto ? <span className="text-amber-600 font-medium"> · sotto scorta</span> : null}</div></div>
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
                <Field label="Nome"><input value={p.name} autoFocus={!!p._nuovo} onFocus={(e) => p._nuovo && e.target.select()} onChange={(e) => onChange({ name: e.target.value })} className={inp} /></Field>
                <Field label="Categoria"><select value={p.categoryId || ""} onChange={(e) => onChange({ categoryId: e.target.value })} className={`${inp} bg-white`}><option value="">Senza categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              </div>
              {p.foto ? <button type="button" onClick={() => onChange({ foto: null })} className="text-xs text-stone-400 hover:text-red-500 flex items-center gap-1"><Trash2 size={12} /> Rimuovi foto</button> : null}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Descrizione (interna)"><input value={p.description || ""} onChange={(e) => onChange({ description: e.target.value })} placeholder="Breve descrizione" className={inp} /></Field>
            <div className="grid grid-cols-[1fr_7rem] gap-3"><Field label="Marca / fornitore abituale"><input value={p.marca || ""} onChange={(e) => onChange({ marca: e.target.value })} placeholder="Es. Davines" className={inp} /></Field><Field label="IVA (scontrino)"><select value={p.aliquota || ""} onChange={(e) => onChange({ aliquota: e.target.value })} className={`${inp} bg-white`}><option value="">Predefinita</option><option value="22">22%</option><option value="10">10%</option><option value="5">5%</option><option value="4">4%</option><option value="N2.2">Senza IVA</option></select></Field></div>
          </div>
          <Field label="Descrizione per il sito · visibile solo ai clienti online"><textarea value={p.descrizioneSito || ""} onChange={(e) => onChange({ descrizioneSito: e.target.value })} rows={2} placeholder="Es. Idratazione profonda per capelli secchi e trattati, con olio di argan. Profumo delicato." className={inp} /></Field>
          {F.fidelity && loyalty && loyalty.fromSales ? <Field label="Punti fedeltà per pezzo venduto"><div className="flex items-center gap-1"><input type="number" min={0} step={1} value={p.points != null ? p.points : 0} onChange={(e) => onChange({ points: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="w-24 px-3 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" /><span className="text-xs text-stone-400">punti</span></div></Field> : null}
          <div>
            <div className="grid grid-cols-[1fr_5.5rem_5.5rem_4.5rem_4.5rem_2rem] gap-2 text-[10px] font-medium text-stone-400 uppercase tracking-wide mb-1.5 px-0.5"><span>Formato</span><span className="text-right">Prezzo €</span><span className="text-right">Costo €</span><span className="text-right">Giac.</span><span className="text-right" title="Sotto questa quantità il prodotto risulta sotto scorta">Scorta min</span><span /></div>
            <div className="space-y-2">{p.formats.map((f) => (
              <div key={f.id} className="grid grid-cols-[1fr_5.5rem_5.5rem_4.5rem_4.5rem_2rem] gap-2 items-center">
                <input value={f.label} onChange={(e) => setFormat(f.id, { label: e.target.value })} placeholder="es. 300 ml" className="min-w-0 px-2 py-1.5 rounded-lg border border-stone-300 text-sm brand-ring" />
                <input type="number" min={0} step={0.5} value={f.price} onChange={(e) => setFormat(f.id, { price: Math.max(0, Number(e.target.value) || 0) })} className="px-2 py-1.5 rounded-lg border border-stone-300 text-sm text-right brand-ring" />
                <input type="number" min={0} step={0.01} value={f.costo != null ? f.costo : ""} placeholder="—" onChange={(e) => setFormat(f.id, { costo: e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0) })} className="px-2 py-1.5 rounded-lg border border-stone-300 text-sm text-right brand-ring" />
                <input type="number" min={0} step={1} value={f.stock} onChange={(e) => setFormat(f.id, { stock: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="px-2 py-1.5 rounded-lg border border-stone-300 text-sm text-right brand-ring" />
                <input type="number" min={0} step={1} value={f.scortaMin != null ? f.scortaMin : ""} placeholder={String(catalog && catalog.scortaMin != null ? catalog.scortaMin : 2)} onChange={(e) => setFormat(f.id, { scortaMin: e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="px-2 py-1.5 rounded-lg border border-stone-300 text-sm text-right brand-ring" />
                <button onClick={() => delFormat(f.id)} disabled={p.formats.length <= 1} className="p-1.5 text-stone-400 hover:text-red-500 disabled:opacity-30"><Trash2 size={15} /></button>
              </div>
            ))}</div>
            <button onClick={addFormat} className="text-xs brand-accent hover:opacity-70 flex items-center gap-0.5 mt-2"><Plus size={13} /> formato</button>
            <p className="text-[11px] text-stone-400 mt-2">La giacenza si aggiorna da sola con vendite, carichi e rettifiche: modificala a mano solo per correggere. Il costo serve al valore del magazzino.</p>
          </div>
          <button onClick={onDelete} className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 size={13} /> Elimina prodotto</button>
        </div>
      ) : null}
    </div>
  );
}

// ---- Carichi: documenti di rifornimento -----------------------------------
export function CarichiTab({ catalog, setCatalog, sales, setSales, acquisti }) {
  const [nuovo, setNuovo] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [q, setQ] = useState("");
  const [bozza, setBozza] = useState(null);
  const carichi = useMemo(() => (sales || []).filter((r) => r.type === "load" && (!q || `${r.fornitore || ""} ${r.docNumero || ""} ${(r.items || []).map((i) => i.name).join(" ")}`.toLowerCase().includes(q.toLowerCase()))), [sales, q]);
  const fornitori = useMemo(() => [...new Set((sales || []).filter((r) => r.type === "load" && r.fornitore).map((r) => r.fornitore.trim()))].sort(), [sales]);
  const registra = (rec) => { setCatalog(applyLoadToCatalog(catalog, rec.items)); setSales([rec, ...(sales || [])]); setNuovo(false); setBozza(null); setOpenId(rec.id); };
  const annulla = (rec) => {
    if (!confirm("Annullare questo carico? Le quantità verranno tolte dalle giacenze.")) return;
    setCatalog(applyLoadToCatalog(catalog, rec.items.map((it) => ({ ...it, qty: -it.qty }))));
    setSales((sales || []).map((r) => (r.id === rec.id ? { ...r, annullato: true, annullatoIl: Date.now() } : r)));
  };
  // un carico che parte da una fattura del fornitore (modulo fatture)
  const daAcquisto = (a) => { setBozza({ fornitore: a.fornitore.denominazione, docTipo: a.tipo === "TD04" ? "altro" : "fattura", docNumero: a.numero, docData: a.data, acquistoId: a.id, righeFattura: a.righe || [] }); setNuovo(true); };
  const giaCaricati = new Set((sales || []).filter((r) => r.type === "load" && r.acquistoId && !r.annullato).map((r) => r.acquistoId));
  const daCaricare = (acquisti || []).filter((a) => !giaCaricati.has(a.id)).slice(0, 8);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h3 className="font-semibold flex items-center gap-2 text-stone-900 tracking-tight"><Truck size={16} className="brand-accent" /> Documenti di carico</h3><p className="text-xs text-stone-400 mt-0.5">Ogni rifornimento è un documento: fornitore, bolla o fattura, righe e quantità. Le giacenze salgono da sole.</p></div>
        <button onClick={() => { setNuovo(!nuovo); setBozza(null); }} className="flex items-center gap-1.5 text-sm font-medium brand-bg px-3.5 py-2 rounded-lg shadow-[var(--lc-shadow-xs)]">{nuovo ? <X size={15} /> : <Plus size={15} />} {nuovo ? "Chiudi" : "Nuovo carico"}</button>
      </div>
      {nuovo ? <CaricoForm catalog={catalog} fornitori={fornitori} bozza={bozza} onSave={registra} onClose={() => { setNuovo(false); setBozza(null); }} /> : null}
      {!nuovo && daCaricare.length ? (
        <div className="lc-card p-4">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><FileText size={13} /> Fatture dei fornitori senza carico</div>
          <div className="space-y-1.5">{daCaricare.map((a) => (
            <div key={a.id} className="flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0 truncate"><span className="font-medium">{a.fornitore && a.fornitore.denominazione}</span> <span className="text-stone-400">· n. {a.numero} del {String(a.data).split("-").reverse().join("/")} · {eur(a.totale)}</span></div>
              <button onClick={() => daAcquisto(a)} className="text-xs font-medium border brand-border brand-accent bg-white px-2.5 py-1.5 rounded-lg hover:brand-soft shrink-0">Registra il carico</button>
            </div>))}</div>
        </div>
      ) : null}
      <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 bg-white brand-ring"><Search size={16} className="text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per fornitore, numero documento o prodotto" className="flex-1 text-sm focus:outline-none" /></div>
      {carichi.length === 0 ? <div className="lc-card p-10 text-center text-stone-400 text-sm">Nessun carico registrato{q ? " per questa ricerca" : ""}.</div> : (
        <div className="space-y-2">{carichi.map((r) => { const open = openId === r.id; const pezzi = (r.items || []).reduce((a, it) => a + it.qty, 0); const costo = (r.items || []).reduce((a, it) => a + (Number(it.costo) || 0) * it.qty, 0); return (
          <div key={r.id} className={`bg-white rounded-xl border shadow-sm ${r.annullato ? "border-stone-200/70 opacity-60" : "border-stone-200"}`}>
            <button onClick={() => setOpenId(open ? null : r.id)} className="w-full flex items-center gap-3 p-3 text-left">
              <Truck size={18} className="text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2 flex-wrap"><span>{r.fornitore || "Carico manuale"}</span><span className="text-xs text-stone-400 font-normal">· {pezzi} pz</span>{costo ? <span className="text-xs text-stone-400 font-normal">· {eur(costo)}</span> : null}{r.annullato ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">Annullato</span> : null}</div>
                <div className="text-xs text-stone-400 truncate">{etichettaDocCarico(r) || "senza riferimento"} · registrato il {fmtDateTime(r.ts)}</div>
              </div>
              <ChevronRight size={18} className={`text-stone-300 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
            </button>
            {open ? (
              <div className="px-3 pb-3 border-t border-stone-100 pt-2 space-y-2">
                <div className="space-y-1 text-sm">{(r.items || []).map((it, i) => <div key={i} className="flex justify-between gap-2"><span className="text-stone-600">+{it.qty} {it.name}{it.label ? ` (${it.label})` : ""}</span><span className="text-stone-500 shrink-0">{it.costo != null ? `${eur(it.costo)} × ${it.qty}` : ""}</span></div>)}</div>
                {r.note ? <div className="text-xs text-stone-500">{r.note}</div> : null}
                {!r.annullato ? <button onClick={() => annulla(r)} className="text-xs text-stone-500 hover:text-red-600 inline-flex items-center gap-1"><Trash2 size={13} /> Annulla carico</button> : null}
              </div>
            ) : null}
          </div>
        ); })}</div>
      )}
    </div>
  );
}

export function CaricoForm({ catalog, fornitori, bozza, onSave, onClose }) {
  const cats = catalog.categories;
  const [doc, setDoc] = useState({ fornitore: "", docTipo: "ddt", docNumero: "", docData: todayStr(), note: "", ...(bozza || {}) });
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const products = catalog.products.filter((p) => (cat === "all" || (p.categoryId || "") === cat) && (!q || `${p.name} ${p.marca || ""}`.toLowerCase().includes(q.toLowerCase())));
  const inList = (pid, fid) => { const it = list.find((x) => x.productId === pid && x.formatId === fid); return it ? it.qty : 0; };
  const add = (p, f) => setList((c) => { const ex = c.find((x) => x.productId === p.id && x.formatId === f.id); if (ex) return c.map((x) => (x === ex ? { ...x, qty: x.qty + 1 } : x)); return [...c, { productId: p.id, formatId: f.id, name: p.name, label: f.label, qty: 1, costo: f.costo != null ? f.costo : null }]; });
  const setItem = (idx, patch) => setList((c) => c.map((it, i) => (i === idx ? { ...it, ...patch } : it)).filter((it) => it.qty > 0));
  const totalPieces = list.reduce((a, it) => a + it.qty, 0);
  const totalCosto = list.reduce((a, it) => a + (Number(it.costo) || 0) * it.qty, 0);
  const salva = () => {
    if (!list.length) return;
    onSave({ id: uid(), ts: Date.now(), type: "load", fornitore: doc.fornitore.trim(), docTipo: doc.docTipo, docNumero: doc.docNumero.trim(), docData: doc.docData, note: doc.note.trim(), acquistoId: doc.acquistoId || null, items: list.map((it) => ({ productId: it.productId, formatId: it.formatId, name: it.name, label: it.label, qty: it.qty, costo: it.costo != null && it.costo !== "" ? Number(it.costo) : null })), total: 0, costoTotale: Math.round(totalCosto * 100) / 100 });
  };
  const inp = "w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring";
  const chip = (on) => `shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border transition whitespace-nowrap ${on ? "brand-soft brand-text border-transparent" : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"}`;
  return (
    <section className="lc-card p-5 space-y-4">
      <h3 className="font-semibold flex items-center gap-2 text-stone-900 tracking-tight"><PackagePlus size={16} className="brand-accent" /> Nuovo documento di carico</h3>
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2"><Field label="Fornitore"><input list="lc-fornitori" value={doc.fornitore} onChange={(e) => setDoc({ ...doc, fornitore: e.target.value })} placeholder="Es. Cosmetici Nord" className={inp} /><datalist id="lc-fornitori">{fornitori.map((f) => <option key={f} value={f} />)}</datalist></Field></div>
        <Field label="Documento"><select value={doc.docTipo} onChange={(e) => setDoc({ ...doc, docTipo: e.target.value })} className={`${inp} bg-white`}>{TIPI_DOC_CARICO.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Numero"><input value={doc.docNumero} onChange={(e) => setDoc({ ...doc, docNumero: e.target.value })} placeholder="n. bolla / fattura" className={inp} /></Field>
        <Field label="Data documento"><input type="date" value={doc.docData} onChange={(e) => setDoc({ ...doc, docData: e.target.value })} className={inp} /></Field>
        <div className="sm:col-span-3"><Field label="Note"><input value={doc.note} onChange={(e) => setDoc({ ...doc, note: e.target.value })} placeholder="Es. manca un pezzo, arriva la settimana prossima" className={inp} /></Field></div>
      </div>
      {doc.righeFattura && doc.righeFattura.length ? <div className="rounded-xl bg-stone-50 p-3 text-xs text-stone-500"><div className="font-medium text-stone-600 mb-1">Righe della fattura del fornitore (per riferimento)</div>{doc.righeFattura.slice(0, 12).map((r, i) => <div key={i}>{r.qta}× {r.descrizione}{r.totale ? ` · ${eur(r.totale)}` : ""}</div>)}</div> : null}

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="w-full lg:flex-1 lg:min-w-0 space-y-3">
          <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 bg-white brand-ring"><Search size={16} className="text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca il prodotto da caricare" className="flex-1 text-sm focus:outline-none" /></div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5"><button onClick={() => setCat("all")} className={chip(cat === "all")}>Tutti</button>{cats.map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={chip(cat === c.id)}>{c.name}</button>)}</div>
          {products.length === 0 ? <div className="lc-card p-8 text-center text-stone-400 text-sm">Nessun prodotto. Aggiungilo dal Catalogo.</div> : (
            <div className="grid sm:grid-cols-2 gap-3">{products.map((p) => (
              <div key={p.id} className="lc-card p-3">
                <div className="font-medium leading-tight">{p.name}</div>
                <div className="text-xs text-stone-400 mb-2 mt-0.5">{p.marca || p.description || " "}</div>
                <div className="space-y-1.5">{p.formats.map((f) => { const added = inList(p.id, f.id); return (
                  <button key={f.id} onClick={() => add(p, f)} className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-sm transition ${added ? "brand-border brand-soft" : "border-stone-200 brand-hover"}`}>
                    <span className="flex items-center gap-1.5 min-w-0"><Tag size={13} className="brand-accent shrink-0" /> <span className="truncate">{f.label}</span></span>
                    <span className="flex items-center gap-2 shrink-0"><span className="text-xs text-stone-400">giac. {Number(f.stock) || 0}{added ? ` +${added}` : ""}</span><PackagePlus size={15} className="brand-accent" /></span>
                  </button>
                ); })}</div>
              </div>
            ))}</div>
          )}
        </div>
        <div className="w-full lg:w-96 lg:shrink-0 lg:sticky lg:top-20">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
            <h4 className="font-semibold flex items-center gap-2 mb-3 text-sm"><ClipboardList size={15} className="brand-accent" /> Righe del documento {totalPieces ? <span className="text-xs font-normal text-stone-400">· {totalPieces} pz</span> : null}</h4>
            {list.length === 0 ? <p className="text-sm text-stone-400 text-center py-6">Tocca un formato per aggiungerlo.</p> : (
              <>
                <div className="grid grid-cols-[1fr_6.5rem_5rem_1.5rem] gap-2 text-[10px] font-medium text-stone-400 uppercase tracking-wide mb-1"><span>Prodotto</span><span className="text-center">Quantità</span><span className="text-right">Costo €</span><span /></div>
                <div>{list.map((it, i) => (
                  <div key={i} className="grid grid-cols-[1fr_6.5rem_5rem_1.5rem] gap-2 items-center py-2 border-b border-stone-100 last:border-0">
                    <div className="min-w-0"><div className="text-sm font-medium truncate">{it.name}</div><div className="text-xs text-stone-400 truncate">{it.label}</div></div>
                    <div className="flex items-center gap-1 justify-center">
                      <button onClick={() => setItem(i, { qty: it.qty - 1 })} className="w-6 h-6 rounded-md border border-stone-300 flex items-center justify-center text-stone-500 hover:bg-stone-50"><Minus size={13} /></button>
                      <input value={it.qty} onChange={(e) => setItem(i, { qty: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="w-10 text-center text-sm font-medium border border-stone-200 rounded-md py-0.5 brand-ring" />
                      <button onClick={() => setItem(i, { qty: it.qty + 1 })} className="w-6 h-6 rounded-md border border-stone-300 flex items-center justify-center text-stone-500 hover:bg-stone-50"><Plus size={13} /></button>
                    </div>
                    <input type="number" min={0} step={0.01} value={it.costo != null ? it.costo : ""} placeholder="—" onChange={(e) => setItem(i, { costo: e.target.value === "" ? null : Number(e.target.value) })} className="px-2 py-1 rounded-md border border-stone-200 text-sm text-right brand-ring" />
                    <button onClick={() => setItem(i, { qty: 0 })} className="text-stone-300 hover:text-red-500"><X size={15} /></button>
                  </div>
                ))}</div>
                <div className="border-t border-stone-200 pt-3 mt-2 space-y-2">
                  <div className="flex items-center justify-between text-sm"><span className="text-stone-500">Pezzi</span><span className="font-semibold">{totalPieces}</span></div>
                  {totalCosto ? <div className="flex items-center justify-between text-sm"><span className="text-stone-500">Costo merce</span><span className="font-semibold">{eur(totalCosto)}</span></div> : null}
                  <button onClick={salva} className="w-full brand-bg font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 mt-1"><Check size={16} /> Registra carico</button>
                  <button onClick={onClose} className="w-full text-sm text-stone-500 py-1.5 hover:text-stone-700">Annulla</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- Magazzino: le giacenze a colpo d'occhio --------------------------------
export function MagazzinoTab({ catalog, setCatalog, sales, setSales, onVaiACarichi }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [solo, setSolo] = useState("tutti"); // tutti | sotto | esauriti
  const [ordina, setOrdina] = useState("nome");
  const [rett, setRett] = useState(null); // { productId, formatId, name, label, stock } in rettifica
  const [rettQta, setRettQta] = useState("");
  const [rettMotivo, setRettMotivo] = useState("");
  const [rettifiche, setRettifiche] = useState(false);
  const ultimoCarico = useMemo(() => { const m = {}; (sales || []).forEach((r) => { if (r.type === "load" && !r.annullato) (r.items || []).forEach((it) => { const k = it.productId + "|" + it.formatId; if (!m[k] || r.ts > m[k]) m[k] = r.ts; }); }); return m; }, [sales]);
  const righe = useMemo(() => {
    const out = [];
    for (const p of catalog.products) for (const f of p.formats) {
      const stock = Number(f.stock) || 0, min = scortaMinDi(catalog, f);
      out.push({ productId: p.id, formatId: f.id, name: p.name, label: f.label, marca: p.marca || "", categoryId: p.categoryId || "", categoria: (catalog.categories.find((c) => c.id === p.categoryId) || {}).name || "Senza categoria", stock, min, price: Number(f.price) || 0, costo: f.costo != null ? Number(f.costo) : null, valore: stock * (Number(f.price) || 0), valoreCosto: f.costo != null ? stock * Number(f.costo) : null, sotto: stock <= min, esaurito: stock <= 0, ultimo: ultimoCarico[p.id + "|" + f.id] || 0 });
    }
    return out;
  }, [catalog, ultimoCarico]);
  const visibili = righe.filter((r) => (cat === "all" || r.categoryId === cat) && (solo === "tutti" || (solo === "sotto" ? r.sotto : r.esaurito)) && (!q || `${r.name} ${r.label} ${r.marca}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => ordina === "giacenza" ? a.stock - b.stock : ordina === "valore" ? b.valore - a.valore : ordina === "categoria" ? (a.categoria + a.name).localeCompare(b.categoria + b.name) : a.name.localeCompare(b.name) || a.label.localeCompare(b.label));
  const tot = { pezzi: righe.reduce((a, r) => a + r.stock, 0), valore: righe.reduce((a, r) => a + r.valore, 0), valoreCosto: righe.reduce((a, r) => a + (r.valoreCosto || 0), 0), sotto: righe.filter((r) => r.sotto && !r.esaurito).length, esauriti: righe.filter((r) => r.esaurito).length };
  const apriRett = (r) => { setRett(r); setRettQta(String(r.stock)); setRettMotivo(""); };
  const salvaRett = () => {
    const nuova = Math.max(0, Math.round(Number(rettQta) || 0)); const delta = nuova - rett.stock;
    if (!delta) { setRett(null); return; }
    setCatalog(applyLoadToCatalog(catalog, [{ productId: rett.productId, formatId: rett.formatId, qty: delta }]));
    setSales([{ id: uid(), ts: Date.now(), type: "rettifica", motivo: rettMotivo.trim(), items: [{ productId: rett.productId, formatId: rett.formatId, name: rett.name, label: rett.label, qty: delta, prima: rett.stock, dopo: nuova }], total: 0 }, ...(sales || [])]);
    setRett(null);
  };
  const esporta = () => {
    const righeCsv = [["Prodotto", "Formato", "Categoria", "Marca", "Giacenza", "Scorta minima", "Prezzo", "Costo", "Valore al prezzo"].join(";"), ...visibili.map((r) => [r.name, r.label, r.categoria, r.marca, r.stock, r.min, r.price.toFixed(2).replace(".", ","), r.costo != null ? r.costo.toFixed(2).replace(".", ",") : "", r.valore.toFixed(2).replace(".", ",")].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(";"))];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + righeCsv.join("\n")], { type: "text/csv;charset=utf-8" })); a.download = `magazzino-${todayStr()}.csv`; a.click();
  };
  const elencoRett = (sales || []).filter((r) => r.type === "rettifica").slice(0, 30);
  const chip = (on) => `shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border transition whitespace-nowrap ${on ? "brand-soft brand-text border-transparent" : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"}`;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="lc-card p-4"><div className="text-xs text-stone-400 uppercase tracking-wide">Pezzi in magazzino</div><div className="text-xl font-semibold">{tot.pezzi}</div><div className="text-xs text-stone-400">{righe.length} referenze</div></div>
        <div className="lc-card p-4"><div className="text-xs text-stone-400 uppercase tracking-wide">Valore al prezzo</div><div className="text-xl font-semibold">{eur(tot.valore)}</div><div className="text-xs text-stone-400">{tot.valoreCosto ? `al costo ${eur(tot.valoreCosto)}` : "costo non inserito"}</div></div>
        <button onClick={() => setSolo(solo === "sotto" ? "tutti" : "sotto")} className={`lc-card p-4 text-left transition ${solo === "sotto" ? "brand-border" : "lc-card-hover"}`}><div className="text-xs text-stone-400 uppercase tracking-wide">Sotto scorta</div><div className={`text-xl font-semibold ${tot.sotto ? "text-amber-600" : ""}`}>{tot.sotto}</div><div className="text-xs text-stone-400">da riordinare</div></button>
        <button onClick={() => setSolo(solo === "esauriti" ? "tutti" : "esauriti")} className={`lc-card p-4 text-left transition ${solo === "esauriti" ? "brand-border" : "lc-card-hover"}`}><div className="text-xs text-stone-400 uppercase tracking-wide">Esauriti</div><div className={`text-xl font-semibold ${tot.esauriti ? "text-red-600" : ""}`}>{tot.esauriti}</div><div className="text-xs text-stone-400">non vendibili</div></button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 bg-white brand-ring flex-1 min-w-[12rem]"><Search size={16} className="text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca prodotto, formato o marca" className="flex-1 text-sm focus:outline-none" /></div>
        <select value={ordina} onChange={(e) => setOrdina(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring"><option value="nome">Per nome</option><option value="categoria">Per categoria</option><option value="giacenza">Giacenza crescente</option><option value="valore">Valore decrescente</option></select>
        <label className="flex items-center gap-1.5 text-sm text-stone-600 border border-stone-300 rounded-lg px-3 py-2 bg-white" title="Sotto questa quantità un formato risulta sotto scorta, se non ha una soglia sua"><SlidersHorizontal size={14} className="text-stone-400" /> Scorta min. <input type="number" min={0} value={catalog.scortaMin != null ? catalog.scortaMin : 2} onChange={(e) => setCatalog({ ...catalog, scortaMin: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="w-12 text-right text-sm focus:outline-none" /></label>
        <button onClick={esporta} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Download size={14} /> CSV</button>
        <button onClick={onVaiACarichi} className="text-sm font-medium brand-bg px-3 py-2 rounded-lg inline-flex items-center gap-1.5"><PackagePlus size={14} /> Carico</button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5"><button onClick={() => setCat("all")} className={chip(cat === "all")}>Tutte le categorie</button>{catalog.categories.map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={chip(cat === c.id)}>{c.name}</button>)}</div>
      {visibili.length === 0 ? <div className="lc-card p-10 text-center text-stone-400 text-sm">Nessuna referenza{solo !== "tutti" || q ? " per questi filtri" : ""}.</div> : (
        <div className="lc-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[42rem]">
              <thead><tr className="text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-100"><th className="text-left font-medium px-3 py-2">Prodotto</th><th className="text-left font-medium px-3 py-2">Categoria</th><th className="text-right font-medium px-3 py-2">Giacenza</th><th className="text-right font-medium px-3 py-2">Prezzo</th><th className="text-right font-medium px-3 py-2">Valore</th><th className="text-left font-medium px-3 py-2">Ultimo carico</th><th className="px-3 py-2" /></tr></thead>
              <tbody>{visibili.map((r) => (
                <tr key={r.productId + r.formatId} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/60">
                  <td className="px-3 py-2"><div className="font-medium text-stone-900">{r.name}</div><div className="text-xs text-stone-400">{r.label}{r.marca ? ` · ${r.marca}` : ""}</div></td>
                  <td className="px-3 py-2 text-stone-500">{r.categoria}</td>
                  <td className="px-3 py-2 text-right tabular-nums"><span className={`inline-flex items-center gap-1 font-semibold ${r.esaurito ? "text-red-600" : r.sotto ? "text-amber-600" : "text-stone-800"}`}>{r.esaurito || r.sotto ? <AlertTriangle size={12} /> : null}{r.stock}</span><div className="text-[10px] text-stone-400">min {r.min}</div></td>
                  <td className="px-3 py-2 text-right tabular-nums text-stone-600">{eur(r.price)}{r.costo != null ? <div className="text-[10px] text-stone-400">costo {eur(r.costo)}</div> : null}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-stone-600">{eur(r.valore)}</td>
                  <td className="px-3 py-2 text-stone-500 text-xs">{r.ultimo ? fmtDateTime(r.ultimo).slice(0, 10) : "—"}</td>
                  <td className="px-3 py-2 text-right"><button onClick={() => apriRett(r)} className="text-xs font-medium border border-stone-300 text-stone-600 px-2.5 py-1 rounded-lg hover:bg-white">Rettifica</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
      <div>
        <button onClick={() => setRettifiche(!rettifiche)} className="text-xs font-medium text-stone-500 hover:text-stone-700 inline-flex items-center gap-1"><ChevronRight size={13} className={`transition ${rettifiche ? "rotate-90" : ""}`} /> Rettifiche d'inventario registrate ({elencoRett.length})</button>
        {rettifiche ? (elencoRett.length === 0 ? <p className="text-xs text-stone-400 mt-2">Nessuna rettifica.</p> : <div className="mt-2 space-y-1">{elencoRett.map((r) => { const it = r.items[0]; return <div key={r.id} className="text-xs text-stone-600 flex flex-wrap gap-x-2"><span className="text-stone-400">{fmtDateTime(r.ts)}</span><span className="font-medium">{it.name} ({it.label})</span><span>{it.prima} → {it.dopo} ({it.qty > 0 ? "+" : ""}{it.qty})</span>{r.motivo ? <span className="text-stone-400">· {r.motivo}</span> : null}</div>; })}</div>) : null}
      </div>
      {rett ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 lc-fade-in" onClick={() => setRett(null)}>
          <div className="lc-card lc-scale-in w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-stone-900 tracking-tight flex items-center gap-2"><Warehouse size={16} className="brand-accent" /> Rettifica giacenza</h3>
            <p className="text-sm text-stone-500 mt-1">{rett.name} · {rett.label}<br />Giacenza attuale: <b>{rett.stock}</b></p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Field label="Giacenza reale"><input type="number" min={0} value={rettQta} onChange={(e) => setRettQta(e.target.value)} autoFocus className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm text-right brand-ring" /></Field>
              <Field label="Differenza"><div className="px-3 py-2 text-sm font-semibold tabular-nums">{(() => { const d = (Number(rettQta) || 0) - rett.stock; return (d > 0 ? "+" : "") + d; })()}</div></Field>
            </div>
            <Field label="Motivo"><input value={rettMotivo} onChange={(e) => setRettMotivo(e.target.value)} placeholder="Es. inventario, rotto, omaggio, uso interno" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring mt-0" /></Field>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={salvaRett} className="brand-bg font-medium py-2.5 rounded-xl flex items-center justify-center gap-1.5"><Check size={15} /> Registra</button>
              <button onClick={() => setRett(null)} className="font-medium py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50">Annulla</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---- Ordini ai fornitori ---------------------------------------------------------
// Un ordine è un record `type: "ordine"` nello storico (`sales`): fornitore,
// righe con quantità e costo, stato (bozza → inviato → ricevuto, o annullato).
// Nasce a mano o dalla proposta «sotto scorta»; si manda per email (modulo
// Google) o si stampa; «Ricevi la merce» registra il carico e alza le giacenze.
export const STATI_ORDINE = { bozza: ["Bozza", "bg-stone-100 text-stone-600"], inviato: ["Inviato", "bg-sky-100 text-sky-700"], ricevuto: ["Ricevuto", "bg-green-100 text-green-700"], annullato: ["Annullato", "bg-stone-100 text-stone-400"] };
// Cosa riordinare: i formati sotto scorta, con la quantità per tornare al doppio della soglia.
export function propostaRiordino(catalog) {
  const out = [];
  for (const p of catalog.products || []) for (const f of p.formats || []) {
    const stock = Number(f.stock) || 0, min = scortaMinDi(catalog, f);
    if (stock > min) continue;
    out.push({ productId: p.id, formatId: f.id, name: p.name, label: f.label, fornitore: p.fornitore || "", qty: Math.max(1, Math.max(min * 2, min + 1) - stock), costo: f.costo != null && f.costo !== "" ? Number(f.costo) : null });
  }
  return out;
}
export function testoOrdine(o, branding) {
  const salone = (branding && branding.name) || "";
  const righe = (o.items || []).map((it) => `· ${it.qty} × ${it.name}${it.label && it.label !== "Standard" ? ` (${it.label})` : ""}${it.codice ? ` · cod. ${it.codice}` : ""}`);
  return `Buongiorno,\n\ncon la presente ordiniamo:\n\n${righe.join("\n")}\n${o.note ? `\nNote: ${o.note}\n` : ""}\nConsegna presso: ${salone}${branding && branding.address ? `, ${branding.address}` : ""}${branding && branding.phone ? ` · tel. ${branding.phone}` : ""}\n\nGrazie,\n${salone}`;
}
export const numeroOrdine = (o) => "ORD-" + String(o.id || "").slice(0, 6).toUpperCase();
export function OrdiniTab({ catalog, setCatalog, sales, setSales, branding }) {
  const F = useMods();
  const [nuovo, setNuovo] = useState(null); // la bozza in modifica
  const [openId, setOpenId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState("");
  const ordini = useMemo(() => (sales || []).filter((r) => r.type === "ordine"), [sales]);
  const fornitori = useMemo(() => { const m = {}; (sales || []).forEach((r) => { if ((r.type === "ordine" || r.type === "load") && r.fornitore) { const k = r.fornitore.trim(); if (!m[k]) m[k] = r.email || ""; else if (!m[k] && r.email) m[k] = r.email; } }); return m; }, [sales]);
  const sotto = useMemo(() => propostaRiordino(catalog), [catalog]);
  const salva = (o) => { const esiste = ordini.some((x) => x.id === o.id); setSales(esiste ? (sales || []).map((r) => (r.id === o.id ? o : r)) : [o, ...(sales || [])]); setNuovo(null); setOpenId(o.id); };
  const patch = (id, p) => setSales((sales || []).map((r) => (r.id === id ? { ...r, ...p } : r)));
  const invia = async (o) => {
    if (!o.email) { setMsg({ ok: false, testo: "Scrivi l'email del fornitore nell'ordine." }); return; }
    setBusy(o.id); setMsg(null);
    const r = await gmailApi("invia", { a: o.email, copiaAMe: true, oggetto: `Ordine ${numeroOrdine(o)} · ${(branding && branding.name) || "salone"}`, testo: testoOrdine(o, branding) });
    setBusy("");
    if (!r.ok) { setMsg({ ok: false, testo: "Email non partita: " + r.error }); return; }
    patch(o.id, { stato: "inviato", inviatoIl: Date.now(), inviatoA: o.email });
    registraAttivita("dati", `Ordine ${numeroOrdine(o)} mandato a ${o.fornitore} (${o.email})`);
    setMsg({ ok: true, testo: `Ordine mandato a ${o.email}.` });
  };
  const stampa = (o) => {
    const esc = (x) => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Ordine ${numeroOrdine(o)}</title><style>body{font-family:Arial,sans-serif;color:#1c1917;font-size:13px;padding:24px}h1{font-size:20px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #d6d3d1;padding:6px 8px;text-align:left}th{background:#f5f5f4;font-size:11px;text-transform:uppercase}td.n{text-align:right}.sub{color:#57534e}</style></head><body><h1>Ordine ${numeroOrdine(o)}</h1><div class="sub">${esc((branding && branding.name) || "")} · ${esc(fmtDateTime(o.ts))}</div><p><b>Fornitore:</b> ${esc(o.fornitore)}${o.email ? ` · ${esc(o.email)}` : ""}</p><table><thead><tr><th>Prodotto</th><th>Formato</th><th class="n">Quantità</th></tr></thead><tbody>${(o.items || []).map((it) => `<tr><td>${esc(it.name)}</td><td>${esc(it.label)}</td><td class="n">${it.qty}</td></tr>`).join("")}</tbody></table>${o.note ? `<p><b>Note:</b> ${esc(o.note)}</p>` : ""}<p class="sub">Consegna presso ${esc((branding && branding.name) || "")}${branding && branding.address ? `, ${esc(branding.address)}` : ""}${branding && branding.phone ? ` · tel. ${esc(branding.phone)}` : ""}</p></body></html>`;
    const w = window.open("", "_blank"); if (!w) return; w.document.write(html); w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 300);
  };
  const ricevi = (o) => {
    if (!confirm(`Registrare l'arrivo della merce dell'ordine ${numeroOrdine(o)}? Le giacenze salgono delle quantità ordinate (puoi correggerle poi con una rettifica).`)) return;
    const carico = { id: uid(), ts: Date.now(), type: "load", fornitore: o.fornitore, docTipo: "ddt", docNumero: "", docData: todayStr(), note: `Da ordine ${numeroOrdine(o)}`, ordineId: o.id, items: (o.items || []).map((it) => ({ productId: it.productId, formatId: it.formatId, name: it.name, label: it.label, qty: it.qty, costo: it.costo != null ? Number(it.costo) : null })), total: 0, costoTotale: Math.round((o.items || []).reduce((a, it) => a + (Number(it.costo) || 0) * it.qty, 0) * 100) / 100 };
    setCatalog(applyLoadToCatalog(catalog, carico.items));
    setSales([carico, ...(sales || []).map((r) => (r.id === o.id ? { ...r, stato: "ricevuto", ricevutoIl: Date.now(), caricoId: carico.id } : r))]);
    setMsg({ ok: true, testo: "Merce ricevuta: carico registrato e giacenze aggiornate." });
  };
  const aperti = ordini.filter((o) => o.stato === "bozza" || o.stato === "inviato");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h3 className="font-semibold flex items-center gap-2 text-stone-900 tracking-tight"><ShoppingCart size={16} className="brand-accent" /> Ordini ai fornitori</h3><p className="text-xs text-stone-400 mt-0.5">Dalla proposta «sotto scorta» o a mano; si mandano per email o si stampano, e all'arrivo della merce diventano un carico.</p></div>
        <div className="flex gap-2">
          {sotto.length ? <button onClick={() => setNuovo({ id: uid(), ts: Date.now(), type: "ordine", stato: "bozza", fornitore: "", email: "", note: "", items: sotto, total: 0 })} className="flex items-center gap-1.5 text-sm font-medium border brand-border brand-accent bg-white px-3.5 py-2 rounded-lg hover:brand-soft"><Wand2 size={15} /> Proponi dal sotto scorta ({sotto.length})</button> : null}
          <button onClick={() => setNuovo(nuovo ? null : { id: uid(), ts: Date.now(), type: "ordine", stato: "bozza", fornitore: "", email: "", note: "", items: [], total: 0 })} className="flex items-center gap-1.5 text-sm font-medium brand-bg px-3.5 py-2 rounded-lg shadow-[var(--lc-shadow-xs)]">{nuovo ? <X size={15} /> : <Plus size={15} />} {nuovo ? "Chiudi" : "Nuovo ordine"}</button>
        </div>
      </div>
      {msg ? <p className={`text-sm flex items-center gap-1.5 ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.ok ? <Check size={15} /> : <AlertTriangle size={15} />} {msg.testo}</p> : null}
      {nuovo ? <OrdineForm catalog={catalog} ordine={nuovo} fornitori={fornitori} onSave={salva} onClose={() => setNuovo(null)} /> : null}
      {ordini.length === 0 ? <div className="lc-card p-10 text-center text-stone-400 text-sm">Nessun ordine. {sotto.length ? `Ci sono ${sotto.length} format${sotto.length === 1 ? "o" : "i"} sotto scorta: «Proponi dal sotto scorta» prepara l'ordine.` : "Le giacenze sono a posto."}</div> : (
        <div className="space-y-2">{ordini.map((o) => { const open = openId === o.id; const st = STATI_ORDINE[o.stato] || STATI_ORDINE.bozza; const pezzi = (o.items || []).reduce((a, it) => a + it.qty, 0); return (
          <div key={o.id} className={`bg-white rounded-xl border shadow-sm ${o.stato === "annullato" ? "border-stone-200/70 opacity-60" : "border-stone-200"}`}>
            <button onClick={() => setOpenId(open ? null : o.id)} className="w-full flex items-center gap-3 p-3 text-left">
              <ShoppingCart size={18} className="text-stone-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2 flex-wrap"><span>{numeroOrdine(o)} · {o.fornitore || "fornitore da indicare"}</span><span className="text-xs text-stone-400 font-normal">· {pezzi} pz</span><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${st[1]}`}>{st[0]}</span></div>
                <div className="text-xs text-stone-400 truncate">creato il {fmtDateTime(o.ts)}{o.inviatoIl ? ` · inviato il ${fmtDateTime(o.inviatoIl)}${o.inviatoA ? ` a ${o.inviatoA}` : ""}` : ""}{o.ricevutoIl ? ` · ricevuto il ${fmtDateTime(o.ricevutoIl)}` : ""}</div>
              </div>
              <ChevronRight size={18} className={`text-stone-300 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
            </button>
            {open ? (
              <div className="px-3 pb-3 border-t border-stone-100 pt-2 space-y-2">
                <div className="space-y-1 text-sm">{(o.items || []).map((it, i) => <div key={i} className="flex justify-between gap-2"><span className="text-stone-600">{it.qty} × {it.name}{it.label ? ` (${it.label})` : ""}</span><span className="text-stone-500 shrink-0">{it.costo != null ? `${eur(it.costo)} × ${it.qty}` : ""}</span></div>)}</div>
                {o.note ? <div className="text-xs text-stone-500">{o.note}</div> : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  {o.stato === "bozza" || o.stato === "inviato" ? <button onClick={() => setNuovo({ ...o })} className="text-xs font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50">Modifica</button> : null}
                  {o.stato !== "annullato" && o.stato !== "ricevuto" && F.has("google") ? <button onClick={() => invia(o)} disabled={busy === o.id} className="text-xs font-medium brand-bg px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50"><Send size={13} /> {busy === o.id ? "Invio…" : o.stato === "inviato" ? "Rimanda per email" : "Invia per email"}</button> : null}
                  {o.stato !== "annullato" && o.stato !== "ricevuto" && !F.has("google") && o.email ? <a href={`mailto:${o.email}?subject=${encodeURIComponent(`Ordine ${numeroOrdine(o)} · ${(branding && branding.name) || ""}`)}&body=${encodeURIComponent(testoOrdine(o, branding))}`} onClick={() => patch(o.id, { stato: "inviato", inviatoIl: Date.now(), inviatoA: o.email })} className="text-xs font-medium brand-bg px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"><Mail size={13} /> Apri l'email</a> : null}
                  <button onClick={() => stampa(o)} className="text-xs font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Printer size={13} /> Stampa</button>
                  {o.stato === "bozza" && !F.has("google") && !o.email ? <button onClick={() => patch(o.id, { stato: "inviato", inviatoIl: Date.now() })} className="text-xs font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50">Segna come inviato</button> : null}
                  {o.stato === "inviato" || o.stato === "bozza" ? <button onClick={() => ricevi(o)} className="text-xs font-medium bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 inline-flex items-center gap-1.5"><PackagePlus size={13} /> Ricevi la merce</button> : null}
                  {o.stato !== "ricevuto" && o.stato !== "annullato" ? <button onClick={() => { if (confirm("Annullare questo ordine?")) patch(o.id, { stato: "annullato", annullatoIl: Date.now() }); }} className="text-xs text-stone-400 hover:text-red-600 px-3 py-1.5 inline-flex items-center gap-1 ml-auto"><Trash2 size={13} /> Annulla</button> : null}
                </div>
              </div>
            ) : null}
          </div>
        ); })}</div>
      )}
      {aperti.length ? <p className="text-[11px] text-stone-400">{aperti.length} ordin{aperti.length === 1 ? "e" : "i"} in attesa di merce.</p> : null}
    </div>
  );
}
function OrdineForm({ catalog, ordine, fornitori, onSave, onClose }) {
  const [o, setO] = useState(ordine);
  const [q, setQ] = useState("");
  const list = o.items || [];
  const setList = (f) => setO((cur) => ({ ...cur, items: f(cur.items || []) }));
  const products = catalog.products.filter((p) => !q || `${p.name} ${p.marca || ""}`.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
  const add = (p, f) => setList((c) => { const ex = c.find((x) => x.productId === p.id && x.formatId === f.id); if (ex) return c.map((x) => (x === ex ? { ...x, qty: x.qty + 1 } : x)); return [...c, { productId: p.id, formatId: f.id, name: p.name, label: f.label, qty: 1, costo: f.costo != null && f.costo !== "" ? Number(f.costo) : null }]; });
  const setItem = (idx, patch) => setList((c) => c.map((it, i) => (i === idx ? { ...it, ...patch } : it)).filter((it) => it.qty > 0));
  const pezzi = list.reduce((a, it) => a + it.qty, 0);
  const costo = list.reduce((a, it) => a + (Number(it.costo) || 0) * it.qty, 0);
  const inp = "w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring";
  return (
    <section className="lc-card p-5 space-y-4">
      <h3 className="font-semibold flex items-center gap-2 text-stone-900 tracking-tight"><ShoppingCart size={16} className="brand-accent" /> {ordine.items && ordine.items.length && !ordine.fornitore ? "Ordine proposto dal sotto scorta" : "Ordine al fornitore"} <span className="text-xs font-normal text-stone-400">· {numeroOrdine(o)}</span></h3>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Fornitore"><input list="lc-fornitori-ord" value={o.fornitore} onChange={(e) => setO({ ...o, fornitore: e.target.value, email: o.email || fornitori[e.target.value.trim()] || "" })} placeholder="Es. Cosmetici Nord" className={inp} /><datalist id="lc-fornitori-ord">{Object.keys(fornitori).map((f) => <option key={f} value={f} />)}</datalist></Field>
        <Field label="Email del fornitore"><input type="email" value={o.email || ""} onChange={(e) => setO({ ...o, email: e.target.value })} placeholder="ordini@fornitore.it" className={inp} /></Field>
        <Field label="Note"><input value={o.note || ""} onChange={(e) => setO({ ...o, note: e.target.value })} placeholder="Es. consegna entro venerdì" className={inp} /></Field>
      </div>
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="w-full lg:flex-1 lg:min-w-0 space-y-2">
          <div className="flex items-center gap-2 border border-stone-300 rounded-lg px-3 py-2 bg-white brand-ring"><Search size={16} className="text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca il prodotto da ordinare" className="flex-1 text-sm focus:outline-none" /></div>
          <div className="grid sm:grid-cols-2 gap-2">{products.map((p) => (
            <div key={p.id} className="lc-card p-3"><div className="font-medium leading-tight text-sm">{p.name}</div>
              <div className="space-y-1 mt-1.5">{p.formats.map((f) => { const min = scortaMinDi(catalog, f); const stock = Number(f.stock) || 0; return <button key={f.id} onClick={() => add(p, f)} className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-stone-200 brand-hover text-sm"><span className="truncate">{f.label}</span><span className={`text-xs ${stock <= min ? "text-amber-600 font-medium" : "text-stone-400"}`}>giac. {stock} · min {min}</span></button>; })}</div>
            </div>))}</div>
        </div>
        <div className="w-full lg:w-96 lg:shrink-0">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
            <h4 className="font-semibold flex items-center gap-2 mb-3 text-sm"><ClipboardList size={15} className="brand-accent" /> Righe dell'ordine {pezzi ? <span className="text-xs font-normal text-stone-400">· {pezzi} pz</span> : null}</h4>
            {list.length === 0 ? <p className="text-sm text-stone-400 text-center py-6">Tocca un formato per aggiungerlo.</p> : (
              <>
                <div>{list.map((it, i) => (
                  <div key={i} className="grid grid-cols-[1fr_6.5rem_5rem_1.5rem] gap-2 items-center py-2 border-b border-stone-100 last:border-0">
                    <div className="min-w-0"><div className="text-sm font-medium truncate">{it.name}</div><div className="text-xs text-stone-400 truncate">{it.label}</div></div>
                    <div className="flex items-center gap-1 justify-center"><button onClick={() => setItem(i, { qty: it.qty - 1 })} className="w-6 h-6 rounded-md border border-stone-300 flex items-center justify-center text-stone-500"><Minus size={13} /></button><input value={it.qty} onChange={(e) => setItem(i, { qty: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="w-10 text-center text-sm font-medium border border-stone-200 rounded-md py-0.5 brand-ring" /><button onClick={() => setItem(i, { qty: it.qty + 1 })} className="w-6 h-6 rounded-md border border-stone-300 flex items-center justify-center text-stone-500"><Plus size={13} /></button></div>
                    <input type="number" min={0} step={0.01} value={it.costo != null ? it.costo : ""} placeholder="costo" onChange={(e) => setItem(i, { costo: e.target.value === "" ? null : Number(e.target.value) })} className="px-2 py-1 rounded-md border border-stone-200 text-sm text-right brand-ring" />
                    <button onClick={() => setItem(i, { qty: 0 })} className="text-stone-300 hover:text-red-500"><X size={15} /></button>
                  </div>))}</div>
                <div className="border-t border-stone-200 pt-3 mt-2 space-y-2">
                  {costo ? <div className="flex items-center justify-between text-sm"><span className="text-stone-500">Valore stimato</span><span className="font-semibold">{eur(costo)}</span></div> : null}
                  <button onClick={() => { if (!o.fornitore.trim()) { alert("Scrivi il fornitore."); return; } onSave({ ...o, fornitore: o.fornitore.trim(), email: (o.email || "").trim(), total: 0 }); }} className="w-full brand-bg font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"><Check size={16} /> Salva l'ordine</button>
                  <button onClick={onClose} className="w-full text-sm text-stone-500 py-1.5 hover:text-stone-700">Annulla</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
