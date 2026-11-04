// ============================================================================
// CASSA FISCALE col registratore Custom, dentro il gestionale.
//
// Esiste solo nel PROGRAMMA WINDOWS (cartella desktop/), che espone
// window.lucentiaCassa = { programma, config(), rtRequest(), apriImpostazioni() }.
// Le impostazioni del registratore (IP, matricola, reparti, pagamenti…) vivono
// nel programma, dietro la password del tecnico: qui si leggono e basta.
// Il driver vero è src/core/cassa/customrt.js; qui ci sono le finestre per
// l'operatore, il collegamento con carrello e appuntamenti, e il pannello
// «Registratore» (X, Z, cassetto, ristampa, annulla documento aperto).
// ============================================================================
import { useState, useEffect, useCallback } from "react";
import { Banknote, CreditCard, Printer, AlertTriangle, Check, Receipt, Settings, WifiOff, CloudUpload } from "lucide-react";
import { rtImpostazioniDi, rtRicevutaDaRighe, rtEmetti, rtRettifica, rtInvia, rtXmlServizio, rtAnnullaAperto, rtImporto } from "../cassa/customrt.js";
import { ricevutaNonFiscale, inBase64 } from "../cassa/escpos.js";

export const cassaRtDisponibile = () => typeof window !== "undefined" && !!(window.lucentiaCassa && window.lucentiaCassa.programma);
const SIM_KEY = "lc-rt-simulazione";
const memoriaSim = { leggi: () => { try { return JSON.parse(localStorage.getItem(SIM_KEY) || "{}"); } catch (e) { return {}; } }, scrivi: (st) => { try { localStorage.setItem(SIM_KEY, JSON.stringify(st)); } catch (e) {} } };

// Le finestre per l'operatore, fuori da React (servono anche a metà di un'operazione).
export function rtChiedi(titolo, testo, bottoni, tono) {
  return new Promise((risolvi) => {
    if (typeof document === "undefined") { risolvi(null); return; }
    const vecchio = document.getElementById("lc-rt-chiedi"); if (vecchio) vecchio.remove();
    const fondo = document.createElement("div"); fondo.id = "lc-rt-chiedi"; fondo.setAttribute("role", "alertdialog");
    fondo.style.cssText = "position:fixed;inset:0;z-index:9700;background:rgba(28,25,23,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit";
    const colore = tono === "ok" ? "#16a34a" : tono === "busy" ? "#57534e" : "#dc2626";
    const box = document.createElement("div");
    box.style.cssText = "background:#fff;border-radius:18px;max-width:460px;width:100%;padding:22px;border-top:6px solid " + colore + ";box-shadow:0 20px 50px rgba(0,0,0,.3)";
    const t = document.createElement("div"); t.textContent = titolo; t.style.cssText = "font-weight:700;font-size:17px;color:#1c1917;margin-bottom:8px";
    const p = document.createElement("div"); p.textContent = testo; p.style.cssText = "font-size:14px;color:#44403c;line-height:1.5;margin-bottom:12px;white-space:pre-line;word-break:break-word";
    box.appendChild(t); box.appendChild(p);
    (bottoni || []).forEach((b, i) => {
      const el = document.createElement("button"); el.type = "button"; el.textContent = b.label;
      el.style.cssText = "display:block;width:100%;margin-top:8px;font-weight:600;font-size:14px;border-radius:12px;padding:12px;cursor:pointer;" + (i === 0 && !b.soft ? "background:" + colore + ";color:#fff;border:0" : "background:#fff;color:#44403c;border:1px solid #d6d3d1");
      el.onclick = () => { fondo.remove(); risolvi(b.value); };
      box.appendChild(el);
    });
    fondo.appendChild(box); document.body.appendChild(fondo);
    if (!(bottoni || []).length) risolvi(null);
  });
}
export const rtChiudi = () => { try { const el = document.getElementById("lc-rt-chiedi"); if (el) el.remove(); } catch (e) {} };

export async function configCassa() {
  if (!cassaRtDisponibile()) return null;
  try { return rtImpostazioniDi(await window.lucentiaCassa.config()); } catch (e) { return rtImpostazioniDi({}); }
}
export const ambiente = () => ({ trasporto: cassaRtDisponibile() ? window.lucentiaCassa.rtRequest : null, chiedi: rtChiedi, chiudi: rtChiudi, memoriaSim });

