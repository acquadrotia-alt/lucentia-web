// ============================================================================
// FATTURE ELETTRONICHE (modulo "fatture"): emesse e ricevute, con Effatta
// come intermediario verso lo SDI.
//
// · Le fatture emesse stanno nella collezione `fatture`, quelle dei fornitori
//   in `acquisti`. I dati della ditta, la numerazione e le preferenze stanno in
//   `config.fatture`; le credenziali di Effatta solo sul server (server/core/effatta.js).
// · Una fattura nasce da una vendita in cassa, da un appuntamento svolto o da
//   zero; l'XML FatturaPA lo genera `src/core/fatture/fatturapa.js`.
// · Invio: una sola chiamata `sendXML` tramite il server. Poi `useEffatta`
//   chiede l'esito ogni 2 ore finché non è definitivo e scarica le fatture dei
//   fornitori (mese corrente e precedente) ogni ora, senza doppioni.
// ============================================================================
import { useState, useEffect, useRef, useMemo } from "react";
import { FileText, Plus, X, Check, AlertTriangle, Download, Send, RefreshCw, ChevronRight, Trash2, Receipt, Building2, Ban, Search, Inbox } from "lucide-react";
import { uid, eur, todayStr, fmtDateTime, Field, useMods } from "./comuni.jsx";
import { TIPI_DOCUMENTO, MODALITA_PAGAMENTO, REGIMI_FISCALI, NATURE_IVA, n2, nettoDaLordo, rigaTotale, totali, controlla, fatturaXml, nomeFile, leggiEsitoSdi, ESITO_DEFINITIVO, chiaveAcquisto, pivaPulita, cfPulito } from "../fatture/fatturapa.js";

export async function effattaApi(action, { query = "", body } = {}) {
  try {
    const r = await fetch(`/api/effatta?action=${action}${query}`, body ? { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { credentials: "include", headers: { Accept: "application/json" } });
    const j = await r.json().catch(() => ({}));
    return r.ok && j.ok !== false ? { ok: true, ...j } : { ok: false, error: j.error || j.errore || `Errore ${r.status}`, ...j };
  } catch (e) { return { ok: false, error: "Rete assente: riprova fra poco." }; }
}

// ---- impostazioni delle fatture in config.fatture ------------------------
export const DEFAULT_FATTURE = {
  ditta: { denominazione: "", piva: "", cf: "", regime: "RF01", indirizzo: "", civico: "", cap: "", comune: "", provincia: "", nazione: "IT", telefono: "", email: "", iban: "", istituto: "", aliquota: 22, natura: "N2.2", riferimento: "", bollo: false },
  numerazione: { formato: "{n}/{aaaa}", prossimo: {} },
  progressivoInvio: 1,
  pagamento: "MP08",
};
export function fattureConfig(config) {
  const f = (config && config.fatture) || {};
  return { ...DEFAULT_FATTURE, ...f, ditta: { ...DEFAULT_FATTURE.ditta, ...(f.ditta || {}) }, numerazione: { ...DEFAULT_FATTURE.numerazione, ...(f.numerazione || {}) } };
}
export const forfettario = (ditta) => ditta && (ditta.regime === "RF19" || ditta.regime === "RF02");
export function prossimoNumero(cfgF, data) {
  const anno = String(data || todayStr()).slice(0, 4);
  const n = Number((cfgF.numerazione.prossimo || {})[anno]) || 1;
  return { n, anno, numero: String(cfgF.numerazione.formato || "{n}/{aaaa}").replace("{n}", n).replace("{aaaa}", anno).replace("{aa}", anno.slice(2)) };
}
// Il cliente di una fattura, dall'anagrafica (c.fatturazione) e dai dati base.
export function clienteFattura(c) {
  if (!c) return { denominazione: "", nazione: "IT" };
  const f = c.fatturazione || {};
  return { denominazione: f.denominazione || c.name || "", piva: f.piva || "", cf: f.cf || "", indirizzo: f.indirizzo || "", civico: f.civico || "", cap: f.cap || "", comune: f.comune || "", provincia: f.provincia || "", nazione: f.nazione || "IT", codiceDestinatario: f.codiceDestinatario || "", pec: f.pec || "", email: c.email || "", codice: c.code };
}
const stato = (f) => f.annullata ? { label: "Annullata", cls: "bg-stone-100 text-stone-500" }
  : f.sdiEsitoTipo === "scartata" ? { label: "Scartata dallo SDI", cls: "bg-red-100 text-red-700" }
  : f.sdiEsitoTipo === "consegnata" || f.sdiEsitoTipo === "decorrenza" ? { label: "Consegnata", cls: "bg-green-100 text-green-700" }
  : f.sdiEsitoTipo === "mancata" ? { label: "Non recapitata", cls: "bg-amber-100 text-amber-700" }
  : f.effattaId ? { label: "Inviata allo SDI", cls: "bg-sky-100 text-sky-700" }
  : { label: "Da inviare", cls: "brand-soft brand-text" };
const scarica = (nome, contenuto, tipo = "application/xml") => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([contenuto], { type: tipo })); a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };

// Una bozza da una vendita della cassa o da un appuntamento svolto.
export function bozzaDaVendita(sale, clients, cfgF) {
  const cl = (clients || []).find((c) => c.code === sale.clientCode);
  const al = forfettario(cfgF.ditta) ? 0 : Number(cfgF.ditta.aliquota) || 22;
  return { cliente: clienteFattura(cl), righe: (sale.items || []).map((it) => ({ descrizione: it.name + (it.label ? ` (${it.label})` : ""), qta: it.qty, lordo: n2(it.price), aliquota: al })), origine: { tipo: "vendita", id: sale.id } };
}
export function bozzaDaAppuntamento(b, config, clients, cfgF) {
  const cl = (clients || []).find((c) => c.code === b.clientCode);
  const al = forfettario(cfgF.ditta) ? 0 : Number(cfgF.ditta.aliquota) || 22;
  const servizi = (b.serviceIds || []).map((id) => (config.services || []).find((s) => s.id === id)).filter(Boolean);
  let righe = servizi.map((s) => ({ descrizione: s.name, qta: 1, lordo: n2(s.price), aliquota: al }));
  const incassato = Number(b.amount);
  if (incassato > 0) {
    if (righe.length === 1) righe[0].lordo = n2(incassato);
    else { const somma = n2(righe.reduce((a, r) => a + r.lordo, 0)); if (somma !== n2(incassato)) righe.push({ descrizione: "Adeguamento al prezzo concordato", qta: 1, lordo: n2(incassato - somma), aliquota: al }); }
  }
  if (!righe.length) righe = [{ descrizione: "Prestazione del " + b.date, qta: 1, lordo: incassato > 0 ? n2(incassato) : 0, aliquota: al }];
  return { cliente: { ...clienteFattura(cl), denominazione: (cl && clienteFattura(cl).denominazione) || b.clientName || "" }, righe, causale: "Appuntamento del " + String(b.date).split("-").reverse().join("/"), origine: { tipo: "appuntamento", id: b.id } };
}

