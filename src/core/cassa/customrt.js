// ============================================================================
// REGISTRATORE TELEMATICO CUSTOM (K3 RT e gli altri di 3ª generazione: KUBE X,
// Q3X, BIG PLUS, JSMART, P3, FUSION) · protocollo XML rev. 1.30.
//
// Modulo PURO (niente React, niente DOM obbligatorio): lo usano la cassa del
// programma Windows (src/core/salone/cassaRt.jsx) e le prove (test/customrt.test.mjs).
//
// Collegamento: POST https://<IP>:80/xml/printer.htm, corpo «<?xml …?>» + comando,
// Content-Type text/plain, autenticazione Basic con utente e password = matricola,
// certificato autofirmato. Da una pagina web il browser non ci arriva: la richiesta
// parte dal programma Windows (window.lucentiaCassa.rtRequest, processo principale
// di Electron) oppure, in simulazione, da un registratore finto in memoria.
//
// Regole di cassa (non negoziabili): mai uno scontrino doppio, mai una vendita persa.
// Prima di ogni scontrino si leggono i contatori (getDailyTotals); la vendita si
// registra SOLO dopo la conferma del registratore; se il registratore non risponde
// si rileggono i contatori (+1 e totale + esattamente l'importo = emesso; invariati =
// non emesso; documento aperto = annullarlo e riprovare; altrimenti decide
// l'operatore). Un rifiuto non registra niente.
// ============================================================================