// Lo stato della cassa nel programma: le impostazioni (rilette a ogni apertura della finestra).
export function useCassaRt() {
  const [cfg, setCfg] = useState(null);
  const ricarica = useCallback(async () => { setCfg(await configCassa()); }, []);
  useEffect(() => {
    if (!cassaRtDisponibile()) return;
    ricarica();
    const vis = () => { if (document.visibilityState === "visible") ricarica(); };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("focus", ricarica);
    return () => { document.removeEventListener("visibilitychange", vis); window.removeEventListener("focus", ricarica); };
  }, [ricarica]);
  return { attiva: cassaRtDisponibile(), cfg, ricarica };
}

// ---- dal carrello e dagli appuntamenti alle righe del registratore ----
export function righeDaCarrello(cart, catalog, config, cfg) {
  return (cart || []).map((it) => {
    if (it.tipo === "servizio") { const s = ((config && config.services) || []).find((x) => x.id === it.serviceId) || {}; return { descrizione: it.name, qta: it.qty, prezzo: it.price, aliquota: s.aliquota || (cfg && (cfg.aliquotaServizi || cfg.aliquotaPredefinita)) || "", categoria: "" }; }
    const p = (catalog.products || []).find((x) => x.id === it.productId) || {}; const f = (p.formats || []).find((x) => x.id === it.formatId) || {};
    return { descrizione: it.name + (it.label && it.label !== "Standard" ? " " + it.label : ""), qta: it.qty, prezzo: it.price, aliquota: f.aliquota || p.aliquota || "", categoria: p.categoryId || "" };
  });
}
// La ricevuta NON fiscale dei movimenti parziali, sulla stampante ESC/POS del programma.
export const stampanteNonFiscale = (cfg) => !!(cfg && cfg.escpos && cfg.escpos.attiva && cfg.escpos.host);
export async function stampaRicevutaNonFiscale({ righe, totale, totaleDovuto, cliente, pagamento, note, numero }, cfg, branding) {
  if (!cassaRtDisponibile()) return { ok: false, errore: "solo nel programma della cassa" };
  if (!stampanteNonFiscale(cfg)) { await rtChiedi("Stampante non fiscale non configurata", "La ricevuta del pagamento parziale va su una stampante ESC/POS: configurala in Impostazioni della cassa → Stampante non fiscale. Il movimento viene registrato comunque.", [{ label: "Ok", value: "ok" }], "warn"); return { ok: false, errore: "non configurata" }; }
  const d = new Date();
  const byte = ricevutaNonFiscale({ larghezza: cfg.escpos.larghezza, intestazione: { nome: branding && branding.name, indirizzo: branding && branding.address, telefono: branding && branding.phone }, titolo: "RICEVUTA DI PAGAMENTO PARZIALE", cliente, data: d.toLocaleString("it-IT"), numero, righe, totale, totaleDovuto, residuo: totaleDovuto != null ? Math.max(0, totaleDovuto - totale) : null, pagamento, note, piede: cfg.messaggio });
  try { await window.lucentiaCassa.escposPrint(inBase64(byte)); return { ok: true }; }
  catch (e) { await rtChiedi("Ricevuta non stampata", String((e && e.message) || e) + "\n\nIl movimento viene registrato comunque: puoi ristampare la ricevuta dallo storico.", [{ label: "Ok", value: "ok" }], "warn"); return { ok: false, errore: String((e && e.message) || e) }; }
}
export function righeDaAppuntamento(b, config, importo, cfg) {
  const servizi = (b.serviceIds || []).map((id) => (config.services || []).find((s) => s.id === id)).filter(Boolean);
  const al = (s) => s.aliquota || cfg.aliquotaServizi || cfg.aliquotaPredefinita || "22";
  const somma = Math.round(servizi.reduce((a, s) => a + (Number(s.price) || 0), 0) * 100) / 100;
  const tot = Math.round((Number(importo) || 0) * 100) / 100;
  if (servizi.length && somma === tot) return servizi.map((s) => ({ descrizione: s.name, qta: 1, prezzo: Number(s.price) || 0, aliquota: al(s) }));
  // prezzo concordato diverso dal listino: una riga sola col servizio principale
  const primo = servizi[0] || { name: "Servizi", aliquota: "" };
  return [{ descrizione: servizi.length > 1 ? primo.name + " e altri" : primo.name, qta: 1, prezzo: tot, aliquota: al(primo) }];
}