// ---- la vista ------------------------------------------------------------
export function FattureView({ config, saveConfig, fatture, setFatture, acquisti, setAcquisti, clients, setClients, bozza, onBozzaUsata, onEmessa, effatta }) {
  const cfgF = fattureConfig(config);
  const [tab, setTab] = useState("emesse");
  const [form, setForm] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState("");
  useEffect(() => { if (bozza) { setForm({ ...bozza }); setTab("emesse"); onBozzaUsata && onBozzaUsata(); } }, [bozza]);
  const attivo = !!(effatta && effatta.attivo);
  const lista = useMemo(() => (fatture || []).filter((f) => !q || `${f.numero} ${f.cliente && f.cliente.denominazione}`.toLowerCase().includes(q.toLowerCase())).slice().sort((a, b) => (b.data + b.numero).localeCompare(a.data + a.numero)), [fatture, q]);
  const patch = (id, p) => setFatture((fatture || []).map((f) => (f.id === id ? { ...f, ...p } : f)));

  const salvaFattura = (f) => {
    const nuova = { ...f, id: f.id || uid(), creataIl: f.creataIl || new Date().toISOString() };
    const esiste = (fatture || []).some((x) => x.id === nuova.id);
    setFatture(esiste ? fatture.map((x) => (x.id === nuova.id ? nuova : x)) : [nuova, ...(fatture || [])]);
    if (!esiste) {
      // il numero successivo per quell'anno
      const { anno, n } = prossimoNumero(cfgF, nuova.data);
      if (nuova.numero === prossimoNumero(cfgF, nuova.data).numero) saveConfig({ ...config, fatture: { ...cfgF, numerazione: { ...cfgF.numerazione, prossimo: { ...(cfgF.numerazione.prossimo || {}), [anno]: n + 1 } } } });
      onEmessa && onEmessa(nuova);
    }
    setForm(null); setOpenId(nuova.id);
  };
  const scaricaXml = (f) => { const prog = f.xmlProgressivo || cfgF.progressivoInvio || 1; scarica(f.xmlNome || nomeFile(cfgF.ditta.piva, prog), fatturaXml(f, cfgF.ditta, prog)); };
  const invia = async (f) => {
    const manca = controlla(f, cfgF.ditta);
    if (manca.length) { alert("Prima di inviare mancano: " + manca.join(", ") + "."); return; }
    if (f.effattaId && !confirm("Questa fattura risulta già mandata a Effatta. Mandarla di nuovo significa farla arrivare due volte allo SDI. Procedo lo stesso?")) return;
    if (!confirm(`Mando allo SDI la ${f.tipo === "TD04" ? "nota di credito" : "fattura"} n. ${f.numero} tramite Effatta.\n\nDa quel momento il documento è trasmesso davvero e non si corregge più: si emette una nota di credito.\n\nProcedo?`)) return;
    setBusy(f.id); setMsg(null);
    const prog = f.xmlProgressivo || Number(cfgF.progressivoInvio) || 1;
    const nome = f.xmlNome || nomeFile(cfgF.ditta.piva, prog);
    const r = await effattaApi("invia", { body: { xml: fatturaXml(f, cfgF.ditta, prog), nome } });
    setBusy("");
    if (!r.ok) { setMsg({ ok: false, testo: `Invio non riuscito: ${r.error}` }); return; }
    const d = r.invio || {};
    const effattaId = String(d.idDocumento || d.IdDocumento || d.id || d.IdentificativoSdI || "").slice(0, 80);
    patch(f.id, { xmlProgressivo: prog, xmlNome: nome, effattaId: effattaId || "inviata", sdiInviatoIl: new Date().toISOString(), sdiEsito: "", sdiEsitoTipo: "", sdiEsitoIl: "" });
    if (!f.xmlProgressivo) saveConfig({ ...config, fatture: { ...cfgF, progressivoInvio: prog + 1 } });
    setMsg({ ok: true, testo: `Fattura n. ${f.numero} mandata allo SDI. L'esito arriva da solo entro qualche ora.` });
  };
  const chiediEsito = async (f) => {
    setBusy(f.id); setMsg(null);
    const r = await esitoDaEffatta(f);
    setBusy("");
    if (r.errore) { setMsg({ ok: false, testo: r.errore }); return; }
    patch(f.id, { sdiEsito: r.testo || r.grezzo || "risposta ricevuta ma non riconosciuta", sdiEsitoTipo: r.tipo || "", sdiEsitoIl: new Date().toISOString() });
  };
  const notaCredito = (f) => setForm({ tipo: "TD04", cliente: f.cliente, righe: f.righe.map((r) => ({ ...r })), causale: `Storno della fattura n. ${f.numero} del ${String(f.data).split("-").reverse().join("/")}`, collegate: [{ numero: f.numero, data: f.data }] });
  const scaricaAcquisti = async () => {
    setBusy("acquisti"); setMsg(null);
    const r = await scaricaDaEffatta(acquisti, setAcquisti);
    setBusy("");
    setMsg(r.errore ? { ok: false, testo: r.errore } : { ok: true, testo: r.nuovi ? `${r.nuovi} fattur${r.nuovi === 1 ? "a nuova" : "e nuove"} dai fornitori.` : "Nessuna fattura nuova dai fornitori." + (r.scartati && r.scartati.length ? ` (${r.scartati.length} document${r.scartati.length === 1 ? "o saltato" : "i saltati"})` : "") });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h2 className="text-xl font-semibold tracking-tight text-stone-900 leading-none">Fatture</h2><p className="text-[13px] text-stone-400 mt-1">Fatture elettroniche emesse e ricevute{attivo ? <span className="text-green-700 font-medium"> · Effatta collegato</span> : <span> · Effatta spento: le fatture si scaricano in XML</span>}</p></div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-stone-100/80 rounded-xl p-1">{[["emesse", "Emesse", FileText], ["acquisti", "Fornitori", Inbox]].map(([k, l, Icon]) => <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === k ? "bg-white shadow-[var(--lc-shadow-xs)] text-stone-900" : "text-stone-500 hover:text-stone-700"}`}><Icon size={15} /><span className="hidden sm:inline">{l}</span></button>)}</div>
          {tab === "emesse" ? <button onClick={() => setForm(form ? null : { tipo: "TD01" })} className="flex items-center gap-1.5 text-sm font-medium brand-bg px-3.5 py-2 rounded-lg shadow-[var(--lc-shadow-xs)]">{form ? <X size={15} /> : <Plus size={15} />} {form ? "Chiudi" : "Nuova fattura"}</button>
            : <button onClick={scaricaAcquisti} disabled={!attivo || busy === "acquisti"} title={attivo ? "" : "Collega Effatta in Impostazioni → Fatture"} className="flex items-center gap-1.5 text-sm font-medium brand-bg px-3.5 py-2 rounded-lg shadow-[var(--lc-shadow-xs)] disabled:opacity-50"><RefreshCw size={15} className={busy === "acquisti" ? "animate-spin" : ""} /> Scarica da Effatta</button>}
        </div>
      </div>
      {msg ? <div className={`rounded-xl border p-3 text-sm flex items-start gap-2 ${msg.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"}`}>{msg.ok ? <Check size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}<span className="flex-1">{msg.testo}</span><button onClick={() => setMsg(null)} className="text-xs underline">ok</button></div> : null}
      {form ? <FatturaForm bozza={form} config={config} clients={clients} setClients={setClients} fatture={fatture} onSave={salvaFattura} onClose={() => setForm(null)} /> : null}

      {tab === "emesse" ? <>
        <div className="flex items-center gap-2 border border-stone-200 rounded-lg px-3 py-2 bg-white"><Search size={15} className="text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per numero o cliente" className="flex-1 text-sm focus:outline-none" /></div>
        {lista.length === 0 ? <div className="lc-card p-10 text-center text-stone-400 text-sm">Nessuna fattura emessa. Puoi crearne una da qui, dalla cassa (Vendite → Storico) o da un appuntamento svolto.</div> : (
          <div className="space-y-2">{lista.map((f) => { const open = openId === f.id; const st = stato(f); const T = totali(f, cfgF.ditta); const manca = controlla(f, cfgF.ditta); return (
            <div key={f.id} className={`bg-white rounded-xl border shadow-sm ${f.annullata ? "border-stone-200/70 opacity-70" : "border-stone-200"}`}>
              <button onClick={() => setOpenId(open ? null : f.id)} className="w-full flex items-center gap-3 p-3 text-left">
                <FileText size={18} className={f.tipo === "TD04" ? "text-amber-500 shrink-0" : "text-stone-400 shrink-0"} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2 flex-wrap"><span>{f.tipo === "TD04" ? "Nota di credito" : "Fattura"} n. {f.numero}</span><span className="text-stone-500 font-normal">{eur(T.totale)}</span><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${st.cls}`}>{st.label}</span></div>
                  <div className="text-xs text-stone-400 truncate">{String(f.data).split("-").reverse().join("/")} · {f.cliente && f.cliente.denominazione}</div>
                </div>
                <ChevronRight size={18} className={`text-stone-300 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
              </button>
              {open ? (
                <div className="px-3 pb-3 border-t border-stone-100 pt-3 space-y-3 text-sm">
                  <div className="text-stone-600">{f.cliente.denominazione}{f.cliente.piva ? ` · P.IVA ${f.cliente.piva}` : ""}{f.cliente.cf ? ` · CF ${f.cliente.cf}` : ""}{f.cliente.indirizzo ? ` · ${f.cliente.indirizzo} ${f.cliente.civico || ""}, ${f.cliente.cap || ""} ${f.cliente.comune || ""}` : ""}</div>
                  <div className="space-y-1">{(f.righe || []).map((r, i) => <div key={i} className="flex justify-between gap-2"><span className="text-stone-600">{r.qta}× {r.descrizione}{r.aliquota ? <span className="text-stone-400"> · IVA {r.aliquota}%</span> : null}</span><span className="text-stone-500 shrink-0">{eur(rigaTotale(r))}</span></div>)}</div>
                  <div className="flex justify-between text-stone-500 border-t border-stone-100 pt-2"><span>Imponibile {eur(T.imponibile)} · IVA {eur(T.imposta)}{T.bollo ? ` · bollo ${eur(T.bollo)}` : ""}</span><b className="text-stone-800">{eur(T.totale)}</b></div>
                  {f.causale ? <div className="text-xs text-stone-500">{f.causale}</div> : null}
                  {f.sdiEsito ? <div className={`rounded-lg p-2.5 text-xs ${f.sdiEsitoTipo === "scartata" ? "bg-red-50 text-red-700" : f.sdiEsitoTipo === "consegnata" || f.sdiEsitoTipo === "decorrenza" ? "bg-green-50 text-green-700" : "bg-stone-50 text-stone-600"}`}>{f.sdiEsito}{f.sdiEsitoIl ? <span className="block text-[10px] opacity-70 mt-0.5">controllato il {fmtDateTime(Date.parse(f.sdiEsitoIl))}</span> : null}</div> : f.effattaId ? <div className="text-xs text-stone-500">Inviata il {fmtDateTime(Date.parse(f.sdiInviatoIl))} (rif. Effatta {f.effattaId}). L'esito dello SDI arriva da solo.</div> : null}
                  {manca.length && !f.effattaId ? <div className="text-xs text-amber-700 flex items-start gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-0.5" /> Per poterla inviare mancano: {manca.join(", ")}.</div> : null}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => scaricaXml(f)} className="text-xs font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Download size={14} /> Scarica XML</button>
                    {!f.annullata && !f.effattaId ? <button onClick={() => invia(f)} disabled={!attivo || busy === f.id || manca.length > 0} title={attivo ? "" : "Collega Effatta in Impostazioni → Fatture"} className="text-xs font-medium brand-bg px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50"><Send size={14} /> {busy === f.id ? "Invio…" : "Invia allo SDI"}</button> : null}
                    {f.effattaId && !ESITO_DEFINITIVO(f.sdiEsitoTipo) ? <button onClick={() => chiediEsito(f)} disabled={!attivo || busy === f.id} className="text-xs font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5 disabled:opacity-50"><RefreshCw size={14} className={busy === f.id ? "animate-spin" : ""} /> Stato SDI</button> : null}
                    {f.sdiEsitoTipo === "scartata" ? <button onClick={() => invia({ ...f, effattaId: "" })} disabled={!attivo || busy === f.id} className="text-xs font-medium border border-red-300 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 inline-flex items-center gap-1.5"><Send size={14} /> Reinvia corretta</button> : null}
                    {!f.annullata && !f.effattaId ? <button onClick={() => setForm({ ...f })} className="text-xs font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50">Modifica</button> : null}
                    {f.tipo !== "TD04" && f.effattaId && !f.annullata ? <button onClick={() => notaCredito(f)} className="text-xs font-medium border border-amber-300 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-50">Nota di credito</button> : null}
                    {!f.effattaId && !f.annullata ? <button onClick={() => { if (confirm("Annullare questa fattura? Non è stata inviata allo SDI: resta nell'elenco come annullata.")) patch(f.id, { annullata: true }); }} className="text-xs font-medium text-stone-500 px-3 py-1.5 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5 ml-auto"><Ban size={14} /> Annulla</button> : null}
                  </div>
                </div>
              ) : null}
            </div>
          ); })}</div>
        )}
      </> : (
        <AcquistiTab acquisti={acquisti} setAcquisti={setAcquisti} />
      )}
    </div>
  );
}

function AcquistiTab({ acquisti, setAcquisti }) {
  const [openId, setOpenId] = useState(null);
  const lista = (acquisti || []).slice().sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  const patch = (id, p) => setAcquisti((acquisti || []).map((a) => (a.id === id ? { ...a, ...p } : a)));
  const totale = n2(lista.reduce((a, x) => a + (Number(x.totale) || 0), 0));
  const daPagare = lista.filter((a) => !a.pagata);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="lc-card p-4"><div className="text-xs text-stone-400 uppercase tracking-wide">Fatture ricevute</div><div className="text-xl font-semibold">{lista.length}</div><div className="text-xs text-stone-400">{eur(totale)} in totale</div></div>
        <div className="lc-card p-4"><div className="text-xs text-stone-400 uppercase tracking-wide">Da pagare</div><div className="text-xl font-semibold">{daPagare.length}</div><div className="text-xs text-stone-400">{eur(n2(daPagare.reduce((a, x) => a + (Number(x.totale) || 0), 0)))}</div></div>
      </div>
      {lista.length === 0 ? <div className="lc-card p-10 text-center text-stone-400 text-sm">Nessuna fattura dai fornitori. Con Effatta collegato arrivano da sole (mese in corso e precedente), oppure premi «Scarica da Effatta».</div> : (
        <div className="space-y-2">{lista.map((a) => { const open = openId === a.id; return (
          <div key={a.id} className="bg-white rounded-xl border border-stone-200 shadow-sm">
            <button onClick={() => setOpenId(open ? null : a.id)} className="w-full flex items-center gap-3 p-3 text-left">
              <Building2 size={18} className="text-stone-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2 flex-wrap"><span>{a.fornitore && a.fornitore.denominazione}</span><span className="text-stone-500 font-normal">{eur(a.totale)}</span>{a.pagata ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Pagata</span> : a.scadenza && a.scadenza < todayStr() ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Scaduta</span> : null}{a.tipo === "TD04" ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Nota di credito</span> : null}</div>
                <div className="text-xs text-stone-400 truncate">n. {a.numero} del {String(a.data).split("-").reverse().join("/")}{a.scadenza ? ` · scade il ${String(a.scadenza).split("-").reverse().join("/")}` : ""}</div>
              </div>
              <ChevronRight size={18} className={`text-stone-300 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
            </button>
            {open ? (
              <div className="px-3 pb-3 border-t border-stone-100 pt-3 space-y-3 text-sm">
                <div className="text-stone-600">{a.fornitore.denominazione}{a.fornitore.piva ? ` · P.IVA ${a.fornitore.piva}` : ""}{a.fornitore.comune ? ` · ${a.fornitore.comune}` : ""}</div>
                <div className="space-y-1">{(a.righe || []).slice(0, 30).map((r, i) => <div key={i} className="flex justify-between gap-2"><span className="text-stone-600 truncate">{r.qta}× {r.descrizione}</span><span className="text-stone-500 shrink-0">{eur(r.totale)}</span></div>)}</div>
                <div className="flex justify-between text-stone-500 border-t border-stone-100 pt-2"><span>Imponibile {eur(a.imponibile)} · IVA {eur(a.imposta)}</span><b className="text-stone-800">{eur(a.totale)}</b></div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => patch(a.id, { pagata: !a.pagata, pagataIl: a.pagata ? null : todayStr() })} className={`text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${a.pagata ? "border border-stone-300 text-stone-600 hover:bg-stone-50" : "bg-green-600 text-white hover:bg-green-700"}`}><Check size={14} /> {a.pagata ? "Segna da pagare" : "Segna pagata"}</button>
                  {a.xml ? <button onClick={() => scarica(`fattura-${(a.fornitore.piva || "fornitore")}-${String(a.numero).replace(/[^\w.-]+/g, "_")}.xml`, a.xml)} className="text-xs font-medium border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Download size={14} /> Scarica XML</button> : null}
                  <button onClick={() => { if (confirm("Togliere questa fattura dall'elenco? Se è ancora su Effatta verrà riscaricata al prossimo giro.")) setAcquisti((acquisti || []).filter((x) => x.id !== a.id)); }} className="text-xs text-stone-400 px-3 py-1.5 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5 ml-auto"><Trash2 size={14} /> Togli</button>
                </div>
              </div>
            ) : null}
          </div>
        ); })}</div>
      )}
    </div>
  );
}

// ---- il modulo di una fattura --------------------------------------------
export function FatturaForm({ bozza, config, clients, setClients, fatture, onSave, onClose }) {
  const cfgF = fattureConfig(config);
  const d = cfgF.ditta;
  const forf = forfettario(d);
  const alDef = forf ? 0 : Number(d.aliquota) || 22;
  const [f, setF] = useState(() => {
    const data = bozza.data || todayStr();
    return { tipo: "TD01", data, numero: bozza.numero || prossimoNumero(cfgF, data).numero, cliente: { nazione: "IT", ...(bozza.cliente || {}) }, righe: (bozza.righe && bozza.righe.length ? bozza.righe : [{ descrizione: "", qta: 1, lordo: 0, aliquota: alDef }]).map((r) => ({ ...r, lordo: r.lordo != null ? r.lordo : n2(r.prezzo * (1 + (r.aliquota || 0) / 100)), aliquota: forf ? 0 : (r.aliquota != null ? r.aliquota : alDef) })), pagamento: bozza.pagamento || { modalita: cfgF.pagamento || "MP08", scadenza: "" }, causale: bozza.causale || "", ...bozza };
  });
  const [salvaAnagrafica, setSalvaAnagrafica] = useState(true);
  const setC = (p) => setF((x) => ({ ...x, cliente: { ...x.cliente, ...p } }));
  const setR = (i, p) => setF((x) => ({ ...x, righe: x.righe.map((r, j) => (j === i ? { ...r, ...p } : r)) }));
  // i prezzi si scrivono IVA compresa (come sul listino); il netto va nell'XML
  const conNetto = (r) => ({ ...r, prezzo: nettoDaLordo(r.lordo, r.aliquota) });
  const pronta = { ...f, righe: f.righe.map(conNetto) };
  const T = totali(pronta, d);
  const manca = controlla(pronta, d);
  const duplicato = (fatture || []).some((x) => x.id !== f.id && x.numero === f.numero && !x.annullata && x.sdiEsitoTipo !== "scartata");
  const scegliCliente = (code) => { const c = (clients || []).find((x) => x.code === code); if (c) setC({ ...clienteFattura(c) }); };
  const salva = () => {
    if (duplicato) { alert("Esiste già una fattura con questo numero."); return; }
    if (salvaAnagrafica && f.cliente.codice && setClients) {
      const { codice, email, ...fatt } = f.cliente;
      setClients((cs) => cs.map((c) => (c.code === codice ? { ...c, fatturazione: fatt } : c)));
    }
    onSave(pronta);
  };
  const inp = "w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring";
  return (
    <section className="lc-card p-5 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold text-stone-900 tracking-tight flex items-center gap-2"><FileText size={16} className="brand-accent" /> {f.id ? "Modifica" : "Nuova"} {f.tipo === "TD04" ? "nota di credito" : "fattura"}</h3>
        <div className="flex gap-1 bg-stone-100/80 rounded-xl p-1">{TIPI_DOCUMENTO.map(([k, l]) => <button key={k} onClick={() => setF((x) => ({ ...x, tipo: k }))} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${f.tipo === k ? "bg-white shadow-[var(--lc-shadow-xs)] text-stone-900" : "text-stone-500"}`}>{l}</button>)}</div>
      </div>
      {!d.piva ? <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">Prima compila i dati della tua attività in <b>Impostazioni → Fatture</b> (denominazione, partita IVA, sede, regime).</div> : null}
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Numero"><input value={f.numero} onChange={(e) => setF((x) => ({ ...x, numero: e.target.value }))} className={`${inp} ${duplicato ? "border-red-400" : ""}`} />{duplicato ? <p className="text-[11px] text-red-600 mt-1">Numero già usato.</p> : null}</Field>
        <Field label="Data"><input type="date" value={f.data} onChange={(e) => { const data = e.target.value; setF((x) => ({ ...x, data, numero: x.id ? x.numero : prossimoNumero(cfgF, data).numero })); }} className={inp} /></Field>
        <Field label="Pagamento"><select value={f.pagamento.modalita} onChange={(e) => setF((x) => ({ ...x, pagamento: { ...x.pagamento, modalita: e.target.value } }))} className={`${inp} bg-white`}>{MODALITA_PAGAMENTO.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-2"><div className="text-xs font-medium text-stone-400 uppercase tracking-wide">Cliente</div>
          <select value="" onChange={(e) => scegliCliente(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border border-stone-300 bg-white max-w-[14rem]"><option value="">Prendi dall'anagrafica…</option>{(clients || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || "")).map((c) => <option key={c.code} value={c.code}>{c.name}{c.fatturazione && c.fatturazione.piva ? ` · ${c.fatturazione.piva}` : ""}</option>)}</select></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nome e cognome / ragione sociale"><input value={f.cliente.denominazione || ""} onChange={(e) => setC({ denominazione: e.target.value })} className={inp} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Partita IVA"><input value={f.cliente.piva || ""} onChange={(e) => setC({ piva: pivaPulita(e.target.value) })} placeholder="11 cifre" className={inp} /></Field>
            <Field label="Codice fiscale"><input value={f.cliente.cf || ""} onChange={(e) => setC({ cf: cfPulito(e.target.value) })} className={inp} /></Field>
          </div>
          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <Field label="Indirizzo"><input value={f.cliente.indirizzo || ""} onChange={(e) => setC({ indirizzo: e.target.value })} className={inp} /></Field>
            <Field label="Civico"><input value={f.cliente.civico || ""} onChange={(e) => setC({ civico: e.target.value })} className={inp} /></Field>
          </div>
          <div className="grid grid-cols-[5rem_1fr_4rem] gap-3">
            <Field label="CAP"><input value={f.cliente.cap || ""} onChange={(e) => setC({ cap: e.target.value.replace(/\D/g, "").slice(0, 5) })} className={inp} /></Field>
            <Field label="Comune"><input value={f.cliente.comune || ""} onChange={(e) => setC({ comune: e.target.value })} className={inp} /></Field>
            <Field label="Prov."><input value={f.cliente.provincia || ""} onChange={(e) => setC({ provincia: e.target.value.toUpperCase().slice(0, 2) })} className={inp} /></Field>
          </div>
          <Field label="Codice destinatario (SDI)"><input value={f.cliente.codiceDestinatario || ""} onChange={(e) => setC({ codiceDestinatario: e.target.value.toUpperCase().replace(/\s/g, "") })} placeholder="7 caratteri · vuoto per i privati" className={inp} /></Field>
          <Field label="PEC (se niente codice)"><input value={f.cliente.pec || ""} onChange={(e) => setC({ pec: e.target.value })} className={inp} /></Field>
        </div>
        {f.cliente.codice ? <label className="flex items-center gap-2 text-xs text-stone-500 mt-2 cursor-pointer"><input type="checkbox" checked={salvaAnagrafica} onChange={(e) => setSalvaAnagrafica(e.target.checked)} /> Salva questi dati fiscali nella scheda del cliente</label> : null}
      </div>

      <div>
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Righe · prezzi IVA compresa{forf ? " (regime forfettario: senza IVA)" : ""}</div>
        <div className="space-y-2">
          {f.righe.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_4rem_6rem_5rem_2rem] gap-2 items-center">
              <input value={r.descrizione} onChange={(e) => setR(i, { descrizione: e.target.value })} placeholder="Descrizione" className={inp} />
              <input type="number" min={0} step={1} value={r.qta} onChange={(e) => setR(i, { qta: Number(e.target.value) })} className={`${inp} text-right`} />
              <input type="number" min={0} step={0.5} value={r.lordo} onChange={(e) => setR(i, { lordo: Number(e.target.value) })} className={`${inp} text-right`} />
              {forf ? <span className="text-xs text-stone-400 text-center">0%</span> : <select value={r.aliquota} onChange={(e) => setR(i, { aliquota: Number(e.target.value) })} className={`${inp} bg-white px-1`}>{[22, 10, 5, 4, 0].map((a) => <option key={a} value={a}>{a}%</option>)}</select>}
              <button onClick={() => setF((x) => ({ ...x, righe: x.righe.filter((_, j) => j !== i) }))} className="text-stone-400 hover:text-red-500"><X size={16} /></button>
            </div>
          ))}
        </div>
        <button onClick={() => setF((x) => ({ ...x, righe: [...x.righe, { descrizione: "", qta: 1, lordo: 0, aliquota: alDef }] }))} className="mt-2 text-xs font-medium brand-accent inline-flex items-center gap-1"><Plus size={13} /> Aggiungi riga</button>
      </div>
      <Field label="Causale (facoltativa)"><input value={f.causale || ""} onChange={(e) => setF((x) => ({ ...x, causale: e.target.value }))} className={inp} /></Field>

      <div className="rounded-xl bg-stone-50 p-3 text-sm flex items-center justify-between gap-3 flex-wrap">
        <span className="text-stone-500">Imponibile {eur(T.imponibile)} · IVA {eur(T.imposta)}{T.bollo ? ` · bollo virtuale ${eur(T.bollo)}` : ""}</span>
        <b className="text-stone-900 text-lg">Totale {eur(T.totale)}</b>
      </div>
      {manca.length ? <p className="text-xs text-amber-700 flex items-start gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-0.5" /> Si può salvare, ma per inviarla allo SDI mancano: {manca.join(", ")}.</p> : null}
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="text-sm font-medium border border-stone-300 text-stone-600 px-4 py-2 rounded-lg hover:bg-stone-50">Annulla</button>
        <button onClick={salva} disabled={!f.righe.length || duplicato} className="text-sm font-medium brand-bg px-4 py-2 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50"><Check size={15} /> Salva {f.tipo === "TD04" ? "nota di credito" : "fattura"}</button>
      </div>
    </section>
  );
}

// ---- esiti e scarico automatici -------------------------------------------
export async function esitoDaEffatta(f) {
  if (!f || !f.effattaId || f.effattaId === "inviata") return { errore: "Effatta non ha restituito un identificativo per questa fattura: controlla l'esito sul sito di Effatta." };
  const r = await effattaApi("esito", { query: "&id=" + encodeURIComponent(f.effattaId) });
  if (!r.ok) return { errore: r.error || "Richiesta non riuscita", grezzo: r.grezzo };
  const d = r.esito != null ? r.esito : null;
  if (typeof d === "string" && d.trim()) return { testo: d.slice(0, 300) };
  const letto = leggiEsitoSdi(d);
  if (letto) return letto;
  return { grezzo: JSON.stringify(d != null ? d : r.grezzo || "").slice(0, 1500) };
}
export const ESITO_OGNI = 2 * 60 * 60 * 1000;
export const esitoDaRifare = (f) => {
  if (!f || !f.effattaId || f.effattaId === "inviata" || f.annullata) return false;
  if (ESITO_DEFINITIVO(f.sdiEsitoTipo)) return false;
  if (!f.sdiEsitoIl) return true;
  const quando = Date.parse(f.sdiEsitoIl);
  return !(quando > 0) || Date.now() - quando >= ESITO_OGNI;
};
// Scarica dai fornitori il mese in corso e quello prima; i già presi si saltano (effattaId e chiave fornitore+numero).
export async function scaricaDaEffatta(acquisti, setAcquisti, mesi) {
  const oggi = new Date();
  const lista = mesi || [oggi, new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1)].map((d) => ({ anno: String(d.getFullYear()), mese: String(d.getMonth() + 1).padStart(2, "0") }));
  const gia = (acquisti || []).map((a) => a.effattaId).filter(Boolean);
  const chiavi = new Set((acquisti || []).map(chiaveAcquisto));
  const nuovi = []; const scartati = []; let errore = "";
  for (const m of lista) {
    const r = await effattaApi("acquisti", { query: `&anno=${m.anno}&mese=${m.mese}&gia=${encodeURIComponent(gia.join(","))}` });
    if (!r.ok) { errore = r.error; continue; }
    if (r.ignoto) { scartati.push("Risposta di Effatta non riconosciuta: " + String(r.grezzo || "").slice(0, 200)); continue; }
    (r.acquisti || []).forEach((a) => { const k = chiaveAcquisto(a); if (chiavi.has(k)) { scartati.push(`${a.numero}: già in archivio`); return; } chiavi.add(k); nuovi.push(a); });
    (r.scartati || []).forEach((s) => scartati.push(s));
  }
  if (nuovi.length) setAcquisti((cur) => { const ch = new Set((cur || []).map(chiaveAcquisto)); return [...nuovi.filter((a) => !ch.has(chiaveAcquisto(a))), ...(cur || [])]; });
  return { nuovi: nuovi.length, scartati, errore: errore && !nuovi.length ? errore : "" };
}

/* Montato in SalonApp: tiene lo stato del collegamento, chiede gli esiti ogni
   2 ore e scarica le fatture dei fornitori ogni ora. */
export function useEffatta({ attiva, fatture, setFatture, acquisti, setAcquisti }) {
  const [stato, setStato] = useState(null);
  const R = useRef({}); R.current = { fatture, setFatture, acquisti, setAcquisti };
  const ricarica = async () => { if (!attiva) { setStato(null); return null; } const s = await effattaApi("stato"); setStato(s.ok ? s : { attivo: false, errore: s.error }); return s; };
  useEffect(() => {
    if (!attiva) { setStato(null); return; }
    let vivo = true;
    const giro = async () => {
      const s = await ricarica();
      if (!vivo || !s || !s.ok || !s.attivo) return;
      const { fatture: fs, setFatture: setFs, acquisti: as, setAcquisti: setAs } = R.current;
      const quali = (fs || []).filter(esitoDaRifare).slice(0, 25);
      const patch = {};
      for (const f of quali) { try { const r = await esitoDaEffatta(f); if (!r || r.errore) continue; patch[f.id] = { sdiEsito: r.testo || "risposta ricevuta ma non riconosciuta", sdiEsitoTipo: r.tipo || "", sdiEsitoIl: new Date().toISOString() }; } catch (e) {} }
      if (vivo && Object.keys(patch).length) setFs((cur) => (cur || []).map((f) => (patch[f.id] ? { ...f, ...patch[f.id] } : f)));
      try { await scaricaDaEffatta(as, setAs); } catch (e) {}
    };
    const t0 = setTimeout(giro, 4000);
    const t = setInterval(() => { if (document.visibilityState !== "hidden") giro(); }, 60 * 60 * 1000);
    const cambiato = () => ricarica();
    window.addEventListener("effatta-cambiato", cambiato);
    return () => { vivo = false; clearTimeout(t0); clearInterval(t); window.removeEventListener("effatta-cambiato", cambiato); };
  }, [attiva]);
  return { attivo: !!(stato && stato.attivo), stato, ricarica };
}

// ---- Impostazioni → Fatture ----------------------------------------------
export function FattureImpostazioni({ config, saveConfig }) {
  const cfgF = fattureConfig(config);
  const d = cfgF.ditta;
  const setD = (p) => saveConfig({ ...config, fatture: { ...cfgF, ditta: { ...d, ...p } } });
  const setF = (p) => saveConfig({ ...config, fatture: { ...cfgF, ...p } });
  const inp = "w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring";
  const campo = (k, label, ph, extra) => <Field label={label}><input defaultValue={d[k] || ""} onBlur={(e) => setD({ [k]: extra ? extra(e.target.value) : e.target.value })} placeholder={ph} className={inp} /></Field>;
  const { numero } = prossimoNumero(cfgF, todayStr());
  return (
    <>
      <section className="lc-card p-5">
        <h3 className="font-semibold text-stone-900 tracking-tight flex items-center gap-2"><Building2 size={16} className="brand-accent" /> La tua attività sulle fatture</h3>
        <p className="text-sm text-stone-500 mt-0.5 mb-4">I dati del cedente che finiscono su ogni fattura elettronica. Compaiono così sul cassetto fiscale dei clienti.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {campo("denominazione", "Denominazione / ragione sociale", "Es. Estetica Aura di Maria Rossi")}
          <div className="grid grid-cols-2 gap-3">{campo("piva", "Partita IVA", "11 cifre", pivaPulita)}{campo("cf", "Codice fiscale", "", cfPulito)}</div>
          <div className="grid grid-cols-[1fr_5rem] gap-3">{campo("indirizzo", "Indirizzo della sede", "Via Roma")}{campo("civico", "Civico", "12")}</div>
          <div className="grid grid-cols-[5rem_1fr_4rem] gap-3">{campo("cap", "CAP", "28047", (v) => v.replace(/\D/g, "").slice(0, 5))}{campo("comune", "Comune", "")}{campo("provincia", "Prov.", "NO", (v) => v.toUpperCase().slice(0, 2))}</div>
          {campo("telefono", "Telefono (facoltativo)", "")}{campo("email", "Email (facoltativa)", "")}
          <Field label="Regime fiscale"><select value={d.regime || "RF01"} onChange={(e) => setD({ regime: e.target.value })} className={`${inp} bg-white`}>{REGIMI_FISCALI.map(([k, l]) => <option key={k} value={k}>{k} · {l}</option>)}</select></Field>
          {forfettario(d) ? <Field label="Natura IVA (operazioni senza IVA)"><select value={d.natura || "N2.2"} onChange={(e) => setD({ natura: e.target.value })} className={`${inp} bg-white`}>{NATURE_IVA.map(([k, l]) => <option key={k} value={k}>{k} · {l}</option>)}</select></Field>
            : <Field label="Aliquota IVA predefinita"><select value={d.aliquota != null ? d.aliquota : 22} onChange={(e) => setD({ aliquota: Number(e.target.value) })} className={`${inp} bg-white`}>{[22, 10, 5, 4].map((a) => <option key={a} value={a}>{a}%</option>)}</select></Field>}
          <div className="grid grid-cols-2 gap-3">{campo("iban", "IBAN (per i bonifici)", "", (v) => v.replace(/\s/g, "").toUpperCase())}{campo("istituto", "Banca", "")}</div>
          <Field label="Pagamento predefinito"><select value={cfgF.pagamento || "MP08"} onChange={(e) => setF({ pagamento: e.target.value })} className={`${inp} bg-white`}>{MODALITA_PAGAMENTO.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        </div>
        {forfettario(d) ? <label className="flex items-start gap-2.5 text-sm text-stone-700 cursor-pointer mt-4"><input type="checkbox" checked={!!d.bollo} onChange={(e) => setD({ bollo: e.target.checked })} className="mt-0.5" /><span><span className="font-medium block">Bollo virtuale da 2 € sulle fatture oltre 77,47 €</span><span className="text-xs text-stone-400">Nel regime forfettario la fattura senza IVA sopra quella soglia porta l'imposta di bollo: viene indicata nell'XML.</span></span></label> : null}
        <div className="grid sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-stone-100">
          <Field label="Formato del numero"><input defaultValue={cfgF.numerazione.formato} onBlur={(e) => setF({ numerazione: { ...cfgF.numerazione, formato: e.target.value || "{n}/{aaaa}" } })} className={inp} /><p className="text-[11px] text-stone-400 mt-1">{"{n}"} = progressivo, {"{aaaa}"} = anno. Prossima: <b>{numero}</b></p></Field>
          <Field label={`Prossimo numero del ${todayStr().slice(0, 4)}`}><input type="number" min={1} defaultValue={prossimoNumero(cfgF, todayStr()).n} onBlur={(e) => setF({ numerazione: { ...cfgF.numerazione, prossimo: { ...(cfgF.numerazione.prossimo || {}), [todayStr().slice(0, 4)]: Math.max(1, Number(e.target.value) || 1) } } })} className={inp} /><p className="text-[11px] text-stone-400 mt-1">Riparte da 1 ogni anno. Cambialo solo se hai già emesso fatture altrove.</p></Field>
        </div>
      </section>
      <EffattaCard />
    </>
  );
}

export function EffattaCard() {
  const [st, setSt] = useState(null);
  const [f, setF] = useState({ utente: "", password: "", idMittente: "", dataUserId: "" });
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const ricarica = async () => { const r = await effattaApi("stato"); setSt(r.ok ? r : { errore: r.error }); if (r.ok) setF((x) => ({ ...x, utente: r.utente || x.utente, idMittente: r.idMittente || x.idMittente, dataUserId: r.dataUserId || x.dataUserId })); };
  useEffect(() => { ricarica(); }, []);
  const salva = async (attivo) => {
    setBusy("salva"); setMsg(null);
    const r = await effattaApi("config", { body: { attivo, utente: f.utente.trim(), password: f.password, idMittente: f.idMittente.trim(), dataUserId: f.dataUserId.trim() } });
    setBusy("");
    if (!r.ok) { setMsg({ ok: false, testo: r.error }); return; }
    setF((x) => ({ ...x, password: "" }));
    setMsg({ ok: true, testo: attivo ? "Collegamento acceso. Premi «Prova il collegamento» per verificarlo." : "Salvato, collegamento spento." });
    try { window.dispatchEvent(new Event("effatta-cambiato")); } catch (e) {}
    ricarica();
  };
  const prova = async () => {
    setBusy("prova"); setMsg(null);
    const r = await effattaApi("prova", { body: {} });
    setBusy("");
    if (!r.ok) { setMsg({ ok: false, testo: r.error || r.errore }); ricarica(); return; }
    const note = [];
    if (r.presi && r.presi.length) note.push("presi dal login: " + r.presi.join(", "));
    if (r.dedotto && !r.dedotto.confermato) note.push(`idMittente dedotto (${r.dedotto.valore}) non confermato: ${r.dedotto.errore}`);
    if (r.checkToken && !r.checkToken.ok) note.push("checkToken: " + r.checkToken.errore);
    setMsg({ ok: !(r.checkToken && !r.checkToken.ok), testo: (r.checkToken && !r.checkToken.ok ? "Login riuscito ma idMittente non accettato." : "Collegamento con Effatta riuscito.") + (note.length ? " · " + note.join(" · ") : "") });
    ricarica();
  };
  const spegni = async () => { if (!confirm("Cancellare le credenziali di Effatta? Le fatture già inviate restano com'erano.")) return; setBusy("spegni"); await effattaApi("spegni", { body: {} }); setBusy(""); setF({ utente: "", password: "", idMittente: "", dataUserId: "" }); setMsg({ ok: true, testo: "Credenziali cancellate." }); try { window.dispatchEvent(new Event("effatta-cambiato")); } catch (e) {} ricarica(); };
  const inp = "w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring";
  return (
    <section className="lc-card p-5">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-xl brand-soft flex items-center justify-center shrink-0"><Send size={20} className="brand-accent" /></span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-stone-900 tracking-tight">Effatta · invio allo SDI</h3>
          <p className="text-sm text-stone-500 mt-0.5">{!st ? "Controllo…" : st.errore ? <span className="text-red-600">{st.errore}</span> : st.attivo ? <><b className="text-green-700">Acceso</b> con l'utente <b>{st.utente}</b>{st.ultimaProva ? ` · ultima prova ${fmtDateTime(Date.parse(st.ultimaProva))} (${st.ultimoEsito})` : ""}</> : st.configurato ? <><b className="text-amber-700">Spento</b> · le credenziali ci sono.</> : <><b>Spento</b> · finché resta spento le fatture si scaricano in XML e si caricano a mano sul cassetto fiscale.</>}</p>
        </div>
      </div>
      <p className="text-xs text-stone-400 mt-3 leading-relaxed">Servono le credenziali del servizio <b>fatture</b> di Effatta (fattura.effatta.it), non quelle dello scontrino elettronico. La password resta sul server e non torna più nel browser. <b>idMittente</b> e <b>dataUserId</b>, se Effatta non li manda col login, te li dà la loro assistenza.</p>
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <Field label="Nome utente"><input value={f.utente} onChange={(e) => setF({ ...f, utente: e.target.value })} className={inp} autoComplete="off" /></Field>
        <Field label={st && st.configurato ? "Password (vuota = lascia quella salvata)" : "Password"}><input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder={st && st.configurato ? "••••••••" : ""} className={inp} autoComplete="new-password" /></Field>
        <Field label="idMittente (se lo conosci)"><input value={f.idMittente} onChange={(e) => setF({ ...f, idMittente: e.target.value })} className={inp} /></Field>
        <Field label="dataUserId (se lo conosci)"><input value={f.dataUserId} onChange={(e) => setF({ ...f, dataUserId: e.target.value })} className={inp} /></Field>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={() => salva(true)} disabled={!!busy || !f.utente.trim() || (!f.password && !(st && st.configurato))} className="text-sm font-medium brand-bg px-3.5 py-2 rounded-lg disabled:opacity-50">{busy === "salva" ? "Salvo…" : st && st.attivo ? "Salva" : "Salva e accendi"}</button>
        {st && st.configurato ? <button onClick={prova} disabled={!!busy} className="text-sm font-medium border border-stone-300 text-stone-600 px-3.5 py-2 rounded-lg hover:bg-stone-50 disabled:opacity-50 inline-flex items-center gap-1.5"><RefreshCw size={14} className={busy === "prova" ? "animate-spin" : ""} /> Prova il collegamento</button> : null}
        {st && st.attivo ? <button onClick={() => salva(false)} disabled={!!busy} className="text-sm font-medium border border-stone-300 text-stone-600 px-3.5 py-2 rounded-lg hover:bg-stone-50 disabled:opacity-50">Spegni</button> : null}
        {st && st.configurato ? <button onClick={spegni} disabled={!!busy} className="text-sm font-medium border border-red-200 text-red-600 px-3.5 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50">Cancella credenziali</button> : null}
      </div>
      {msg ? <p className={`text-sm mt-3 flex items-start gap-1.5 ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.ok ? <Check size={15} className="shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="shrink-0 mt-0.5" />} <span>{msg.testo}</span></p> : null}
    </section>
  );
}

// Nella scheda cliente: i dati fiscali per la fattura.
export function DatiFatturazioneCliente({ client, setClient }) {
  const f = client.fatturazione || {};
  const set = (p) => setClient({ fatturazione: { ...f, ...p } });
  const inp = "w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring";
  return (
    <div className="lc-card p-4">
      <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Receipt size={13} /> Dati per la fattura</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Intestazione (se diversa dal nome)"><input value={f.denominazione || ""} onChange={(e) => set({ denominazione: e.target.value })} placeholder={client.name} className={inp} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Partita IVA"><input value={f.piva || ""} onChange={(e) => set({ piva: pivaPulita(e.target.value) })} className={inp} /></Field>
          <Field label="Codice fiscale"><input value={f.cf || ""} onChange={(e) => set({ cf: cfPulito(e.target.value) })} className={inp} /></Field>
        </div>
        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <Field label="Indirizzo"><input value={f.indirizzo || ""} onChange={(e) => set({ indirizzo: e.target.value })} className={inp} /></Field>
          <Field label="Civico"><input value={f.civico || ""} onChange={(e) => set({ civico: e.target.value })} className={inp} /></Field>
        </div>
        <div className="grid grid-cols-[5rem_1fr_4rem] gap-3">
          <Field label="CAP"><input value={f.cap || ""} onChange={(e) => set({ cap: e.target.value.replace(/\D/g, "").slice(0, 5) })} className={inp} /></Field>
          <Field label="Comune"><input value={f.comune || ""} onChange={(e) => set({ comune: e.target.value })} className={inp} /></Field>
          <Field label="Prov."><input value={f.provincia || ""} onChange={(e) => set({ provincia: e.target.value.toUpperCase().slice(0, 2) })} className={inp} /></Field>
        </div>
        <Field label="Codice destinatario (SDI)"><input value={f.codiceDestinatario || ""} onChange={(e) => set({ codiceDestinatario: e.target.value.toUpperCase().replace(/\s/g, "") })} placeholder="7 caratteri · vuoto per i privati" className={inp} /></Field>
        <Field label="PEC"><input value={f.pec || ""} onChange={(e) => set({ pec: e.target.value })} className={inp} /></Field>
      </div>
    </div>
  );
}