export const RT_ERRORI = {
  1: "Non presente", 2: "Errore di lettura della memoria fiscale", 3: "Valore non valido", 4: "Errore interno", 5: "Operazione non possibile",
  6: "Errore di scrittura del logo in memoria fiscale", 7: "Errore nella descrizione del totale", 8: "Operazione già eseguita", 9: "Totale documento troppo alto",
  10: "Totale giornaliero troppo alto", 11: "Importo errato", 12: "Data non valida", 13: "Data/ora non valida", 14: "Data diversa", 16: "Carta esaurita",
  17: "Stampante slip", 18: "Ragione sociale mancante", 19: "Azzeramento memoria fiscale non possibile", 21: "Documento aperto", 22: "Date errate",
  23: "Totale negativo", 24: "Lunghezza del comando errata", 25: "Pagamento non completato", 26: "Procedura annullata dall'operatore", 27: "Errore del database interno",
  28: "Aliquota IVA non programmata", 29: "IVA negativa", 30: "Giornale elettronico pieno", 31: "Giornale elettronico quasi pieno", 32: "Impossibile inizializzare il giornale elettronico",
  33: "Giornale elettronico non presente", 34: "Dati del giornale elettronico errati", 35: "Memoria fiscale scollegata", 36: "Errore di lettura/scrittura delle memorie",
  37: "Coperchio aperto durante la stampa di un report", 38: "Giornale elettronico (SD) non riconosciuto", 39: "Memoria SD protetta da password", 40: "Dati non trovati nel giornale elettronico",
  41: "Giornale elettronico errato", 43: "Giornale elettronico clonato", 44: "Aggiornamento richiesto", 46: "Modifica non consentita", 47: "Registratore non fiscalizzato",
  48: "Control box occupato", 49: "Matricola del control box errata", 50: "Control box / memoria fiscale non trovati", 51: "Memoria fiscale piena", 52: "Jumper HWINIT inserito",
  53: "Registratore già matricolato", 54: "Chiusura giornaliera necessaria", 55: "Modalità training attiva", 57: "Data/ora non impostate", 59: "Registratore non fiscalizzato/attivato",
  60: "Registratore non matricolato", 61: "24 ore dall'ultima chiusura", 62: "Ricezione dati in corso", 63: "Transazione non riuscita", 64: "Coperchio aperto",
  65: "Errore di alimentazione della testina", 66: "Temperatura della testina troppo alta", 67: "Errore della taglierina", 68: "Testina scollegata", 69: "Dimensione della SD errata",
  70: "Superate le 24 ore dall'ultima chiusura", 71: "Seconda chiusura giornaliera non consentita", 72: "HWINIT richiesto", 73: "Assistenza tecnica necessaria", 74: "Timeout di ricezione",
  75: "Registratore occupato", 76: "Registratore occupato", 77: "Registratore dismesso", 78: "Licenza firmware non valida", 81: "Non matricolato", 82: "Non attivato",
  83: "Registratore non censito", 84: "Certificato scaduto", 85: "Eseguire la chiusura dopo HWINIT", 86: "Nessun dato trovato", 89: "Errore generico", 92: "Parametro non valido",
  98: "Occupato", 101: "Memoria piena", 102: "Importo massimo superato", 105: "Comunicazione errata", 106: "Batteria scarica", 108: "Importo minimo non raggiunto",
  112: "Utente non riconosciuto", 115: "Errore di sintassi XML", 117: "Funzione non consentita", 118: "Impostazione errata", 121: "Sconto errato", 122: "Valore non consentito",
  123: "Password errata", 124: "Aliquota IVA errata", 132: "Fattura differita richiesta", 134: "Chiudere il documento", 136: "Contanti in cassa insufficienti",
  137: "Tipo di pagamento non valido", 138: "Quantità non specificata", 139: "Descrizione mancante", 141: "Importo del pagamento troppo alto", 142: "Resto troppo alto",
  144: "Pagamento non presente", 148: "Reparto non presente", 150: "PLU non presente", 152: "Operatore non presente", 170: "Errore di connessione",
  185: "Errore nell'invio della chiusura giornaliera", 189: "Cliente obbligatorio", 191: "Funzione non attivata", 192: "Memoria piena: eseguire la chiusura",
  193: "Errore nel salvataggio della chiusura giornaliera", 194: "Conferma mancante", 202: "Matricola non valida", 213: "Registratore occupato in operazioni telematiche",
  214: "Periodo di inattività in corso", 215: "Codice IVA errato", 216: "Sigillo/contenitore aperto", 219: "Protocollo errato", 220: "Modalità FPU errata",
  222: "Stato del registratore errato", 223: "Impossibile accedere alla memoria fiscale o al giornale elettronico", 245: "XML non valido", 255: "Risposta XML non valida",
};
export const RT_SUGGERIMENTI = {
  3: "Controlla importo, reparto e descrizione.", 16: "Sostituisci il rotolo di carta e riprova.", 21: "Annulla il documento aperto (Registratore → «Annulla documento aperto») e riprova.",
  25: "Il pagamento non copre il totale: riprova.", 28: "L'aliquota IVA non è programmata sul registratore: controlla i reparti nelle impostazioni della cassa.",
  30: "Il giornale elettronico è pieno: contatta l'assistenza tecnica.", 54: "Esegui la chiusura giornaliera (Registratore → «Chiusura Z») e riprova.",
  61: "Esegui la chiusura giornaliera (Registratore → «Chiusura Z») e riprova.", 64: "Chiudi il coperchio della carta e riprova.", 67: "Controlla la taglierina e la carta.",
  70: "Esegui la chiusura giornaliera (Registratore → «Chiusura Z») e riprova.", 73: "Contatta l'assistenza tecnica.", 75: "Il registratore è occupato: attendi qualche secondo e riprova.",
  76: "Il registratore è occupato: attendi qualche secondo e riprova.", 98: "Il registratore è occupato: attendi qualche secondo e riprova.",
  134: "Annulla il documento aperto (Registratore → «Annulla documento aperto») e riprova.", 137: "Il numero del pagamento non è valido: controlla i pagamenti nelle impostazioni della cassa.",
  148: "Il reparto non esiste sul registratore: controlla i reparti nelle impostazioni della cassa.", 213: "Il registratore sta trasmettendo i dati: attendi qualche secondo e riprova.",
};
export const rtErroreTesto = (code) => { const n = parseInt(code, 10); if (!n) return ""; return "errore " + n + (RT_ERRORI[n] ? " – " + RT_ERRORI[n] : "") + (RT_SUGGERIMENTI[n] ? ". " + RT_SUGGERIMENTI[n] : ""); };

