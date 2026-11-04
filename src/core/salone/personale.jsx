// ============================================================================
// AREA GESTIONE PERSONALE: le ore lavorate di ogni dipendente e i fogli ore
// da mandare a chi fa le buste paga.
//
// Tutto sta nella collezione `personale`:
//   { dipendenti: [{ id, nome, staffId?, mansione, oreSettimanali, oreGiorno, giorni:[1..6], matricola, note, attivo }],
//     ore: { "<dipId>": { "<YYYY-MM-DD>": { tipo, entrata, uscita, pausa, note } } },
//     assenze: { "<dipId>": [{ id, dal, al, tipo, note }] },   // ferie, permessi, malattia pianificati
//     consulente: { nome, email, oggetto }, invii: [{ il, mese, dipId, a }] }
// Le assenze pianificate di un operatore dell'agenda finiscono anche fra le
// sue ferie in config.staff[].off (stesso id), così l'agenda lo sa; nel
// foglio ore il giorno risulta di quel tipo se non è stato scritto altro.
// Le timbrature dal telefono (/utenti, POST /api/timbra) arrivano in `ore`
// col segno `timbrato`. Le provvigioni (% su servizi e prodotti) stanno sul
// dipendente e si calcolano nel riepilogo del mese dagli appuntamenti svolti
// e dalle vendite con «venduto da».
// I dipendenti nascono dagli operatori (config.staff) e si possono aggiungere
// a mano (chi non lavora in agenda, es. la reception). Un giorno ha un tipo:
// lavoro (entrata/uscita/pausa → ore), ferie, permesso, malattia, festivo,
// riposo. Il foglio ore mensile si stampa, si esporta in CSV e, col modulo
// Google, parte via email al consulente dalla casella del titolare.
// ============================================================================
import { useState, useMemo, useEffect } from "react";
import { Users, Clock, Printer, Download, Send, Check, AlertTriangle, ChevronLeft, ChevronRight, Plus, Trash2, Wand2, CalendarDays, Table2, Mail, Smartphone, Percent } from "lucide-react";
import { uid, pad, minToStr, strToMin, DAY_NAMES, WDAY_SHORT, MONTHS, todayStr, fmtDateTime, useMods, Field, eur } from "./comuni.jsx";
import { gmailApi } from "./google.jsx";

