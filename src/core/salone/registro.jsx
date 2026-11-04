// ============================================================================
// REGISTRO DELLE ATTIVITÀ (Impostazioni → Dati e backup): chi ha fatto cosa
// e quando — accessi, salvataggi (con cosa è cambiato), impostazioni,
// scontrini, fatture, backup, timbrature, modifiche dai clienti. Lo scrive
// il server (server/core/registro.js); qui si legge e si filtra.
// ============================================================================
import { useState, useEffect, useCallback } from "react";
import { ScrollText, RefreshCw, Download, Filter } from "lucide-react";
import { todayStr, addDays } from "./comuni.jsx";

export const TIPI_REGISTRO = [["", "Tutto"], ["accesso", "Accessi"], ["dati", "Dati"], ["impostazioni", "Impostazioni"], ["cassa", "Cassa e scontrini"], ["fatture", "Fatture"], ["backup", "Backup"], ["personale", "Personale"], ["cliente", "Area clienti"], ["sistema", "Sistema"]];
const ORIGINI = { gestionale: "gestionale", cassa: "cassa", telefono: "telefono", cliente: "area clienti", sistema: "sistema", portale: "portale" };
// `quando` arriva in UTC dal database (datetime('now')): si mostra nell'ora locale.
export const quandoLocale = (q) => { const d = new Date(String(q || "").replace(" ", "T") + "Z"); if (isNaN(d)) return String(q || ""); const p = (n) => String(n).padStart(2, "0"); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };

export function RegistroAttivita() {
  const [items, setItems] = useState(null);
  const [errore, setErrore] = useState("");
  const [tipo, setTipo] = useState("");
  const [da, setDa] = useState(() => addDays(todayStr(), -14));
  const [a, setA] = useState(() => todayStr());
  const [q, setQ] = useState("");
  const carica = useCallback(async () => {
    setItems(null); setErrore("");
    try {
      const r = await fetch(`/api/registro?limit=500&tipo=${encodeURIComponent(tipo)}&da=${da}&a=${a}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      setItems(Array.isArray(j.items) ? j.items : []); if (j.errore) setErrore(j.errore);
    } catch (e) { setItems([]); setErrore("Rete assente."); }
  }, [tipo, da, a]);
  useEffect(() => { carica(); }, [carica]);
  const visibili = (items || []).filter((x) => !q || `${x.chi} ${x.testo} ${(x.dettagli && x.dettagli.voci || []).join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  const csv = () => {
    const righe = [["Quando", "Chi", "Da", "Tipo", "Cosa", "Dettagli"].join(";"), ...visibili.map((x) => [quandoLocale(x.quando), x.chi, ORIGINI[x.origine] || x.origine, (TIPI_REGISTRO.find((t) => t[0] === x.tipo) || [])[1] || x.tipo, x.testo, [...((x.dettagli && x.dettagli.voci) || []), x.dettagli && x.dettagli.volte > 1 ? `${x.dettagli.volte} volte` : ""].filter(Boolean).join(" · ")].map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(";"))];
    const el = document.createElement("a"); el.href = URL.createObjectURL(new Blob(["﻿" + righe.join("\n")], { type: "text/csv;charset=utf-8" })); el.download = `registro-attivita-${da}-${a}.csv`; el.click();
  };
  const inp = "px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring";
  const colore = (t) => ({ accesso: "bg-sky-100 text-sky-700", dati: "bg-stone-100 text-stone-600", impostazioni: "bg-violet-100 text-violet-700", cassa: "bg-green-100 text-green-700", fatture: "bg-amber-100 text-amber-700", backup: "bg-teal-100 text-teal-700", personale: "bg-orange-100 text-orange-700", cliente: "bg-pink-100 text-pink-700" }[t] || "bg-stone-100 text-stone-600");
  return (
    <section className="lc-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div><h3 className="font-semibold flex items-center gap-2 text-stone-900 tracking-tight"><ScrollText size={16} className="brand-accent" /> Registro delle attività</h3><p className="text-sm text-stone-500 mt-0.5">Chi ha fatto cosa e quando: accessi, salvataggi, impostazioni, scontrini, fatture, backup, timbrature e modifiche fatte dai clienti dalla loro area. Si conservano 180 giorni.</p></div>
        <div className="flex gap-2"><button onClick={carica} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><RefreshCw size={14} /> Aggiorna</button><button onClick={csv} disabled={!visibili.length} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5 disabled:opacity-50"><Download size={14} /> CSV</button></div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Filter size={14} className="text-stone-400" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inp}>{TIPI_REGISTRO.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <input type="date" value={da} onChange={(e) => setDa(e.target.value)} className={inp} /><span className="text-xs text-stone-400">→</span><input type="date" value={a} onChange={(e) => setA(e.target.value)} className={inp} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca" className={`${inp} flex-1 min-w-[8rem]`} />
      </div>
      {errore ? <p className="text-xs text-amber-700 mb-2">{errore}</p> : null}
      {items === null ? <p className="text-sm text-stone-400">Carico…</p> : visibili.length === 0 ? <p className="text-sm text-stone-400">Nessuna attività nel periodo.</p> : (
        <div className="max-h-[32rem] overflow-y-auto -mx-2 px-2">
          <table className="w-full text-sm">
            <tbody>{visibili.map((x) => (
              <tr key={x.id} className="border-b border-stone-50 last:border-0 align-top">
                <td className="py-1.5 pr-3 whitespace-nowrap text-xs text-stone-400 tabular-nums">{quandoLocale(x.quando)}</td>
                <td className="py-1.5 pr-3"><span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${colore(x.tipo)}`}>{(TIPI_REGISTRO.find((t) => t[0] === x.tipo) || [])[1] || x.tipo}</span></td>
                <td className="py-1.5 pr-3"><div className="text-stone-800">{x.testo}{x.dettagli && x.dettagli.volte > 1 ? <span className="text-xs text-stone-400"> · {x.dettagli.volte} volte</span> : null}</div>{x.dettagli && Array.isArray(x.dettagli.voci) && x.dettagli.voci.length ? <div className="text-xs text-stone-400">{x.dettagli.voci.join(" · ")}{x.dettagli.altri ? ` · e altri ${x.dettagli.altri}` : ""}</div> : null}</td>
                <td className="py-1.5 text-xs text-stone-400 whitespace-nowrap text-right">{x.chi}<div className="text-[10px]">{ORIGINI[x.origine] || x.origine || ""}</div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