// ---- impostazioni (stanno nel programma Windows, non nel gestionale) ----
export const rtImpostazioniVuote = () => ({
  url: "",                       // indirizzo del gestionale (…/gestionale)
  host: "", matricola: "", scheme: "https", port: "80", path: "/xml/printer.htm",
  timeout: 20, simula: true,
  aliquotaPredefinita: "22",     // prodotti senza aliquota propria
  aliquotaServizi: "22",         // servizi senza aliquota propria
  reparti: [{ numero: "1", nome: "IVA 22%", aliquota: "22" }],
  categorieReparto: {},          // id categoria del catalogo → numero di reparto (facoltativo)
  pagamenti: { contanti: { tipo: "1", nome: "CONTANTI" }, elettronico: { tipo: "2", nome: "ELETTRONICO" } },
  messaggio: "Grazie e arrivederci", cassetto: true, rigaReso: "printRecItem",
});
export const rtImpostazioniDi = (s) => {
  const v = rtImpostazioniVuote(); s = s || {};
  return { ...v, ...s, pagamenti: { contanti: { ...v.pagamenti.contanti, ...((s.pagamenti || {}).contanti || {}) }, elettronico: { ...v.pagamenti.elettronico, ...((s.pagamenti || {}).elettronico || {}) } },
    reparti: Array.isArray(s.reparti) && s.reparti.length ? s.reparti : v.reparti, categorieReparto: s.categorieReparto || {} };
};

// ---- costruzione dei comandi ----
export const rtEsc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// testo stampabile: solo ASCII, troncato (22 articoli e pagamenti, 42 messaggi)
export const rtTesto = (v, max) => rtEsc(String(v == null ? "" : v).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E]/g, "").trim().slice(0, max));
export const rtCent = (euro) => Math.round((Number(euro) || 0) * 100);
const rtPrezzo = (cent) => String(Math.max(0, Math.round(cent)));
export const rtImporto = (cent) => { const s = cent < 0 ? "-" : ""; const a = Math.abs(Math.round(cent)); return s + Math.floor(a / 100) + "," + String(a % 100).padStart(2, "0"); };
const rtTag = (nome, attr) => "<" + nome + Object.keys(attr || {}).filter((k) => attr[k] !== undefined && attr[k] !== null && attr[k] !== "").map((k) => " " + k + '="' + attr[k] + '"').join("") + "></" + nome + ">";
const rtPad4 = (v) => { const n = String(v == null ? "" : v).replace(/\D/g, ""); return n ? n.padStart(4, "0").slice(-4) : undefined; };
export const rtDataGgMmAa = (d) => { const x = d ? new Date(d) : new Date(); const p = (n) => String(n).padStart(2, "0"); return p(x.getDate()) + p(x.getMonth() + 1) + p(x.getFullYear() % 100); };

/* Dalle righe della cassa alle righe del registratore.
   righe: [{ descrizione, qta, prezzo (€ unitario, IVA compresa), aliquota ("22" | "N2"…), categoria? }]
   Il reparto si sceglie dalla categoria (se abbinata) altrimenti dall'aliquota. Le righe a
   prezzo negativo sono sconti/buoni (sconto sul subtotale) o acconti (printRecAdvancePayments). */
export function rtRicevutaDaRighe(righe, metodo, totale, cfg) {
  const reparti = (cfg.reparti || []).filter((r) => r && String(r.numero || "").trim());
  const errori = [];
  const lines = [], subAdj = []; let advance = 0;
  const norm = (a) => { const t = String(a == null ? "" : a).replace("%", "").replace(",", ".").trim().toUpperCase(); return /^\d+(\.\d+)?$/.test(t) ? String(Number(t)) : t; };
  (righe || []).forEach((x) => {
    const q = Number(x.qta) || 1; const p = rtCent(x.prezzo);
    if (p < 0) { if (x.acconto) advance += Math.abs(p) * q; else subAdj.push({ cents: Math.abs(p) * q, label: x.buono ? "BUONO" : "SCONTO" }); return; }
    const chiave = norm(x.aliquota == null || x.aliquota === "" ? cfg.aliquotaPredefinita : x.aliquota) || "22";
    const perCat = x.categoria && cfg.categorieReparto && cfg.categorieReparto[x.categoria];
    const rep = perCat ? reparti.find((r) => String(r.numero).trim() === String(perCat).trim()) : reparti.find((r) => norm(r.aliquota) === chiave);
    if (!rep) { errori.push("nessun reparto per " + (/^\d/.test(chiave) ? "l'IVA " + chiave + "%" : "la natura " + chiave) + " («" + (x.descrizione || "articolo") + "»)"); return; }
    lines.push({ description: x.descrizione || "Articolo", department: String(rep.numero).trim(), cents: p, qty: q });
  });
  const tot = rtCent(totale);
  const pg = metodo === "elettronico" ? cfg.pagamenti.elettronico : cfg.pagamenti.contanti;
  const payments = [{ name: pg.nome || (metodo === "elettronico" ? "ELETTRONICO" : "CONTANTI"), type: String(pg.tipo || (metodo === "elettronico" ? 2 : 1)), cash: metodo !== "elettronico", cents: tot }];
  const lordo = lines.reduce((s, l) => s + l.cents * l.qty, 0) - subAdj.reduce((s, a) => s + a.cents, 0) - advance;
  if (lines.length && lordo !== tot) errori.push("le righe (" + rtImporto(lordo) + " €) non fanno il totale (" + rtImporto(tot) + " €)");
  if (!lines.length) errori.push("nessun articolo da stampare");
  return { lines, subAdj, advance, payments, total: tot, errori };
}