export const TIPI_GIORNO = [["lavoro", "Lavoro"], ["riposo", "Riposo"], ["ferie", "Ferie"], ["permesso", "Permesso"], ["malattia", "Malattia"], ["festivo", "Festivo"], ["altro", "Altro"]];
const MESI_LUNGHI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
export const DEFAULT_PERSONALE = { dipendenti: [], ore: {}, assenze: {}, consulente: { nome: "", email: "", oggetto: "Foglio ore {mese} · {dipendente} · {salone}" }, invii: [] };
export const TIPI_ASSENZA = [["ferie", "Ferie"], ["permesso", "Permesso"], ["malattia", "Malattia"], ["altro", "Altro"]];
// L'assenza pianificata che copre un giorno, se c'è.
export function assenzaDel(P, dipId, data) { return ((P.assenze || {})[dipId] || []).find((a) => a && a.dal <= data && data <= a.al) || null; }
// Il giorno come conta nel foglio: ciò che è scritto, altrimenti l'assenza pianificata.
export function giornoEffettivo(P, dip, data) { const g = ((P.ore || {})[dip.id] || {})[data]; if (g && g.tipo) return g; const a = assenzaDel(P, dip.id, data); return a ? { tipo: a.tipo, note: a.note || "", pianificata: true } : null; }
export const personaleConfig = (p) => ({ ...DEFAULT_PERSONALE, ...(p || {}), consulente: { ...DEFAULT_PERSONALE.consulente, ...((p && p.consulente) || {}) } });
export const ore2 = (min) => (Math.round((min / 60) * 100) / 100).toFixed(2).replace(".", ",");
export const oreHm = (min) => `${Math.floor(min / 60)}:${pad(min % 60)}`;
const meseDi = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const giorniDelMese = (mese) => { const [y, m] = mese.split("-").map(Number); const n = new Date(y, m, 0).getDate(); return Array.from({ length: n }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`); };
const etichettaMese = (mese) => { const [y, m] = mese.split("-").map(Number); return `${MESI_LUNGHI[m - 1]} ${y}`; };
const spostaMese = (mese, n) => { const [y, m] = mese.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return meseDi(d); };

// I dipendenti: gli operatori dell'agenda più quelli aggiunti a mano.
export function dipendentiDi(config, personale) {
  const P = personaleConfig(personale);
  const extra = P.dipendenti || [];
  const daStaff = (config.staff || []).map((s) => { const e = extra.find((x) => x.staffId === s.id) || {}; return { id: e.id || "st-" + s.id, staffId: s.id, nome: s.name, mansione: e.mansione || s.role || "", oreSettimanali: e.oreSettimanali != null ? e.oreSettimanali : 40, oreGiorno: e.oreGiorno != null ? e.oreGiorno : 8, giorni: e.giorni || Object.keys(s.availability || {}).map(Number).filter((k) => (s.availability[k] || []).length), matricola: e.matricola || "", note: e.note || "", attivo: e.attivo !== false, dallStaff: true }; });
  const soloExtra = extra.filter((e) => !e.staffId).map((e) => ({ oreSettimanali: 40, oreGiorno: 8, giorni: [1, 2, 3, 4, 5], attivo: true, ...e }));
  return [...daStaff, ...soloExtra];
}
// Un giorno di lavoro: minuti lavorati, ordinari e straordinari.
export function minutiGiorno(g, dip) {
  if (!g || g.tipo !== "lavoro" || !g.entrata || !g.uscita) return { lavorati: 0, ordinari: 0, straordinari: 0 };
  const lav = Math.max(0, strToMin(g.uscita) - strToMin(g.entrata) - (Number(g.pausa) || 0));
  const giorno = Math.round((Number(dip.oreGiorno) || 8) * 60);
  return { lavorati: lav, ordinari: Math.min(lav, giorno), straordinari: Math.max(0, lav - giorno) };
}
export function totaliMese(P, dip, mese) {
  const t = { lavorati: 0, ordinari: 0, straordinari: 0, giorniLavoro: 0, ferie: 0, permesso: 0, malattia: 0, festivo: 0, riposo: 0, altro: 0 };
  for (const d of giorniDelMese(mese)) {
    const g = giornoEffettivo(P, dip, d); if (!g || !g.tipo) continue;
    if (g.tipo === "lavoro") { const m = minutiGiorno(g, dip); if (m.lavorati) t.giorniLavoro++; t.lavorati += m.lavorati; t.ordinari += m.ordinari; t.straordinari += m.straordinari; }
    else if (t[g.tipo] != null) t[g.tipo]++;
  }
  return t;
}
// Provvigioni del mese: % sui servizi svolti (appuntamenti done/partial con quell'operatore)
// e % sui prodotti venduti con «venduto da» in cassa.
export function provvigioniMese(dip, config, bookings, sales, mese) {
  const ps = Number(dip.provvigioneServizi) || 0, pp = Number(dip.provvigioneProdotti) || 0;
  const prezzo = (b) => (b.amount != null && b.amount !== "" ? Number(b.amount) || 0 : (b.serviceIds || []).reduce((a, id) => { const s = ((config && config.services) || []).find((x) => x.id === id); return a + ((s && Number(s.price)) || 0); }, 0));
  const servizi = dip.staffId ? (bookings || []).filter((b) => b && b.staffId === dip.staffId && (b.status === "done" || b.status === "partial") && String(b.date || "").slice(0, 7) === mese).reduce((a, b) => a + prezzo(b), 0) : 0;
  const prodotti = dip.staffId ? (sales || []).filter((x) => x && x.type === "sale" && x.staffId === dip.staffId && !x.annullato && x.ts && `${new Date(x.ts).getFullYear()}-${pad(new Date(x.ts).getMonth() + 1)}` === mese).reduce((a, x) => a + (x.items || []).filter((it) => it.productId).reduce((y, it) => y + (Number(it.price) || 0) * (Number(it.qty) || 0), 0), 0) : 0;
  const r = (x) => Math.round(x * 100) / 100;
  return { servizi: r(servizi), prodotti: r(prodotti), suServizi: r(servizi * ps / 100), suProdotti: r(prodotti * pp / 100), totale: r(servizi * ps / 100 + prodotti * pp / 100), ps, pp };
}
// Proposta dagli orari di lavoro dell'operatore (availability): primo ingresso, ultima uscita, pausa in mezzo.
function daOrariOperatore(config, dip, data) {
  const s = (config.staff || []).find((x) => x.id === dip.staffId);
  const wd = new Date(data + "T12:00:00").getDay();
  const fasce = s && s.availability ? (s.availability[wd] || []) : [];
  if (!fasce.length) return (dip.giorni || []).includes(wd) ? { tipo: "lavoro", entrata: "09:00", uscita: minToStr(540 + Math.round((Number(dip.oreGiorno) || 8) * 60)), pausa: 0 } : { tipo: "riposo" };
  const ord = fasce.slice().sort((a, b) => a[0] - b[0]);
  const entrata = ord[0][0], uscita = ord[ord.length - 1][1];
  const pausa = ord.reduce((a, f) => a + (f[1] - f[0]), 0);
  return { tipo: "lavoro", entrata: minToStr(entrata), uscita: minToStr(uscita), pausa: Math.max(0, uscita - entrata - pausa) };
}

export function PersonaleView({ config, saveConfig, personale, setPersonale, sezione, setSezione, demo, bookings = [], sales = [] }) {
  const F = useMods();
  const P = personaleConfig(personale);
  const dipendenti = dipendentiDi(config, personale);
  const attivi = dipendenti.filter((d) => d.attivo);
  const [mese, setMese] = useState(() => meseDi(new Date()));
  const [dipId, setDipId] = useState(() => (attivi[0] ? attivi[0].id : ""));
  useEffect(() => { if (!attivi.some((d) => d.id === dipId) && attivi[0]) setDipId(attivi[0].id); }, [attivi.length]);
  const salva = (patch) => setPersonale({ ...P, ...patch });
  const lock = (node) => (demo ? <div><div className="mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" /> In demo i fogli ore sono <b>visibili ma non modificabili</b>.</div><fieldset disabled style={{ border: 0, margin: 0, padding: 0, minInlineSize: "auto" }}>{node}</fieldset></div> : node);
  return (
    <>
      {sezione === "fogli" ? lock(<FogliOre config={config} P={P} salva={salva} dipendenti={attivi} dipId={dipId} setDipId={setDipId} mese={mese} setMese={setMese} google={F.has("google")} />) : null}
      {sezione === "riepilogo" ? <RiepilogoMese config={config} P={P} dipendenti={attivi} mese={mese} setMese={setMese} salva={salva} google={F.has("google")} bookings={bookings} sales={sales} /> : null}
      {sezione === "pianificazione" ? lock(<Pianificazione config={config} saveConfig={saveConfig} P={P} salva={salva} dipendenti={attivi} />) : null}
      {sezione === "dipendenti" ? lock(<Dipendenti config={config} P={P} salva={salva} dipendenti={dipendenti} />) : null}
    </>
  );
}

function SelettoreMese({ mese, setMese }) {
  return (
    <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg px-1 py-1">
      <button onClick={() => setMese(spostaMese(mese, -1))} className="w-8 h-8 flex items-center justify-center rounded-md text-stone-500 hover:bg-stone-100"><ChevronLeft size={16} /></button>
      <span className="text-sm font-medium min-w-[9rem] text-center">{etichettaMese(mese)}</span>
      <button onClick={() => setMese(spostaMese(mese, 1))} className="w-8 h-8 flex items-center justify-center rounded-md text-stone-500 hover:bg-stone-100"><ChevronRight size={16} /></button>
    </div>
  );
}

// ---- Il foglio ore di un dipendente, un mese ---------------------------------
function FogliOre({ config, P, salva, dipendenti, dipId, setDipId, mese, setMese, google }) {
  const dip = dipendenti.find((d) => d.id === dipId);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const giorni = giorniDelMese(mese);
  const oreDip = (dip && (P.ore || {})[dip.id]) || {};
  const setGiorno = (data, patch) => { if (!dip) return; const cur = oreDip[data] || {}; const n = { ...cur, ...patch }; if (n.tipo && n.tipo !== "lavoro") { delete n.entrata; delete n.uscita; delete n.pausa; } salva({ ore: { ...(P.ore || {}), [dip.id]: { ...oreDip, [data]: n } } }); };
  const compila = () => {
    if (!dip) return;
    if (!confirm("Compilare i giorni vuoti del mese con gli orari di lavoro abituali? I giorni già scritti restano com'erano.")) return;
    const n = { ...oreDip };
    for (const d of giorni) { if (n[d] && n[d].tipo) continue; const a = assenzaDel(P, dip.id, d); n[d] = a ? { tipo: a.tipo, note: a.note || "" } : daOrariOperatore(config, dip, d); }
    salva({ ore: { ...(P.ore || {}), [dip.id]: n } });
  };
  const svuota = () => { if (!dip || !confirm(`Cancellare tutte le ore di ${dip.nome} per ${etichettaMese(mese)}?`)) return; const n = { ...oreDip }; giorni.forEach((d) => { delete n[d]; }); salva({ ore: { ...(P.ore || {}), [dip.id]: n } }); };
  const T = dip ? totaliMese(P, dip, mese) : null;
  const invia = async () => {
    if (!P.consulente.email) { setMsg({ ok: false, testo: "Scrivi prima l'email del consulente in «Dipendenti»." }); return; }
    setBusy(true); setMsg(null);
    const r = await inviaFogli([dip], config, P, mese);
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, testo: r.error }); return; }
    salva({ invii: [{ il: new Date().toISOString(), mese, dipId: dip.id, a: P.consulente.email }, ...(P.invii || [])].slice(0, 200) });
    setMsg({ ok: true, testo: `Foglio ore di ${dip.nome} mandato a ${P.consulente.email}.` });
  };
  const ultimoInvio = dip ? (P.invii || []).find((i) => i.dipId === dip.id && i.mese === mese) : null;
  const inp = "px-2 py-1.5 rounded-lg border border-stone-300 text-sm brand-ring";
  if (!dipendenti.length) return <div className="lc-card p-10 text-center text-stone-400 text-sm">Nessun dipendente: gli operatori dell'agenda compaiono qui da soli, altri si aggiungono in «Dipendenti».</div>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={dipId} onChange={(e) => setDipId(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring">{dipendenti.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</select>
        <SelettoreMese mese={mese} setMese={setMese} />
        <div className="flex-1 basis-full sm:basis-auto" />
        <button onClick={compila} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5" title="Riempie i giorni vuoti con gli orari di lavoro dell'operatore"><Wand2 size={14} /> Compila dagli orari</button>
        <button onClick={() => stampaFoglio([dip], config, P, mese)} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Printer size={14} /> Stampa / PDF</button>
        <button onClick={() => scaricaCsv([dip], config, P, mese)} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Download size={14} /> CSV</button>
        {google ? <button onClick={invia} disabled={busy} className="text-sm font-medium brand-bg px-3 py-2 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50"><Send size={14} /> {busy ? "Invio…" : "Invia al consulente"}</button> : null}
      </div>
      {msg ? <p className={`text-sm flex items-center gap-1.5 ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.ok ? <Check size={15} /> : <AlertTriangle size={15} />} {msg.testo}</p> : null}
      {dip && T ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lc-card p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide">Ore lavorate</div><div className="text-xl font-semibold">{oreHm(T.lavorati)}</div><div className="text-xs text-stone-400">{T.giorniLavoro} giorni</div></div>
          <div className="lc-card p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide">Ordinarie</div><div className="text-xl font-semibold">{oreHm(T.ordinari)}</div><div className="text-xs text-stone-400">{dip.oreGiorno} h al giorno</div></div>
          <div className="lc-card p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide">Straordinari</div><div className={`text-xl font-semibold ${T.straordinari ? "text-amber-600" : ""}`}>{oreHm(T.straordinari)}</div><div className="text-xs text-stone-400">oltre le {dip.oreGiorno} h</div></div>
          <div className="lc-card p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide">Ferie · permessi</div><div className="text-xl font-semibold">{T.ferie} · {T.permesso}</div><div className="text-xs text-stone-400">giorni</div></div>
          <div className="lc-card p-3"><div className="text-[11px] text-stone-400 uppercase tracking-wide">Malattia</div><div className="text-xl font-semibold">{T.malattia}</div><div className="text-xs text-stone-400">{ultimoInvio ? `inviato il ${fmtDateTime(Date.parse(ultimoInvio.il))}` : "non ancora inviato"}</div></div>
        </div>
      ) : null}
      <div className="lc-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[40rem]">
            <thead><tr className="text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-100"><th className="text-left font-medium px-3 py-2">Giorno</th><th className="text-left font-medium px-3 py-2">Tipo</th><th className="text-left font-medium px-3 py-2">Entrata</th><th className="text-left font-medium px-3 py-2">Uscita</th><th className="text-left font-medium px-3 py-2">Pausa (min)</th><th className="text-right font-medium px-3 py-2">Ore</th><th className="text-right font-medium px-3 py-2">Straord.</th><th className="text-left font-medium px-3 py-2">Note</th></tr></thead>
            <tbody>{giorni.map((d) => {
              const scritto = oreDip[d] || {}; const pian = !scritto.tipo && dip ? assenzaDel(P, dip.id, d) : null; const g = pian ? { tipo: pian.tipo, note: pian.note || "" } : scritto; const wd = new Date(d + "T12:00:00").getDay(); const m = dip ? minutiGiorno(g, dip) : { lavorati: 0, straordinari: 0 };
              const festivo = wd === 0; const oggi = d === todayStr();
              return (
                <tr key={d} className={`border-b border-stone-50 last:border-0 ${festivo ? "bg-stone-50/70" : ""} ${oggi ? "ring-1 ring-inset brand-border" : ""}`}>
                  <td className="px-3 py-1.5 whitespace-nowrap"><span className={`font-medium ${festivo ? "text-stone-400" : "text-stone-800"}`}>{WDAY_SHORT[wd]} {Number(d.slice(8))}</span>{scritto.timbrato ? <span className="ml-1 inline-flex align-middle text-sky-600" title="Timbrato dal telefono"><Smartphone size={12} /></span> : null}{pian ? <span className="ml-1 text-[10px] text-stone-400" title="Dalla pianificazione">pian.</span> : null}</td>
                  <td className="px-3 py-1.5"><select value={g.tipo || ""} onChange={(e) => setGiorno(d, { tipo: e.target.value })} className={`${inp} bg-white`}><option value="">—</option>{TIPI_GIORNO.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
                  <td className="px-3 py-1.5">{g.tipo === "lavoro" ? <input type="time" value={g.entrata || ""} onChange={(e) => setGiorno(d, { entrata: e.target.value })} className={inp} /> : null}</td>
                  <td className="px-3 py-1.5">{g.tipo === "lavoro" ? <input type="time" value={g.uscita || ""} onChange={(e) => setGiorno(d, { uscita: e.target.value })} className={inp} /> : null}</td>
                  <td className="px-3 py-1.5">{g.tipo === "lavoro" ? <input type="number" min={0} step={5} value={g.pausa != null ? g.pausa : ""} placeholder="0" onChange={(e) => setGiorno(d, { pausa: Math.max(0, Number(e.target.value) || 0) })} className={`${inp} w-20 text-right`} /> : null}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium">{g.tipo === "lavoro" && m.lavorati ? oreHm(m.lavorati) : ""}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-amber-600">{m.straordinari ? oreHm(m.straordinari) : ""}</td>
                  <td className="px-3 py-1.5"><input value={g.note || ""} onChange={(e) => setGiorno(d, { note: e.target.value })} placeholder="" className={`${inp} w-full min-w-[8rem]`} /></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
      <button onClick={svuota} className="text-xs text-stone-400 hover:text-red-600 inline-flex items-center gap-1"><Trash2 size={13} /> Svuota il mese</button>
    </div>
  );
}

// ---- Tutti i dipendenti in un mese --------------------------------------
function RiepilogoMese({ config, P, dipendenti, mese, setMese, salva, google, bookings, sales }) {
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const righe = dipendenti.map((d) => ({ d, t: totaliMese(P, d, mese), pv: provvigioniMese(d, config, bookings, sales, mese) }));
  const conProvvigioni = righe.some((r) => r.pv.ps || r.pv.pp);
  const totProvv = Math.round(righe.reduce((a, r) => a + r.pv.totale, 0) * 100) / 100;
  const tot = righe.reduce((a, r) => ({ lavorati: a.lavorati + r.t.lavorati, straordinari: a.straordinari + r.t.straordinari, ferie: a.ferie + r.t.ferie, permesso: a.permesso + r.t.permesso, malattia: a.malattia + r.t.malattia }), { lavorati: 0, straordinari: 0, ferie: 0, permesso: 0, malattia: 0 });
  const inviaTutti = async () => {
    if (!P.consulente.email) { setMsg({ ok: false, testo: "Scrivi prima l'email del consulente in «Dipendenti»." }); return; }
    if (!confirm(`Mandare a ${P.consulente.email} i fogli ore di ${etichettaMese(mese)} per ${dipendenti.length} dipendent${dipendenti.length === 1 ? "e" : "i"}?`)) return;
    setBusy(true); setMsg(null);
    const r = await inviaFogli(dipendenti, config, P, mese);
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, testo: r.error }); return; }
    salva({ invii: [...dipendenti.map((d) => ({ il: new Date().toISOString(), mese, dipId: d.id, a: P.consulente.email })), ...(P.invii || [])].slice(0, 200) });
    setMsg({ ok: true, testo: `Fogli ore di ${etichettaMese(mese)} mandati a ${P.consulente.email}.` });
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SelettoreMese mese={mese} setMese={setMese} />
        <div className="flex-1" />
        <button onClick={() => stampaFoglio(dipendenti, config, P, mese)} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Printer size={14} /> Stampa tutti</button>
        <button onClick={() => scaricaCsv(dipendenti, config, P, mese)} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Download size={14} /> CSV</button>
        {google ? <button onClick={inviaTutti} disabled={busy || !dipendenti.length} className="text-sm font-medium brand-bg px-3 py-2 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50"><Send size={14} /> {busy ? "Invio…" : "Invia tutti al consulente"}</button> : null}
      </div>
      {msg ? <p className={`text-sm flex items-center gap-1.5 ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.ok ? <Check size={15} /> : <AlertTriangle size={15} />} {msg.testo}</p> : null}
      <div className="lc-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[40rem]">
            <thead><tr className="text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-100"><th className="text-left font-medium px-3 py-2">Dipendente</th><th className="text-right font-medium px-3 py-2">Giorni</th><th className="text-right font-medium px-3 py-2">Ore lavorate</th><th className="text-right font-medium px-3 py-2">Ordinarie</th><th className="text-right font-medium px-3 py-2">Straordinari</th><th className="text-right font-medium px-3 py-2">Ferie</th><th className="text-right font-medium px-3 py-2">Permessi</th><th className="text-right font-medium px-3 py-2">Malattia</th>{conProvvigioni ? <th className="text-right font-medium px-3 py-2" title="Dagli appuntamenti svolti e dalle vendite con «venduto da»">Provvigioni</th> : null}<th className="text-left font-medium px-3 py-2">Inviato</th></tr></thead>
            <tbody>{righe.map(({ d, t, pv }) => { const inv = (P.invii || []).find((i) => i.dipId === d.id && i.mese === mese); return (
              <tr key={d.id} className="border-b border-stone-50 last:border-0"><td className="px-3 py-2 font-medium">{d.nome}<div className="text-xs text-stone-400 font-normal">{d.mansione}{d.matricola ? ` · matr. ${d.matricola}` : ""}</div></td><td className="px-3 py-2 text-right tabular-nums">{t.giorniLavoro}</td><td className="px-3 py-2 text-right tabular-nums font-medium">{oreHm(t.lavorati)}</td><td className="px-3 py-2 text-right tabular-nums">{oreHm(t.ordinari)}</td><td className="px-3 py-2 text-right tabular-nums text-amber-600">{t.straordinari ? oreHm(t.straordinari) : "—"}</td><td className="px-3 py-2 text-right tabular-nums">{t.ferie || "—"}</td><td className="px-3 py-2 text-right tabular-nums">{t.permesso || "—"}</td><td className="px-3 py-2 text-right tabular-nums">{t.malattia || "—"}</td>{conProvvigioni ? <td className="px-3 py-2 text-right tabular-nums">{pv.ps || pv.pp ? <span className="font-medium">{eur(pv.totale)}</span> : "—"}{pv.ps || pv.pp ? <div className="text-[10px] text-stone-400">{pv.ps ? `${pv.ps}% su ${eur(pv.servizi)}` : ""}{pv.ps && pv.pp ? " · " : ""}{pv.pp ? `${pv.pp}% su ${eur(pv.prodotti)}` : ""}</div> : null}</td> : null}<td className="px-3 py-2 text-xs text-stone-500">{inv ? fmtDateTime(Date.parse(inv.il)) : "—"}</td></tr>
            ); })}</tbody>
            {righe.length ? <tfoot><tr className="border-t border-stone-200 font-semibold"><td className="px-3 py-2">Totale</td><td /><td className="px-3 py-2 text-right tabular-nums">{oreHm(tot.lavorati)}</td><td /><td className="px-3 py-2 text-right tabular-nums text-amber-600">{tot.straordinari ? oreHm(tot.straordinari) : "—"}</td><td className="px-3 py-2 text-right">{tot.ferie || "—"}</td><td className="px-3 py-2 text-right">{tot.permesso || "—"}</td><td className="px-3 py-2 text-right">{tot.malattia || "—"}</td>{conProvvigioni ? <td className="px-3 py-2 text-right tabular-nums">{eur(totProvv)}</td> : null}<td /></tr></tfoot> : null}
          </table>
        </div>
        {!righe.length ? <div className="p-10 text-center text-stone-400 text-sm">Nessun dipendente attivo.</div> : null}
      </div>
    </div>
  );
}

// ---- Dipendenti e consulente -------------------------------------------------
function Dipendenti({ config, P, salva, dipendenti }) {
  const extra = P.dipendenti || [];
  const setDip = (d, patch) => {
    const e = extra.find((x) => x.id === d.id);
    const nuovo = e ? { ...e, ...patch } : { id: d.id, staffId: d.staffId || null, nome: d.nome, ...patch };
    salva({ dipendenti: e ? extra.map((x) => (x.id === d.id ? nuovo : x)) : [...extra, nuovo] });
  };
  const aggiungi = () => salva({ dipendenti: [...extra, { id: uid(), nome: "Nuovo dipendente", mansione: "", oreSettimanali: 40, oreGiorno: 8, giorni: [1, 2, 3, 4, 5], attivo: true }] });
  const togli = (d) => { if (!confirm(`Togliere ${d.nome}? Le sue ore registrate restano nell'archivio.`)) return; salva({ dipendenti: extra.filter((x) => x.id !== d.id) }); };
  const inp = "w-full px-3 py-2 rounded-lg border border-stone-300 text-sm brand-ring";
  return (
    <div className="space-y-4">
      <section className="lc-card p-5">
        <h3 className="font-semibold text-stone-900 tracking-tight flex items-center gap-2"><Mail size={16} className="brand-accent" /> Chi fa le buste paga</h3>
        <p className="text-sm text-stone-500 mt-0.5 mb-3">I fogli ore partono a questo indirizzo (col modulo Google, dalla tua casella Gmail). Segnaposto nell'oggetto: {"{mese} {dipendente} {salone}"}.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Nome / studio"><input defaultValue={P.consulente.nome} onBlur={(e) => salva({ consulente: { ...P.consulente, nome: e.target.value } })} placeholder="Studio Rossi" className={inp} /></Field>
          <Field label="Email"><input defaultValue={P.consulente.email} onBlur={(e) => salva({ consulente: { ...P.consulente, email: e.target.value.trim() } })} placeholder="paghe@studio.it" className={inp} /></Field>
          <Field label="Oggetto dell'email"><input defaultValue={P.consulente.oggetto} onBlur={(e) => salva({ consulente: { ...P.consulente, oggetto: e.target.value } })} className={inp} /></Field>
        </div>
      </section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-stone-900 tracking-tight flex items-center gap-2"><Users size={16} className="brand-accent" /> Dipendenti</h3>
        <button onClick={aggiungi} className="flex items-center gap-1 text-sm brand-bg px-3 py-1.5 rounded-lg"><Plus size={15} /> Aggiungi</button>
      </div>
      <div className="space-y-2">{dipendenti.map((d) => (
        <div key={d.id} className={`lc-card p-4 ${d.attivo ? "" : "opacity-60"}`}>
          <div className="grid sm:grid-cols-4 gap-3">
            <Field label="Nome">{d.dallStaff ? <div className="px-3 py-2 text-sm font-medium">{d.nome} <span className="text-xs text-stone-400 font-normal">· operatore dell'agenda</span></div> : <input value={d.nome} onChange={(e) => setDip(d, { nome: e.target.value })} className={inp} />}</Field>
            <Field label="Mansione"><input value={d.mansione || ""} onChange={(e) => setDip(d, { mansione: e.target.value })} placeholder="Estetista" className={inp} /></Field>
            <Field label="Ore a settimana"><input type="number" min={0} step={0.5} value={d.oreSettimanali} onChange={(e) => setDip(d, { oreSettimanali: Number(e.target.value) || 0 })} className={inp} /></Field>
            <Field label="Ore al giorno (oltre = straordinario)"><input type="number" min={0} step={0.5} value={d.oreGiorno} onChange={(e) => setDip(d, { oreGiorno: Number(e.target.value) || 0 })} className={inp} /></Field>
            <Field label="Giorni lavorativi"><div className="flex gap-1">{[1, 2, 3, 4, 5, 6, 0].map((k) => { const on = (d.giorni || []).includes(k); return <button key={k} onClick={() => setDip(d, { giorni: on ? (d.giorni || []).filter((x) => x !== k) : [...(d.giorni || []), k] })} className={`w-9 h-9 rounded-lg text-xs font-medium border transition ${on ? "brand-bg border-transparent" : "bg-white border-stone-200 text-stone-500"}`}>{WDAY_SHORT[k]}</button>; })}</div></Field>
            <Field label="Matricola (facoltativa)"><input value={d.matricola || ""} onChange={(e) => setDip(d, { matricola: e.target.value })} className={inp} /></Field>
            <Field label="Note per il consulente"><input value={d.note || ""} onChange={(e) => setDip(d, { note: e.target.value })} placeholder="Es. part-time, apprendista" className={inp} /></Field>
            {d.staffId ? <Field label="Provvigione sui servizi (%)"><input type="number" min={0} max={100} step={0.5} value={d.provvigioneServizi != null ? d.provvigioneServizi : ""} placeholder="0" onChange={(e) => setDip(d, { provvigioneServizi: e.target.value === "" ? null : Number(e.target.value) })} className={inp} /></Field> : null}
            {d.staffId ? <Field label="Provvigione sui prodotti (%)"><input type="number" min={0} max={100} step={0.5} value={d.provvigioneProdotti != null ? d.provvigioneProdotti : ""} placeholder="0" onChange={(e) => setDip(d, { provvigioneProdotti: e.target.value === "" ? null : Number(e.target.value) })} className={inp} /></Field> : null}
            <div className="flex items-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer"><input type="checkbox" checked={d.attivo} onChange={(e) => setDip(d, { attivo: e.target.checked })} /> In forza</label>
              {!d.dallStaff ? <button onClick={() => togli(d)} className="ml-auto text-xs text-stone-400 hover:text-red-600 inline-flex items-center gap-1"><Trash2 size={13} /> Togli</button> : null}
            </div>
          </div>
        </div>
      ))}</div>
    </div>
  );
}

// ---- Pianificazione: ferie, permessi e malattie di ogni dipendente ---------------
// Per gli operatori dell'agenda il periodo finisce anche in config.staff[].off
// (stesso id): l'agenda e la prenotazione online non propongono quei giorni.
function Pianificazione({ config, saveConfig, P, salva, dipendenti }) {
  const [dipId, setDipId] = useState(() => (dipendenti[0] ? dipendenti[0].id : ""));
  const [nuova, setNuova] = useState({ dal: todayStr(), al: todayStr(), tipo: "ferie", note: "" });
  const dip = dipendenti.find((d) => d.id === dipId);
  const lista = (dip && (P.assenze || {})[dip.id]) || [];
  const inAgenda = (d, id, periodo) => {
    if (!d || !d.staffId || !saveConfig) return;
    const staff = (config.staff || []).map((s) => { if (s.id !== d.staffId) return s; const off = (s.off || []).filter((o) => o.id !== id); return { ...s, off: periodo ? [...off, { id, from: periodo.dal, to: periodo.al }] : off }; });
    saveConfig({ ...config, staff });
  };
  const aggiungi = () => {
    if (!dip || !nuova.dal || !nuova.al || nuova.al < nuova.dal) { alert("Controlla le date."); return; }
    const a = { id: uid(), ...nuova, note: nuova.note.trim() };
    salva({ assenze: { ...(P.assenze || {}), [dip.id]: [...lista, a].sort((x, y) => x.dal.localeCompare(y.dal)) } });
    if (a.tipo !== "altro") inAgenda(dip, a.id, a);
    setNuova({ ...nuova, note: "" });
  };
  const togli = (a) => { salva({ assenze: { ...(P.assenze || {}), [dip.id]: lista.filter((x) => x.id !== a.id) } }); inAgenda(dip, a.id, null); };
  const giorni = (a) => Math.round((new Date(a.al + "T12:00:00") - new Date(a.dal + "T12:00:00")) / 86400000) + 1;
  const prossime = dipendenti.flatMap((d) => ((P.assenze || {})[d.id] || []).filter((a) => a.al >= todayStr()).map((a) => ({ ...a, nome: d.nome }))).sort((x, y) => x.dal.localeCompare(y.dal)).slice(0, 12);
  const inp = "px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white brand-ring";
  const etichettaTipo = (t) => (TIPI_ASSENZA.find((x) => x[0] === t) || [])[1] || t;
  if (!dipendenti.length) return <div className="lc-card p-10 text-center text-stone-400 text-sm">Nessun dipendente attivo.</div>;
  return (
    <div className="space-y-4">
      <section className="lc-card p-5">
        <h3 className="font-semibold text-stone-900 tracking-tight flex items-center gap-2"><CalendarDays size={16} className="brand-accent" /> Pianifica ferie, permessi e malattie</h3>
        <p className="text-sm text-stone-500 mt-0.5 mb-3">I giorni pianificati compaiono nel foglio ore (finché non scrivi altro) e, per chi lavora in agenda, bloccano le prenotazioni in quei giorni.</p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Dipendente"><select value={dipId} onChange={(e) => setDipId(e.target.value)} className={inp}>{dipendenti.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></Field>
          <Field label="Tipo"><select value={nuova.tipo} onChange={(e) => setNuova({ ...nuova, tipo: e.target.value })} className={inp}>{TIPI_ASSENZA.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Dal"><input type="date" value={nuova.dal} onChange={(e) => setNuova({ ...nuova, dal: e.target.value, al: nuova.al < e.target.value ? e.target.value : nuova.al })} className={inp} /></Field>
          <Field label="Al"><input type="date" value={nuova.al} onChange={(e) => setNuova({ ...nuova, al: e.target.value })} className={inp} /></Field>
          <Field label="Note"><input value={nuova.note} onChange={(e) => setNuova({ ...nuova, note: e.target.value })} placeholder="facoltative" className={inp} /></Field>
          <button onClick={aggiungi} className="text-sm font-medium brand-bg px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5"><Plus size={15} /> Aggiungi</button>
        </div>
      </section>
      <section className="lc-card p-5">
        <h4 className="font-semibold text-sm text-stone-900 mb-2">{dip ? dip.nome : ""} · periodi pianificati</h4>
        {lista.length === 0 ? <p className="text-sm text-stone-400">Nessun periodo.</p> : <div className="space-y-1.5">{lista.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-2 text-sm bg-stone-50 rounded-lg px-3 py-2">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${a.tipo === "malattia" ? "bg-red-100 text-red-700" : a.tipo === "ferie" ? "bg-sky-100 text-sky-700" : "bg-stone-200 text-stone-700"}`}>{etichettaTipo(a.tipo)}</span>
            <span className="tabular-nums">{a.dal.split("-").reverse().join("/")} → {a.al.split("-").reverse().join("/")}</span><span className="text-xs text-stone-400">{giorni(a)} giorn{giorni(a) === 1 ? "o" : "i"}</span>
            {a.note ? <span className="text-xs text-stone-500">· {a.note}</span> : null}
            <button onClick={() => togli(a)} className="ml-auto text-stone-300 hover:text-red-500"><Trash2 size={14} /></button>
          </div>))}</div>}
      </section>
      {prossime.length ? <section className="lc-card p-5"><h4 className="font-semibold text-sm text-stone-900 mb-2">Prossime assenze di tutti</h4><div className="space-y-1 text-sm">{prossime.map((a) => <div key={a.id} className="flex gap-2 text-stone-600"><span className="font-medium text-stone-800 w-32 truncate">{a.nome}</span><span>{etichettaTipo(a.tipo)}</span><span className="text-stone-400 tabular-nums">{a.dal.split("-").reverse().join("/")} → {a.al.split("-").reverse().join("/")}</span></div>)}</div></section> : null}
    </div>
  );
}

// ---- stampa, CSV ed email ------------------------------------------------
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function foglioHtml(dip, config, P, mese) {
  const ore = (P.ore || {})[dip.id] || {};
  const T = totaliMese(P, dip, mese);
  const salone = (config.branding && config.branding.name) || "";
  const righe = giorniDelMese(mese).map((d) => { const g = giornoEffettivo(P, dip, d) || {}; const wd = new Date(d + "T12:00:00").getDay(); const m = minutiGiorno(g, dip); const tipo = (TIPI_GIORNO.find((t) => t[0] === g.tipo) || [])[1] || ""; return `<tr${wd === 0 ? ' class="fest"' : ""}><td>${WDAY_SHORT[wd]} ${Number(d.slice(8))}</td><td>${esc(tipo)}</td><td>${esc(g.tipo === "lavoro" ? g.entrata || "" : "")}</td><td>${esc(g.tipo === "lavoro" ? g.uscita || "" : "")}</td><td class="n">${g.tipo === "lavoro" && g.pausa ? g.pausa : ""}</td><td class="n">${m.lavorati ? ore2(m.lavorati) : ""}</td><td class="n">${m.straordinari ? ore2(m.straordinari) : ""}</td><td>${esc(g.note || "")}</td></tr>`; }).join("");
  return `<section class="foglio"><h1>Foglio ore · ${esc(etichettaMese(mese))}</h1><div class="testa"><div><b>${esc(dip.nome)}</b>${dip.mansione ? ` · ${esc(dip.mansione)}` : ""}${dip.matricola ? ` · matricola ${esc(dip.matricola)}` : ""}<br><span class="sub">${esc(salone)} · contratto ${dip.oreSettimanali} h/settimana, ${dip.oreGiorno} h/giorno${dip.note ? ` · ${esc(dip.note)}` : ""}</span></div></div>
<table><thead><tr><th>Giorno</th><th>Tipo</th><th>Entrata</th><th>Uscita</th><th class="n">Pausa min</th><th class="n">Ore</th><th class="n">Straord.</th><th>Note</th></tr></thead><tbody>${righe}</tbody></table>
<table class="tot"><tr><td>Giorni lavorati<br><b>${T.giorniLavoro}</b></td><td>Ore lavorate<br><b>${ore2(T.lavorati)}</b></td><td>Ordinarie<br><b>${ore2(T.ordinari)}</b></td><td>Straordinari<br><b>${ore2(T.straordinari)}</b></td><td>Ferie<br><b>${T.ferie}</b></td><td>Permessi<br><b>${T.permesso}</b></td><td>Malattia<br><b>${T.malattia}</b></td><td>Festivi<br><b>${T.festivo}</b></td></tr></table>
<div class="firme"><div>Firma del dipendente<br><br>______________________</div><div>Firma del titolare<br><br>______________________</div></div></section>`;
}
export function fogliHtml(dipendenti, config, P, mese) {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Fogli ore ${esc(etichettaMese(mese))}</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#1c1917;font-size:12px;margin:0;padding:18px}.foglio{page-break-after:always}.foglio:last-child{page-break-after:auto}h1{font-size:18px;margin:0 0 6px}.testa{margin-bottom:10px;font-size:13px}.sub{color:#57534e;font-size:11px}table{width:100%;border-collapse:collapse;margin-bottom:10px}th,td{border:1px solid #d6d3d1;padding:4px 6px;text-align:left}th{background:#f5f5f4;font-size:10px;text-transform:uppercase;letter-spacing:.03em}td.n,th.n{text-align:right}tr.fest td{background:#fafaf9;color:#78716c}.tot td{text-align:center;font-size:11px;color:#57534e}.tot b{font-size:14px;color:#1c1917}.firme{display:flex;justify-content:space-between;margin-top:24px;font-size:11px;color:#57534e}</style></head><body>${dipendenti.map((d) => foglioHtml(d, config, P, mese)).join("")}</body></html>`;
}
export function stampaFoglio(dipendenti, config, P, mese) {
  try {
    const ifr = document.createElement("iframe");
    ifr.style.position = "fixed"; ifr.style.width = "0"; ifr.style.height = "0"; ifr.style.right = "0"; ifr.style.bottom = "0"; ifr.style.border = "0";
    document.body.appendChild(ifr);
    const doc = ifr.contentWindow.document; doc.open(); doc.write(fogliHtml(dipendenti, config, P, mese)); doc.close();
    setTimeout(() => { try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (e) {} setTimeout(() => ifr.remove(), 1500); }, 400);
  } catch (e) { alert("Stampa non disponibile."); }
}
export function fogliCsv(dipendenti, config, P, mese) {
  const righe = [["Dipendente", "Matricola", "Giorno", "Tipo", "Entrata", "Uscita", "Pausa (min)", "Ore", "Ordinarie", "Straordinari", "Note"].join(";")];
  for (const d of dipendenti) { for (const g of giorniDelMese(mese)) { const x = giornoEffettivo(P, d, g) || {}; if (!x.tipo) continue; const m = minutiGiorno(x, d); righe.push([d.nome, d.matricola || "", g, (TIPI_GIORNO.find((t) => t[0] === x.tipo) || [])[1] || x.tipo, x.entrata || "", x.uscita || "", x.pausa || "", m.lavorati ? ore2(m.lavorati) : "", m.ordinari ? ore2(m.ordinari) : "", m.straordinari ? ore2(m.straordinari) : "", x.note || ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")); } }
  return "﻿" + righe.join("\n");
}
export function scaricaCsv(dipendenti, config, P, mese) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([fogliCsv(dipendenti, config, P, mese)], { type: "text/csv;charset=utf-8" })); a.download = `fogli-ore-${mese}.csv`; a.click();
}
const b64Utf8 = (s) => { const b = new TextEncoder().encode(s); let bin = ""; for (let i = 0; i < b.length; i += 8192) bin += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(bin); };
// Email al consulente: il riepilogo nel testo, il foglio completo in HTML e il CSV allegato.
export async function inviaFogli(dipendenti, config, P, mese) {
  const salone = (config.branding && config.branding.name) || "";
  const oggetto = String(P.consulente.oggetto || "Foglio ore {mese} · {dipendente} · {salone}").replace("{mese}", etichettaMese(mese)).replace("{dipendente}", dipendenti.length === 1 ? dipendenti[0].nome : `${dipendenti.length} dipendenti`).replace("{salone}", salone);
  const righe = dipendenti.map((d) => { const T = totaliMese(P, d, mese); return `${d.nome}${d.matricola ? ` (matr. ${d.matricola})` : ""}: ${T.giorniLavoro} giorni, ${ore2(T.lavorati)} ore lavorate (ordinarie ${ore2(T.ordinari)}, straordinari ${ore2(T.straordinari)}), ferie ${T.ferie}, permessi ${T.permesso}, malattia ${T.malattia}`; });
  const testo = `Buongiorno${P.consulente.nome ? " " + P.consulente.nome : ""},\n\nin allegato i fogli ore di ${etichettaMese(mese)} di ${salone}.\n\n${righe.join("\n")}\n\nIl dettaglio giorno per giorno è nel file CSV e nel PDF/HTML allegati.\n\nCordiali saluti,\n${salone}`;
  const html = fogliHtml(dipendenti, config, P, mese);
  return gmailApi("invia", { a: P.consulente.email, copiaAMe: true, oggetto, testo, allegati: [{ nome: `fogli-ore-${mese}.csv`, tipo: "text/csv", base64: b64Utf8(fogliCsv(dipendenti, config, P, mese)) }, { nome: `fogli-ore-${mese}.html`, tipo: "text/html", base64: b64Utf8(html) }] });
}
