import { useState } from "react";
import { Plus, Trash2, Check, X, Gift, Wallet, AlertCircle } from "lucide-react";
import { uid, fmtFullDate, eur, Field } from "./comuni.jsx";
import { genVoucherCode, voucherServiceName, downloadVoucherImage, VoucherCard, voucherStatusLabel } from "./stampa.jsx";

export function VoucherBalanceRow({ v, onScala }) {
  const [amt, setAmt] = useState("");
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <input type="number" min={0} step={0.5} value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="importo" className="w-20 px-2 py-1.5 rounded-lg border border-stone-300 text-sm text-right brand-ring" />
      <button onClick={() => { const n = Number(amt); if (!(n > 0)) { alert("Inserisci un importo."); return; } onScala(v, n); setAmt(""); }} className="text-sm font-medium px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50">Scala</button>
      <button onClick={() => { if (confirm(`Usare tutto il saldo (${eur(v.residuo)})?`)) onScala(v, null); }} className="text-sm font-medium px-2.5 py-1.5 rounded-lg brand-bg">Tutto</button>
    </div>
  );
}
export function GiftCardsView({ config, vouchers, setVouchers, clients, canAddVoucher }) {
  const services = config.services, b = config.branding;
  const [tipo, setTipo] = useState("valore");
  const [importo, setImporto] = useState("");
  const [prezzo, setPrezzo] = useState("");
  const [descr, setDescr] = useState("");
  const [svc, setSvc] = useState("");
  const [sedute, setSedute] = useState(5);
  const [created, setCreated] = useState(null);
  const limite = canAddVoucher === false;

  const reset = () => { setImporto(""); setPrezzo(""); setDescr(""); setSvc(""); setSedute(5); };
  const crea = () => {
    if (limite) return;
    if (tipo === "valore" && !(Number(importo) > 0)) { alert("Inserisci l'importo del buono."); return; }
    if (tipo === "pacchetto" && (!svc || !(Number(sedute) > 0))) { alert("Scegli servizio e numero di sedute."); return; }
    const prezzoNum = prezzo === "" ? (tipo === "valore" ? Number(importo) || 0 : 0) : Number(prezzo) || 0;
    const v = {
      id: uid(), code: genVoucherCode(vouchers), tipo, descrizione: descr.trim(),
      prezzo: prezzoNum, creato: Date.now(), stato: "attivo",
      clienteCode: null, clienteNome: null, riscattato: null, usi: [],
      ...(tipo === "valore" ? { importo: Number(importo) || 0, residuo: Number(importo) || 0 } : { serviceId: svc, sedute: Math.max(1, Math.round(Number(sedute) || 1)) }),
    };
    setVouchers([v, ...(vouchers || [])]);
    setCreated(v); reset();
  };
  const elimina = (id) => { if (confirm("Eliminare questo buono? Operazione non reversibile.")) setVouchers((vs) => vs.filter((x) => x.id !== id)); };

  const totIncasso = (vouchers || []).reduce((a, v) => a + (Number(v.prezzo) || 0), 0);
  const attivi = (vouchers || []).filter((v) => v.stato === "attivo").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold tracking-tight text-stone-900 flex items-center gap-2"><Gift size={18} className="brand-accent" /> Buoni regalo</h2>
        <div className="text-sm text-stone-500">{(vouchers || []).length} buoni · {attivi} da consegnare · incasso {eur(totIncasso)}</div>
      </div>

      {limite ? <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" /> Hai raggiunto il numero massimo di buoni della versione demo.</p> : null}

      <div className="lc-card p-5">
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Genera un nuovo buono</div>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTipo("valore")} className={`flex-1 text-sm border rounded-lg px-3 py-2 transition ${tipo === "valore" ? "brand-soft brand-border" : "bg-white border-stone-200"}`}><div className="font-medium">Buono valore</div><div className="text-xs text-stone-400">Un importo in euro</div></button>
          <button onClick={() => setTipo("pacchetto")} className={`flex-1 text-sm border rounded-lg px-3 py-2 transition ${tipo === "pacchetto" ? "brand-soft brand-border" : "bg-white border-stone-200"}`}><div className="font-medium">Buono pacchetto</div><div className="text-xs text-stone-400">Sedute di un servizio</div></button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {tipo === "valore" ? (
            <Field label="Importo del buono (€)"><input type="number" min={0} step={0.5} value={importo} onChange={(e) => setImporto(e.target.value)} placeholder="50" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          ) : (
            <>
              <Field label="Servizio"><select value={svc} onChange={(e) => setSvc(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring"><option value="">Scegli…</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
              <Field label="Numero di sedute"><input type="number" min={1} step={1} value={sedute} onChange={(e) => setSedute(Math.max(1, Math.round(Number(e.target.value) || 1)))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
            </>
          )}
          <Field label="Prezzo pagato / incasso (€)"><input type="number" min={0} step={0.5} value={prezzo} onChange={(e) => setPrezzo(e.target.value)} placeholder={tipo === "valore" ? "come importo" : "0"} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
          <Field label="Descrizione (facoltativa)"><input value={descr} onChange={(e) => setDescr(e.target.value)} placeholder={tipo === "valore" ? "Es. Buono compleanno" : "Es. Pacchetto benessere"} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring" /></Field>
        </div>
        <button onClick={crea} disabled={limite} className="mt-4 brand-bg font-medium px-4 py-2.5 rounded-lg inline-flex items-center gap-2 disabled:opacity-40"><Plus size={16} /> Genera buono</button>
      </div>

      {created ? (
        <div className="lc-card p-5">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold flex items-center gap-2"><Check size={16} className="text-green-600" /> Buono creato</h3><button onClick={() => setCreated(null)} className="text-stone-400 hover:text-stone-600"><X size={18} /></button></div>
          <VoucherCard branding={b} v={created} services={services} />
          <div className="mt-3 flex flex-col items-center gap-1">
            <button onClick={() => downloadVoucherImage(b, created, services)} className="text-sm brand-bg px-4 py-2 rounded-lg inline-flex items-center gap-2"><Wallet size={16} /> Salva immagine del buono</button>
            <p className="text-xs text-stone-400 text-center">Consegnala al cliente. Il codice si registra dalla scheda del cliente che lo riceve.</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide">Buoni emessi</div>
        {(vouchers || []).length === 0 ? <div className="lc-card p-10 text-center text-stone-400">Ancora nessun buono.</div> : (vouchers || []).map((v) => { const lab = voucherStatusLabel(v); return (
          <div key={v.id} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl brand-soft brand-accent flex items-center justify-center shrink-0"><Gift size={18} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{v.tipo === "valore" ? eur(v.importo) : `${v.sedute} sedute · ${voucherServiceName(v, services)}`}{v.descrizione ? <span className="text-stone-400 font-normal"> · {v.descrizione}</span> : null}</div>
              <div className="text-xs text-stone-400">Codice <span className="font-mono">{v.code}</span> · {fmtFullDate(v.creato)}{v.tipo === "valore" && (v.stato === "assegnato" || v.stato === "esaurito") ? ` · residuo ${eur(v.residuo)}` : ""}</div>
            </div>
            <span className={`text-[11px] px-2 py-1 rounded-full shrink-0 ${lab.cls}`}>{lab.txt}</span>
            <button onClick={() => downloadVoucherImage(b, v, services)} className="p-2 text-stone-400 hover:text-stone-700 shrink-0" title="Salva immagine"><Wallet size={16} /></button>
            {v.stato === "attivo" ? <button onClick={() => elimina(v.id)} className="p-2 text-stone-400 hover:text-red-500 shrink-0" title="Elimina"><Trash2 size={16} /></button> : null}
          </div>
        ); })}
      </div>
    </div>
  );
}