// r = { kind: sale|refund|annul, ref: { z, num, date, serial }, lines, subAdj, advance, payments }
export function rtXmlScontrino(r, cfg) {
  const kind = r.kind || "sale"; const ref = r.ref || {};
  const out = ["<printerFiscalReceipt>"]; const add = (n, a) => out.push("  " + rtTag(n, a));
  if (kind === "refund" || kind === "annul") add(kind === "refund" ? "beginRtDocRefund" : "beginRtDocAnnulment", { docRefZ: rtPad4(ref.z), docRefNumber: rtPad4(ref.num), docDate: ref.date, printPreview: 0, fiscalSerial: ref.serial ? rtTesto(ref.serial, 16) : undefined });
  else add("beginFiscalReceipt");
  const riga = kind === "refund" && cfg.rigaReso === "printRecRefund" ? "printRecRefund" : "printRecItem";
  (r.lines || []).forEach((l) => {
    const q = l.qty || 1; const qs = String(q).replace(".", ",");
    // la guida non chiarisce il formato di «quantity»: importo della riga intera, quantità nella descrizione
    add(riga, { description: rtTesto(q !== 1 ? qs + "x " + l.description : l.description, 22), unitPrice: rtPrezzo(l.cents * q), department: l.department });
    if (q !== 1) add("printRecMessage", { messageType: 1, font: 1, message: rtTesto(qs + " x " + rtImporto(l.cents), 42) });
  });
  (r.subAdj || []).forEach((a) => { if (a.cents > 0) add("printRecSubtotalAdjustment", { adjustmentType: 3, description: rtTesto(a.label || "SCONTO", 22), amount: rtPrezzo(a.cents) }); });
  if (r.advance > 0) add("printRecAdvancePayments", { amount: rtPrezzo(r.advance) });
  // il contante va per ultimo: il resto si calcola sull'ultimo pagamento
  (r.payments || []).slice().sort((a, b) => (a.cash ? 1 : 0) - (b.cash ? 1 : 0)).forEach((p) => add("printRecTotal", { description: rtTesto(p.name, 22), payment: rtPrezzo(p.cents), paymentType: p.type }));
  if (cfg.messaggio) add("printRecMessage", { messageType: 3, font: 1, message: rtTesto(cfg.messaggio, 42) });
  if (kind === "sale" && cfg.cassetto && (r.payments || []).some((p) => p.cash)) add("openDrawer");
  add("endFiscalReceiptCut");
  out.push("</printerFiscalReceipt>");
  return out.join("\n");
}
// verifica preventiva di reso/annullo: in responseBuf 0 = non trovato, 1 = ok, 2 = non ammesso
export const rtXmlVerificaRif = (kind, ref) => "<printerFiscalReceipt>\n  " + rtTag(kind === "refund" ? "beginRtDocRefund" : "beginRtDocAnnulment", { docRefZ: rtPad4(ref.z), docRefNumber: rtPad4(ref.num), docDate: ref.date, fiscalSerial: ref.serial ? rtTesto(ref.serial, 16) : undefined, checkOnly: 1 }) + "\n</printerFiscalReceipt>";
const rtComando = (nome, attr) => "<printerCommand>\n  " + rtTag(nome, attr) + "\n</printerCommand>";
export function rtXmlServizio(kind, arg) {
  arg = arg || {};
  switch (kind) {
    case "stato": return rtComando("queryPrinterStatus");
    case "totali": return rtComando("getDailyTotals");
    case "cassetto": return rtComando("openDrawer");
    case "reset": return rtComando("resetPrinter");
    case "x": return "<printerFiscalReport>\n  " + rtTag("printXReport") + "\n</printerFiscalReport>";
    case "z": return '<printerFiscalReport>\n  <printZReport description=""></printZReport>\n</printerFiscalReport>';
    case "invioZ": return "<printerFiscalReport>\n  " + rtTag("getZTransmissionID", { zNum: arg.z }) + "\n</printerFiscalReport>";
    case "annullaAperto": return "<printerFiscalReceipt>\n  " + rtTag("printRecVoid", { description: "ANNULLATO" }) + "\n  " + rtTag("endFiscalReceiptCut") + "\n</printerFiscalReceipt>";
    case "ristampa": return "<printerFiscalReceipt>\n  " + rtTag("printDuplicateReceipt") + "\n</printerFiscalReceipt>";
    default: throw new Error("Comando sconosciuto: " + kind);
  }
}