// Emette lo scontrino di una vendita. Torna { ok, rt } oppure { ok:false }.
export async function emettiScontrino(righe, metodo, totale, cfg) {
  const r = rtRicevutaDaRighe(righe, metodo, totale, cfg);
  if (r.errori.length) { await rtChiedi("Scontrino non preparabile", "Controlla le impostazioni della cassa (password del tecnico):\n\n· " + r.errori.join("\n· "), [{ label: "Chiudi", value: "close" }], "warn"); return { ok: false }; }
  return rtEmetti({ ...r, kind: "sale" }, cfg, ambiente());
}
export async function annullaScontrino(sale, righe, cfg) { return rtRettifica(sale, "annullo", righe, sale.total, cfg, ambiente()); }
export async function resoScontrino(sale, righe, totale, cfg) { return rtRettifica(sale, "reso", righe, totale, cfg, ambiente()); }

// I due tasti al posto di «Totale»: contanti o carta → scontrino.
export function SceltaPagamento({ totale, onScegli, disabled, etichetta = "Scontrino" }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button onClick={() => onScegli("contanti")} disabled={disabled} className="brand-bg font-semibold py-3 rounded-xl flex flex-col items-center justify-center gap-0.5 shadow-[var(--lc-shadow-xs)] disabled:opacity-50"><span className="flex items-center gap-1.5"><Banknote size={17} /> Contanti</span><span className="text-[11px] font-normal opacity-80">{etichetta} {rtImporto(Math.round((Number(totale) || 0) * 100))} €</span></button>
      <button onClick={() => onScegli("elettronico")} disabled={disabled} className="font-semibold py-3 rounded-xl flex flex-col items-center justify-center gap-0.5 border-2 brand-border brand-accent bg-white hover:brand-soft disabled:opacity-50"><span className="flex items-center gap-1.5"><CreditCard size={17} /> Carta / POS</span><span className="text-[11px] font-normal opacity-80">{etichetta} {rtImporto(Math.round((Number(totale) || 0) * 100))} €</span></button>
    </div>
  );
}

export const etichettaRt = (rt) => (rt ? (rt.nClose ? "Z" + rt.nClose + " · " : "") + "n. " + (rt.fiscalDoc || "?") + (rt.simulato ? " (simulazione)" : "") : "");