// ---- lettura della risposta (senza DOMParser: funziona anche nelle prove in Node) ----
export const rtStatoStampante = (s) => (!s || !/^[01]{5}/.test(s) ? [] : ["coperchio carta aperto", "carta esaurita", "carta in esaurimento", "giornale elettronico pieno", "giornale elettronico quasi pieno"].filter((_, i) => s[i] === "1"));
const valTag = (xml, nome) => { const m = new RegExp("<" + nome + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + nome + ">").exec(xml); return m ? m[1].trim() : ""; };
export function rtLeggiRisposta(body) {
  const res = { success: null, status: "", raw: body || "" };
  if (!body) return res;
  const m = /<response\b([^>]*)>/.exec(body);
  if (!m) return res;
  const attr = (n) => { const a = new RegExp(n + '\\s*=\\s*"([^"]*)"').exec(m[1]); return a ? a[1] : ""; };
  const s = attr("success").toLowerCase().replace(/[^a-z]/g, "");
  res.success = s === "true" ? true : s === "false" ? false : null;
  res.status = attr("status").replace(/\D/g, "");
  ["responseBuf", "fiscalDoc", "nClose", "printerStatus", "fpStatus", "cpuRel", "mfStatus"].forEach((k) => { res[k] = valTag(body, k); });
  res.avvisi = rtStatoStampante(res.printerStatus);
  const ztx = valTag(body, "ZTransmission");
  if (ztx) res.invioZ = { stato: valTag(ztx, "docStatus"), id: valTag(ztx, "ZId") };
  const tot = valTag(body, "dailyTotals");
  if (tot) { const n = valTag(tot, "receiptsNum"), t = valTag(tot, "receiptsTot"); if (n !== "" && t !== "") res.totali = { count: parseInt(n.replace(/\D/g, "") || "0", 10), total: parseInt(t.replace(/\D/g, "") || "0", 10) }; }
  res.errore = rtErroreTesto(res.status);
  return res;
}

// ---- invio ----
export const rtIndirizzo = (cfg) => {
  const host = String(cfg.host || "").trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  if (!host) throw new Error("Indirizzo IP del registratore non configurato: inseriscilo nelle impostazioni della cassa (password del tecnico).");
  const porta = /:\d+$/.test(host) || !cfg.port ? "" : ":" + cfg.port;
  let p = String(cfg.path || "/xml/printer.htm").trim(); if (p.charAt(0) !== "/") p = "/" + p;
  return (cfg.scheme || "https") + "://" + host + porta + p;
};
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

/* Simulazione: un registratore finto con i suoi contatori. `memoria` è un oggetto
   { leggi(), scrivi(st) } (nel browser: localStorage). Risponde come il K3. */
export function rtSimula(xml, memoria) {
  let st = { count: 0, total: 0, num: 0, z: 1, fp: "000" };
  try { st = { ...st, ...((memoria && memoria.leggi()) || {}) }; } catch (e) {}
  const salva = () => { try { memoria && memoria.scrivi(st); } catch (e) {} };
  const att = (tag, nome) => { const m = new RegExp(nome + '="([^"]*)"').exec(tag); return m ? m[1] : ""; };
  const tags = (nome) => (xml.match(new RegExp("<" + nome + "\\b[^>]*>", "g")) || []);
  const risp = (extra) => '<?xml version="1.0" encoding="utf-8"?>\n<response success="true" status="0"><addInfo><printerStatus>00000</printerStatus><fpStatus>' + st.fp + "</fpStatus>" + (extra || "") + "</addInfo></response>";
  if (/<getDailyTotals/.test(xml)) return risp("<dailyTotals><receiptsNum>" + String(st.count).padStart(4, "0") + "</receiptsNum><receiptsTot>" + String(st.total).padStart(9, "0") + "</receiptsTot></dailyTotals>");
  if (/<queryPrinterStatus/.test(xml)) return risp("<cpuRel>SIMULAZIONE</cpuRel><mfStatus>0</mfStatus>");
  if (/<printZReport/.test(xml)) { st.z += 1; st.count = 0; st.total = 0; st.num = 0; salva(); return risp("<nClose>" + String(st.z - 1).padStart(4, "0") + "</nClose>"); }
  if (/checkOnly="1"/.test(xml)) return risp("<responseBuf>1</responseBuf>");
  if (/<beginFiscalReceipt|<beginRtDocRefund|<beginRtDocAnnulment/.test(xml)) {
    const items = tags("printRecItem").concat(tags("printRecRefund")).reduce((s, t) => s + (parseInt(att(t, "unitPrice"), 10) || 0), 0);
    const sconti = tags("printRecSubtotalAdjustment").reduce((s, t) => s + (parseInt(att(t, "amount"), 10) || 0), 0) + tags("printRecAdvancePayments").reduce((s, t) => s + (parseInt(att(t, "amount"), 10) || 0), 0);
    st.num += 1; if (/<beginFiscalReceipt/.test(xml)) { st.count += 1; st.total += items - sconti; }
    salva();
    return risp("<fiscalDoc>" + String(st.num).padStart(4, "0") + "</fiscalDoc><nClose>" + String(st.z).padStart(4, "0") + "</nClose>");
  }
  return risp();
}

/* Manda un comando. `amb` (ambiente) porta il trasporto:
   amb.trasporto({ url, body, user, password, timeout }) → { status, body }  (il programma Windows)
   amb.memoriaSim → la memoria del registratore finto. */
export async function rtInvia(xml, cfg, amb, timeoutMs) {
  const payload = '<?xml version="1.0" encoding="utf-8"?>\n' + xml;
  const t = Number(timeoutMs) || (Number(cfg.timeout) || 20) * 1000;
  if (cfg.simula) { await attendi(amb && amb.pausaSim != null ? amb.pausaSim : 250); return { ...rtLeggiRisposta(rtSimula(xml, amb && amb.memoriaSim)), simulato: true, payload }; }
  if (!amb || !amb.trasporto) { const e = new Error("Il registratore si usa solo dal programma della cassa installato sul PC."); e.rete = true; throw e; }
  const url = rtIndirizzo(cfg);
  const utente = String(cfg.matricola || "").trim();
  let r;
  try { r = await amb.trasporto({ url, body: payload, user: utente, password: utente, timeout: t }); if (!r || r.error) throw new Error((r && r.error) || "nessuna risposta"); }
  catch (e) {
    const err = new Error("Il registratore non ha risposto (" + String((e && e.message) || e).replace(/^Error: /, "") + "). Controlla che sia acceso, l'indirizzo IP e la rete.");
    err.rete = true; err.payload = payload; throw err;
  }
  if (r.status === 401 || r.status === 403) return { success: false, http: r.status, payload, raw: "", errore: "accesso negato: controlla la matricola del registratore" };
  const p = rtLeggiRisposta(r.body);
  if ((r.status < 200 || r.status >= 300) && p.success === null) p.success = false;
  return { ...p, http: r.status, payload };
}