// ---- Vendita → Registratore: le operazioni di servizio ----
export function RegistratorePannello({ cfg, onRicarica }) {
  const [esito, setEsito] = useState(null);
  const [busy, setBusy] = useState("");
  const amb = ambiente();
  if (!cfg) return <div className="lc-card p-6 text-sm text-stone-400">Carico le impostazioni della cassa…</div>;
  const esegui = async (id, titolo, xml, dopo) => {
    if (busy) return; setBusy(id); setEsito(null);
    try {
      const r = await rtInvia(xml, cfg, amb, id === "z" || id === "x" ? (Number(cfg.timeout) || 20) * 1000 : 8000);
      if (r.success === false) setEsito({ ok: false, testo: titolo + ": " + (r.errore || "il registratore ha risposto con un errore") });
      else setEsito({ ok: true, testo: dopo ? dopo(r) : titolo + " eseguita" + ((r.avvisi || []).length ? " · attenzione: " + r.avvisi.join(", ") : "") });
    } catch (e) { setEsito({ ok: false, testo: e.message }); }
    finally { setBusy(""); }
  };
  const chiusuraZ = async () => {
    const v = await rtChiedi("Chiusura giornaliera (Z)", "È un'operazione fiscale NON reversibile: chiude la giornata sul registratore, che poi manda i corrispettivi all'Agenzia delle Entrate.\n\nProcedo?", [{ label: "Sì, esegui la chiusura Z", value: "si" }, { label: "Annulla", value: "no", soft: true }], "warn");
    if (v === "si") esegui("z", "Chiusura Z", rtXmlServizio("z"), (r) => "Chiusura Z eseguita" + (r.nClose ? " · n. " + r.nClose : ""));
  };
  const statoInvio = async () => { const z = prompt("Numero della chiusura Z di cui vedere l'invio:", ""); if (!z) return; esegui("invio", "Stato invio", rtXmlServizio("invioZ", { z: z.replace(/\D/g, "") }), (r) => (r.invioZ ? "Chiusura " + z + ": stato " + (r.invioZ.stato || "?") + (r.invioZ.id ? " · ID " + r.invioZ.id : "") : "Nessuna informazione sull'invio della chiusura " + z)); };
  const annullaAperto = async () => { if (busy) return; setBusy("ann"); const ok = await rtAnnullaAperto(cfg, amb); setBusy(""); setEsito({ ok, testo: ok ? "Nessun documento aperto: il registratore è pronto" : "Annullamento non riuscito: controlla il registratore" }); };
  const Tasto = ({ id, label, onClick, rosso }) => <button onClick={onClick} disabled={!!busy} className={`p-4 rounded-xl border text-sm font-semibold text-left transition disabled:opacity-50 ${rosso ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100" : "border-stone-200 bg-white text-stone-800 hover:border-stone-300"}`}>{busy === id ? "Attendi…" : label}</button>;
  return (
    <div className="space-y-4">
      <div className="lc-card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold text-stone-900 tracking-tight flex items-center gap-2"><Printer size={16} className="brand-accent" /> Registratore telematico</h3>
            <p className="text-sm text-stone-500 mt-0.5">{cfg.simula ? "Modalità simulazione: nessun comando arriva al registratore." : "Registratore " + (cfg.host || "(indirizzo non impostato)") + (cfg.matricola ? " · matricola " + cfg.matricola : "")}</p>
          </div>
          <button onClick={() => { try { window.lucentiaCassa.apriImpostazioni(); } catch (e) {} }} className="text-sm font-medium border border-stone-300 text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Settings size={14} /> Impostazioni cassa</button>
        </div>
        {cfg.simula ? <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 flex items-start gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" /> La cassa è in <b>simulazione</b>: gli scontrini non escono dal registratore. Per passare al registratore vero apri le impostazioni della cassa (password del tecnico).</div> : null}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-4">
          <Tasto id="stato" label="Verifica collegamento" onClick={() => esegui("stato", "Verifica", rtXmlServizio("stato"), (r) => "Registratore raggiungibile" + (r.cpuRel ? " · firmware " + r.cpuRel : "") + (r.fpStatus && r.fpStatus !== "000" ? " · attenzione: documento aperto" : " · nessun documento aperto") + ((r.avvisi || []).length ? " · attenzione: " + r.avvisi.join(", ") : ""))} />
          <Tasto id="x" label="Lettura X (giornata)" onClick={() => esegui("x", "Lettura X", rtXmlServizio("x"))} />
          <Tasto id="z" label="Chiusura Z (fine giornata)" onClick={chiusuraZ} rosso />
          <Tasto id="invio" label="Stato invio corrispettivi" onClick={statoInvio} />
          <Tasto id="cassetto" label="Apri cassetto" onClick={() => esegui("cassetto", "Apertura cassetto", rtXmlServizio("cassetto"))} />
          <Tasto id="ristampa" label="Ristampa ultimo scontrino" onClick={() => esegui("ristampa", "Ristampa", rtXmlServizio("ristampa"))} />
          <Tasto id="ann" label="Annulla documento aperto" onClick={annullaAperto} />
        </div>
        {esito ? <div role="status" className={`mt-4 rounded-xl p-3 text-sm font-medium flex items-start gap-2 ${esito.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{esito.ok ? <Check size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />} {esito.testo}</div> : null}
      </div>
      <p className="text-[11px] text-stone-400 leading-relaxed">A fine giornata fai sempre la <b>chiusura Z</b>: senza, il giorno dopo il registratore rifiuta gli scontrini (errore 54/61/70). Se uno scontrino resta aperto a metà, «Annulla documento aperto» rimette il registratore in ordine.</p>
    </div>
  );
}

// Riga di stato della cassa nell'intestazione del programma.
export function StatoCassa({ cfg }) {
  if (!cfg) return null;
  return <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ml-1 ${cfg.simula ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}><Receipt size={13} /> {cfg.simula ? "Cassa in simulazione" : "Cassa RT " + (cfg.host || "")}</span>;
}

// Lo stato della rete e della coda dei salvataggi (dati.js): compare solo quando
// c'è qualcosa da dire — rete assente, o salvataggi in attesa di partire.
export function StatoRete({ rete, onRiprova }) {
  if (!rete || (!rete.offline && !rete.inCoda)) return null;
  const testo = rete.offline ? `Senza rete${rete.inCoda ? ` · ${rete.inCoda} salvataggi in attesa` : ""}` : `${rete.inCoda} salvataggi in corso…`;
  return <button onClick={onRiprova} title={rete.offline ? "Le modifiche si salvano appena torna la rete. Clicca per riprovare adesso." : "Invio in corso"} className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ml-1 ${rete.offline ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{rete.offline ? <WifiOff size={13} /> : <CloudUpload size={13} />} <span className="hidden sm:inline">{testo}</span></button>;
}