async function rtLeggiContatori(cfg, amb) { try { const r = await rtInvia(rtXmlServizio("totali"), cfg, amb, 4000); return r.success !== false && r.totali ? r.totali : null; } catch (e) { return null; } }
async function rtLeggiFp(cfg, amb) { try { const r = await rtInvia(rtXmlServizio("stato"), cfg, amb, 4000); return r.success === false ? null : (r.fpStatus || null); } catch (e) { return null; } }
// annulla il documento rimasto aperto: prima con l'annullo dello scontrino, se non basta col reset
export async function rtAnnullaAperto(cfg, amb) {
  try { if ((await rtLeggiFp(cfg, amb)) === "100") { const v = await rtInvia(rtXmlServizio("annullaAperto"), cfg, amb); if (v.success !== false && (await rtLeggiFp(cfg, amb)) === "000") return true; } } catch (e) {}
  try { const r = await rtInvia(rtXmlServizio("reset"), cfg, amb); return r.success !== false; } catch (e) { return false; }
}
// esito di uno scontrino senza risposta: printed | not-printed | open | ambiguous | unreachable
export async function rtVerificaScontrino(cfg, amb, prima, totale, attesa) {
  const w = attesa || [1500, 2500, 2500];
  for (let i = 0; i < 3; i++) {
    await attendi(w[i]);
    const dopo = await rtLeggiContatori(cfg, amb); if (!dopo) continue;
    const fp = await rtLeggiFp(cfg, amb);
    if (fp && fp !== "000") return "open";
    if (!prima) return "ambiguous";
    const dn = dopo.count - prima.count, dt = dopo.total - prima.total;
    if (dn === 1 && dt === totale) return "printed";
    if (dn === 0 && dt === 0) return "not-printed";
    return "ambiguous";
  }
  return "unreachable";
}

/* Emette uno scontrino (o un reso / annullo) con tutte le regole di cassa.
   amb.chiedi(titolo, testo, bottoni, tono) → Promise del valore scelto; amb.chiudi() chiude la finestra d'attesa.
   Torna { ok: true, rt: { fiscalDoc, nClose, data, matricola, verificato, simulato, quando }, avvisi }
   oppure { ok: false } (niente è stato registrato: il chiamante non deve toccare niente). */
export async function rtEmetti(ricevuta, cfg, amb) {
  amb = amb || {};
  const chiedi = amb.chiedi || (async () => null), chiudi = amb.chiudi || (() => {});
  const kind = ricevuta.kind || "sale";
  const nome = kind === "sale" ? "Scontrino" : kind === "refund" ? "Reso" : "Annullo";
  const live = !cfg.simula;
  const fatto = (res, verificato) => ({ ok: true, avvisi: (res && res.avvisi) || [], rt: { fiscalDoc: (res && res.fiscalDoc) || "", nClose: (res && res.nClose) || "", data: rtDataGgMmAa(), matricola: String(cfg.matricola || "").trim(), verificato: verificato !== false, simulato: !!cfg.simula, quando: new Date().toISOString() } });
  for (let giro = 0; giro < 5; giro++) {
    const xml = rtXmlScontrino(ricevuta, cfg);
    chiedi(nome + " in stampa…", cfg.simula ? "Modalità simulazione: non stampo niente, rispondo come il registratore." : "Mando il documento al registratore. Non chiudere il programma.", [], "busy");
    if (live && (kind === "refund" || kind === "annul")) {
      try {
        const c = await rtInvia(rtXmlVerificaRif(kind, ricevuta.ref || {}), cfg, amb, 8000);
        const buf = String(c.responseBuf || "").charAt(0);
        if (c.success === false || buf === "0" || buf === "2") {
          if ((await rtLeggiFp(cfg, amb)) !== "000") await rtAnnullaAperto(cfg, amb);
          chiudi();
          await chiedi(nome + " non possibile", buf === "0" ? "Il registratore non trova lo scontrino d'origine (chiusura " + ((ricevuta.ref || {}).z || "?") + ", numero " + ((ricevuta.ref || {}).num || "?") + ")." : buf === "2" ? "Il registratore non ammette questa operazione sullo scontrino d'origine." : (c.errore || "Il registratore ha rifiutato la verifica."), [{ label: "Chiudi", value: "close" }], "warn");
          return { ok: false };
        }
        if ((await rtLeggiFp(cfg, amb)) !== "000") await rtAnnullaAperto(cfg, amb);
      } catch (e) { chiudi(); await chiedi("Registratore non raggiungibile", e.message, [{ label: "Chiudi", value: "close" }], "warn"); return { ok: false }; }
    }
    const prima = live && kind === "sale" ? await rtLeggiContatori(cfg, amb) : null;
    let res;
    try { res = await rtInvia(xml, cfg, amb); }
    catch (err) {
      if (!(live && kind === "sale" && err.rete)) { chiudi(); await chiedi(nome + " non emesso", err.message + "\n\nNiente è stato registrato: puoi riprovare.", [{ label: "Chiudi", value: "close" }], "warn"); return { ok: false }; }
      chiedi("Verifica dello scontrino", "Il registratore non ha risposto. Controllo se lo scontrino è uscito…", [], "busy");
      const esito = await rtVerificaScontrino(cfg, amb, prima, ricevuta.total, amb.attesaVerifica);
      chiudi();
      if (esito === "printed") return fatto({}, true);
      if (esito === "not-printed") {
        const v = await chiedi("Scontrino non emesso", "Il registratore non ha emesso lo scontrino: i contatori sono invariati. Il carrello è rimasto com'era e puoi riprovare senza rischio di doppioni.", [{ label: "Riprova", value: "retry" }, { label: "Chiudi", value: "close", soft: true }], "warn");
        if (v === "retry") continue; return { ok: false };
      }
      if (esito === "open") {
        const v = await chiedi("Scontrino rimasto aperto", "Il registratore ha uno scontrino aperto a metà: va annullato prima di poterne emettere un altro.", [{ label: "Annulla il documento e riprova", value: "reset-retry" }, { label: "Annulla solo il documento", value: "reset", soft: true }, { label: "Chiudi", value: "close", soft: true }], "warn");
        if (v === "reset" || v === "reset-retry") { const ok = await rtAnnullaAperto(cfg, amb); if (ok && v === "reset-retry") continue; if (!ok) await chiedi("Annullamento non riuscito", "Controlla il registratore.", [{ label: "Chiudi", value: "close" }], "warn"); }
        return { ok: false };
      }
      const perche = esito === "unreachable" ? "Il registratore non risponde, quindi non posso verificare se lo scontrino è uscito." : "I contatori del registratore sono cambiati in modo diverso dal previsto (forse è stato battuto un altro scontrino nel frattempo).";
      const v = await chiedi("Esito dello scontrino da confermare", perche + "\n\nGuarda il registratore: lo scontrino è uscito?", [{ label: "È uscito: registra la vendita", value: "printed" }, { label: "Non è uscito: riprova", value: "retry", soft: true }, { label: "Decido dopo", value: "close", soft: true }], "warn");
      if (v === "printed") return fatto({}, false);
      if (v === "retry") continue;
      return { ok: false };
    }
    chiudi();
    if (res.success === true || (res.success === null && res.simulato)) return fatto(res, true);
    const motivo = res.errore || "il registratore ha rifiutato il documento";
    const fp = live ? await rtLeggiFp(cfg, amb) : "000";
    if (fp && fp !== "000") {
      const v = await chiedi(nome + " rifiutato e rimasto aperto", "Il registratore dice: " + motivo + "\n\nC'è un documento aperto a metà: va annullato prima di riprovare. Il carrello è rimasto com'era.", [{ label: "Annulla il documento", value: "reset" }, { label: "Chiudi", value: "close", soft: true }], "warn");
      if (v === "reset") { const ok = await rtAnnullaAperto(cfg, amb); await chiedi(ok ? "Documento annullato" : "Annullamento non riuscito", ok ? "Puoi riprovare." : "Controlla il registratore.", [{ label: "Chiudi", value: "close" }], ok ? "ok" : "warn"); }
      return { ok: false };
    }
    const v = await chiedi(nome + " rifiutato", "Il registratore dice: " + motivo + "\n\nLo scontrino non è stato emesso e il carrello è rimasto com'era.", [{ label: "Riprova", value: "retry" }, { label: "Chiudi", value: "close", soft: true }], "warn");
    if (v === "retry") continue;
    return { ok: false };
  }
  return { ok: false };
}

/* Reso o annullo di una vendita emessa col registratore (v.rt = { fiscalDoc, nClose, data }).
   righe = le righe del documento (per il reso: solo i pezzi resi). */
export async function rtRettifica(v, tipo, righe, totale, cfg, amb) {
  const rt = (v && v.rt) || {};
  const ref = { z: rt.nClose, num: rt.fiscalDoc, date: rt.data || rtDataGgMmAa(v.ts), serial: undefined };
  const r = rtRicevutaDaRighe(righe, v.metodo, totale, cfg);
  if (r.errori.length) return { errore: "non posso preparare il documento per il registratore: " + r.errori.join(" · ") };
  const esito = await rtEmetti({ ...r, kind: tipo === "reso" ? "refund" : "annul", ref }, cfg, amb);
  if (!esito.ok) return { errore: "il registratore non ha emesso il documento di " + (tipo === "reso" ? "reso" : "annullo") };
  return { fatto: true, rt: esito.rt };
}
