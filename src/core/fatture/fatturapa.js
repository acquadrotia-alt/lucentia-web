// ============================================================================
// FATTURA ELETTRONICA (FatturaPA 1.2.1) — modulo puro, senza React, usato dal
// gestionale (browser), dal server (lettura delle fatture dei fornitori) e
// dalle prove.
//
// Una fattura del gestionale:
//   { id, tipo: "TD01"|"TD04", numero: "12/2026", data: "2026-11-02",
//     cliente: { denominazione, piva, cf, indirizzo, civico, cap, comune, provincia, nazione, codiceDestinatario, pec },
//     righe: [{ descrizione, qta, um, prezzo, scontoPct, aliquota, natura }],   // prezzo = imponibile unitario
//     pagamento: { modalita: "MP01", scadenza }, causale, bollo (numero),
//     xmlProgressivo, xmlNome, effattaId, sdiInviatoIl, sdiEsito, sdiEsitoTipo, sdiEsitoIl, annullata }
// La ditta (cedente) sta in config.fatture.ditta:
//   { denominazione, piva, cf, regime, indirizzo, civico, cap, comune, provincia, nazione, telefono, email, iban, istituto,
//     aliquota (predefinita), natura (per aliquota 0), riferimento (normativo), bollo (true = bollo virtuale sopra 77,47 € senza IVA) }
// ============================================================================

export const TIPI_DOCUMENTO = [["TD01", "Fattura"], ["TD04", "Nota di credito"]];
export const MODALITA_PAGAMENTO = [["MP01", "Contanti"], ["MP08", "Carta di pagamento"], ["MP05", "Bonifico"], ["MP02", "Assegno"], ["MP19", "Addebito SEPA"], ["MP21", "Altro"]];
export const REGIMI_FISCALI = [["RF01", "Ordinario"], ["RF19", "Forfettario"], ["RF02", "Contribuenti minimi"], ["RF04", "Agricoltura e attività connesse"], ["RF18", "Altro"]];
export const NATURE_IVA = [["N2.2", "Non soggetta — regime forfettario / altri casi"], ["N1", "Esclusa (art. 15)"], ["N4", "Esente"], ["N3.5", "Non imponibile — lettera d'intento"], ["N2.1", "Non soggetta — artt. 7–7-septies"]];
export const SOGLIA_BOLLO = 77.47;
export const IMPORTO_BOLLO = 2;

export const n2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
export const imp = (x) => n2(x).toFixed(2);
export const qtaStr = (x) => (Number(x) || 0).toFixed(2);
export const testo = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max || 200);
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const naz = (v) => (testo(v) || "IT").toUpperCase().slice(0, 2);
const soloCifre = (v) => String(v || "").replace(/\D/g, "");
export const pivaPulita = (v) => String(v || "").replace(/\s/g, "").replace(/^IT/i, "").toUpperCase();
export const cfPulito = (v) => String(v || "").replace(/\s/g, "").toUpperCase();
export const pivaValida = (v) => /^\d{11}$/.test(pivaPulita(v));
export const cfValido = (v) => /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cfPulito(v)) || /^\d{11}$/.test(cfPulito(v));

// imponibile netto da un prezzo al pubblico (IVA compresa)
export const nettoDaLordo = (lordo, aliquota) => n2((Number(lordo) || 0) / (1 + (Number(aliquota) || 0) / 100));
export const rigaTotale = (r) => n2((Number(r.qta) || 0) * (Number(r.prezzo) || 0) * (1 - (Number(r.scontoPct) || 0) / 100));

// Il progressivo di invio: fino a 5 caratteri alfanumerici, qui in base 36.
export const progressivoCodice = (n) => Math.max(1, Number(n) || 1).toString(36).toUpperCase().padStart(5, "0").slice(-5);
export const nomeFile = (piva, progressivo) => `IT${pivaPulita(piva)}_${progressivoCodice(progressivo)}.xml`;

// Dove va recapitata: codice destinatario (7 caratteri, 6 per la PA), altrimenti 0000000 con eventuale PEC.
export function destinatario(c) {
  const cod = String((c && c.codiceDestinatario) || "").replace(/\s/g, "").toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(cod)) return { codice: cod, formato: "FPA12", pec: "" };
  if (/^[A-Z0-9]{7}$/.test(cod)) return { codice: cod, formato: "FPR12", pec: "" };
  return { codice: "0000000", formato: "FPR12", pec: testo((c && c.pec) || "", 256) };
}

// Riepilogo per aliquota, bollo e totale del documento.
export function totali(f, ditta) {
  const d = ditta || {};
  const gruppi = {};
  for (const r of f.righe || []) {
    const al = n2(r.aliquota);
    const natura = al === 0 ? (testo(r.natura) || testo(d.natura) || "N2.2") : "";
    const k = al + "|" + natura;
    if (!gruppi[k]) gruppi[k] = { aliquota: al, natura, imponibile: 0, imposta: 0, riferimento: al === 0 ? (testo(r.riferimento) || testo(d.riferimento) || "") : "" };
    gruppi[k].imponibile = n2(gruppi[k].imponibile + rigaTotale(r));
  }
  const lista = Object.values(gruppi).sort((a, b) => a.aliquota - b.aliquota);
  lista.forEach((g) => { g.imposta = n2(g.imponibile * g.aliquota / 100); });
  const imponibile = n2(lista.reduce((a, g) => a + g.imponibile, 0));
  const imposta = n2(lista.reduce((a, g) => a + g.imposta, 0));
  // bollo virtuale: sugli importi senza IVA oltre la soglia, se la ditta lo applica
  const senzaIva = n2(lista.filter((g) => g.aliquota === 0 && g.natura !== "N1").reduce((a, g) => a + g.imponibile, 0));
  const bollo = f.bollo != null ? n2(f.bollo) : (d.bollo && senzaIva > SOGLIA_BOLLO ? IMPORTO_BOLLO : 0);
  // il bollo entra nel totale solo se è addebitato al cliente (riga apposita, natura N1)
  const totale = n2(imponibile + imposta);
  return { gruppi: lista, imponibile, imposta, bollo, totale };
}

// Che cosa manca perché la fattura possa partire. Vuoto = tutto a posto.
export function controlla(f, ditta) {
  const d = ditta || {}, c = (f && f.cliente) || {};
  const manca = [];
  if (!testo(d.denominazione)) manca.push("denominazione della tua attività");
  if (!pivaValida(d.piva)) manca.push("partita IVA della tua attività (11 cifre)");
  if (!testo(d.indirizzo) || !soloCifre(d.cap) || !testo(d.comune) || !testo(d.provincia)) manca.push("sede della tua attività (indirizzo, CAP, comune, provincia)");
  if (!testo(d.regime)) manca.push("regime fiscale");
  if (!testo(c.denominazione)) manca.push("nome o ragione sociale del cliente");
  if (!pivaValida(c.piva) && !cfValido(c.cf)) manca.push("partita IVA o codice fiscale del cliente");
  if (!testo(c.indirizzo) || !testo(c.comune)) manca.push("indirizzo e comune del cliente");
  if (naz(c.nazione) === "IT" && !/^\d{5}$/.test(soloCifre(c.cap))) manca.push("CAP del cliente");
  if (!(f && f.righe && f.righe.length)) manca.push("almeno una riga");
  (f && f.righe || []).forEach((r, i) => { if (!testo(r.descrizione)) manca.push(`descrizione della riga ${i + 1}`); if (!(Number(r.qta) > 0)) manca.push(`quantità della riga ${i + 1}`); });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f && f.data || ""))) manca.push("data");
  if (!testo(f && f.numero)) manca.push("numero");
  return manca;
}

/* ───────────── il file XML ─────────────
   Tag per tag, nell'ordine esatto dello schema FatturaPA 1.2.1: invertire due
   righe fa scartare il documento dal Sistema di Interscambio. */
export function fatturaXml(f, ditta, progressivo) {
  f = f || {}; const d = ditta || {}; const c = f.cliente || {};
  const T = totali(f, d);
  const dest = destinatario(c);
  const righe = [];
  const sp = (n) => "  ".repeat(n);
  const tag = (liv, nome, valore) => { const v = testo(valore, 2000); if (!v) return; righe.push(sp(liv) + "<" + nome + ">" + esc(v) + "</" + nome + ">"); };
  const num = (liv, nome, valore) => { righe.push(sp(liv) + "<" + nome + ">" + valore + "</" + nome + ">"); };
  const apri = (liv, nome) => righe.push(sp(liv) + "<" + nome + ">");
  const chiudi = (liv, nome) => righe.push(sp(liv) + "</" + nome + ">");

  righe.push('<?xml version="1.0" encoding="UTF-8"?>');
  righe.push('<p:FatturaElettronica versione="' + dest.formato + '" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2.1/Schema_del_file_xml_FatturaPA_versione_1.2.1.xsd">');

  apri(1, "FatturaElettronicaHeader");
  apri(2, "DatiTrasmissione");
  apri(3, "IdTrasmittente"); tag(4, "IdPaese", naz(d.nazione)); tag(4, "IdCodice", pivaPulita(d.piva)); chiudi(3, "IdTrasmittente");
  tag(3, "ProgressivoInvio", progressivoCodice(progressivo || f.xmlProgressivo || 1));
  tag(3, "FormatoTrasmissione", dest.formato);
  tag(3, "CodiceDestinatario", dest.codice);
  if (testo(d.telefono) || testo(d.email)) { apri(3, "ContattiTrasmittente"); tag(4, "Telefono", soloCifre(d.telefono).slice(0, 12)); tag(4, "Email", d.email); chiudi(3, "ContattiTrasmittente"); }
  if (dest.codice === "0000000" && dest.pec) tag(3, "PECDestinatario", dest.pec);
  chiudi(2, "DatiTrasmissione");

  apri(2, "CedentePrestatore");
  apri(3, "DatiAnagrafici");
  apri(4, "IdFiscaleIVA"); tag(5, "IdPaese", naz(d.nazione)); tag(5, "IdCodice", pivaPulita(d.piva)); chiudi(4, "IdFiscaleIVA");
  tag(4, "CodiceFiscale", cfPulito(d.cf));
  apri(4, "Anagrafica"); tag(5, "Denominazione", testo(d.denominazione, 80)); chiudi(4, "Anagrafica");
  tag(4, "RegimeFiscale", testo(d.regime) || "RF01");
  chiudi(3, "DatiAnagrafici");
  apri(3, "Sede");
  tag(4, "Indirizzo", testo(d.indirizzo, 60)); tag(4, "NumeroCivico", testo(d.civico, 8)); tag(4, "CAP", soloCifre(d.cap).slice(0, 5)); tag(4, "Comune", testo(d.comune, 60)); tag(4, "Provincia", testo(d.provincia).toUpperCase().slice(0, 2)); tag(4, "Nazione", naz(d.nazione));
  chiudi(3, "Sede");
  if (testo(d.reaNumero) && testo(d.reaUfficio)) { apri(3, "IscrizioneREA"); tag(4, "Ufficio", testo(d.reaUfficio).toUpperCase().slice(0, 2)); tag(4, "NumeroREA", testo(d.reaNumero, 20)); tag(4, "StatoLiquidazione", "LN"); chiudi(3, "IscrizioneREA"); }
  if (testo(d.telefono) || testo(d.email)) { apri(3, "Contatti"); tag(4, "Telefono", soloCifre(d.telefono).slice(0, 12)); tag(4, "Email", d.email); chiudi(3, "Contatti"); }
  chiudi(2, "CedentePrestatore");

  apri(2, "CessionarioCommittente");
  apri(3, "DatiAnagrafici");
  if (pivaPulita(c.piva)) { apri(4, "IdFiscaleIVA"); tag(5, "IdPaese", naz(c.nazione)); tag(5, "IdCodice", pivaPulita(c.piva)); chiudi(4, "IdFiscaleIVA"); }
  tag(4, "CodiceFiscale", cfPulito(c.cf));
  apri(4, "Anagrafica"); tag(5, "Denominazione", testo(c.denominazione, 80)); chiudi(4, "Anagrafica");
  chiudi(3, "DatiAnagrafici");
  apri(3, "Sede");
  tag(4, "Indirizzo", testo(c.indirizzo, 60)); tag(4, "NumeroCivico", testo(c.civico, 8)); tag(4, "CAP", soloCifre(c.cap).slice(0, 5) || "00000"); tag(4, "Comune", testo(c.comune, 60));
  if (naz(c.nazione) === "IT") tag(4, "Provincia", testo(c.provincia).toUpperCase().slice(0, 2));
  tag(4, "Nazione", naz(c.nazione));
  chiudi(3, "Sede");
  chiudi(2, "CessionarioCommittente");
  chiudi(1, "FatturaElettronicaHeader");

  apri(1, "FatturaElettronicaBody");
  apri(2, "DatiGenerali");
  apri(3, "DatiGeneraliDocumento");
  tag(4, "TipoDocumento", f.tipo || "TD01");
  tag(4, "Divisa", "EUR");
  tag(4, "Data", String(f.data || "").slice(0, 10));
  tag(4, "Numero", testo(f.numero, 20));
  if (T.bollo > 0) { apri(4, "DatiBollo"); tag(5, "BolloVirtuale", "SI"); num(5, "ImportoBollo", imp(T.bollo)); chiudi(4, "DatiBollo"); }
  num(4, "ImportoTotaleDocumento", imp(T.totale));
  testo(f.causale, 2000).split(/\n/).map((x) => testo(x, 200)).filter(Boolean).forEach((x) => tag(4, "Causale", x));
  chiudi(3, "DatiGeneraliDocumento");
  // nota di credito: il riferimento alla fattura che storna
  (f.collegate || []).forEach((x) => { if (!testo(x.numero)) return; apri(3, "DatiFattureCollegate"); tag(4, "IdDocumento", testo(x.numero, 20)); tag(4, "Data", String(x.data || "").slice(0, 10)); chiudi(3, "DatiFattureCollegate"); });
  chiudi(2, "DatiGenerali");

  apri(2, "DatiBeniServizi");
  (f.righe || []).forEach((r, i) => {
    const al = n2(r.aliquota);
    apri(3, "DettaglioLinee");
    num(4, "NumeroLinea", i + 1);
    tag(4, "Descrizione", testo(r.descrizione, 1000));
    num(4, "Quantita", qtaStr(r.qta));
    if (testo(r.um)) tag(4, "UnitaMisura", testo(r.um, 10));
    num(4, "PrezzoUnitario", imp(r.prezzo));
    if (Number(r.scontoPct) > 0) { apri(4, "ScontoMaggiorazione"); tag(5, "Tipo", "SC"); num(5, "Percentuale", imp(r.scontoPct)); chiudi(4, "ScontoMaggiorazione"); }
    num(4, "PrezzoTotale", imp(rigaTotale(r)));
    num(4, "AliquotaIVA", imp(al));
    if (al === 0) tag(4, "Natura", testo(r.natura) || testo(d.natura) || "N2.2");
    chiudi(3, "DettaglioLinee");
  });
  T.gruppi.forEach((g) => {
    apri(3, "DatiRiepilogo");
    num(4, "AliquotaIVA", imp(g.aliquota));
    if (g.aliquota === 0 && g.natura) tag(4, "Natura", g.natura);
    num(4, "ImponibileImporto", imp(g.imponibile));
    num(4, "Imposta", imp(g.imposta));
    tag(4, "EsigibilitaIVA", "I");
    if (g.aliquota === 0) tag(4, "RiferimentoNormativo", testo(g.riferimento || (g.natura === "N2.2" ? "Operazione non soggetta a IVA ai sensi dell'art. 1, commi 54-89, L. 190/2014" : ""), 100));
    chiudi(3, "DatiRiepilogo");
  });
  chiudi(2, "DatiBeniServizi");

  const p = f.pagamento || {};
  if (testo(p.modalita)) {
    apri(2, "DatiPagamento");
    tag(3, "CondizioniPagamento", "TP02");
    apri(3, "DettaglioPagamento");
    tag(4, "ModalitaPagamento", testo(p.modalita));
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(p.scadenza || "").slice(0, 10))) tag(4, "DataScadenzaPagamento", String(p.scadenza).slice(0, 10));
    num(4, "ImportoPagamento", imp(T.totale));
    if (p.modalita === "MP05") { tag(4, "IstitutoFinanziario", testo(d.istituto, 80)); tag(4, "IBAN", String(d.iban || "").replace(/\s/g, "").toUpperCase()); }
    chiudi(3, "DettaglioPagamento");
    chiudi(2, "DatiPagamento");
  }
  chiudi(1, "FatturaElettronicaBody");
  righe.push("</p:FatturaElettronica>");
  return righe.join("\n") + "\n";
}

// ───────────── le fatture che ARRIVANO (fornitori) ─────────────
// Il file può essere XML in chiaro, XML in base64 o una busta firmata .p7m
// (CAdES, in base64): da qui esce comunque il testo della fattura, o "".
export function xmlDaContenuto(s) {
  const t = String(s == null ? "" : s).trim();
  if (!t) return "";
  const ritaglia = (x) => {
    const i = x.search(/<(?:[\w.-]+:)?FatturaElettronica[\s>]/);
    if (i < 0) return "";
    const fine = /<\/(?:[\w.-]+:)?FatturaElettronica\s*>/g; let m, ultimo = -1, lung = 0;
    while ((m = fine.exec(x))) { ultimo = m.index; lung = m[0].length; }
    if (ultimo < 0) return "";
    const corpo = x.slice(i, ultimo + lung);
    const dich = x.lastIndexOf("<?xml", i);
    return (dich >= 0 && dich > i - 200 ? x.slice(dich, i) : '<?xml version="1.0" encoding="UTF-8"?>\n') + corpo;
  };
  if (/<(?:[\w.-]+:)?FatturaElettronica[\s>]/.test(t)) return ritaglia(t) ? String(s).trim() + "\n" : "";
  if (!/^[A-Za-z0-9+/=\s]+$/.test(t)) return "";
  let byte;
  try {
    const b64 = t.replace(/\s/g, "");
    const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
    byte = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) byte[i] = bin.charCodeAt(i);
  } catch (e) { return ""; }
  let txt = "";
  try { txt = new TextDecoder("utf-8").decode(byte); } catch (e) { return ""; }
  // dentro una busta p7m la fattura è una sequenza di byte contigua: la si ritaglia
  return ritaglia(txt);
}

const prendi = (x, nome) => { const m = new RegExp("<(?:[\\w.-]+:)?" + nome + "(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?" + nome + ">").exec(x || ""); return m ? m[1] : ""; };
const prendiTutti = (x, nome) => { const re = new RegExp("<(?:[\\w.-]+:)?" + nome + "(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?" + nome + ">", "g"); const out = []; let m; while ((m = re.exec(x || ""))) out.push(m[1]); return out; };
const valore = (x, nome) => testo(prendi(x, nome).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&"), 1000);
const anagrafica = (blocco) => {
  const dati = prendi(blocco, "DatiAnagrafici");
  const an = prendi(dati, "Anagrafica");
  const denominazione = valore(an, "Denominazione") || [valore(an, "Nome"), valore(an, "Cognome")].filter(Boolean).join(" ");
  const idIva = prendi(dati, "IdFiscaleIVA");
  const sede = prendi(blocco, "Sede");
  return { denominazione, piva: pivaPulita(valore(idIva, "IdCodice")), paese: valore(idIva, "IdPaese") || "IT", cf: cfPulito(valore(dati, "CodiceFiscale")), indirizzo: valore(sede, "Indirizzo"), civico: valore(sede, "NumeroCivico"), cap: valore(sede, "CAP"), comune: valore(sede, "Comune"), provincia: valore(sede, "Provincia"), nazione: valore(sede, "Nazione") || "IT" };
};
export function leggiFatturaPa(xml) {
  const x = String(xml || "");
  if (!/<(?:[\w.-]+:)?FatturaElettronica[\s>]/.test(x)) return { errore: "Il file non contiene una fattura elettronica." };
  const header = prendi(x, "FatturaElettronicaHeader");
  const cedente = anagrafica(prendi(header, "CedentePrestatore"));
  const cessionario = anagrafica(prendi(header, "CessionarioCommittente"));
  const documenti = prendiTutti(x, "FatturaElettronicaBody").map((body) => {
    const dg = prendi(prendi(body, "DatiGenerali"), "DatiGeneraliDocumento");
    const beni = prendi(body, "DatiBeniServizi");
    const righe = prendiTutti(beni, "DettaglioLinee").map((l) => ({ descrizione: valore(l, "Descrizione"), qta: Number(valore(l, "Quantita")) || 1, um: valore(l, "UnitaMisura"), prezzo: Number(valore(l, "PrezzoUnitario")) || 0, totale: Number(valore(l, "PrezzoTotale")) || 0, aliquota: Number(valore(l, "AliquotaIVA")) || 0 }));
    const riep = prendiTutti(beni, "DatiRiepilogo");
    const imponibile = n2(riep.reduce((a, r) => a + (Number(valore(r, "ImponibileImporto")) || 0), 0));
    const imposta = n2(riep.reduce((a, r) => a + (Number(valore(r, "Imposta")) || 0), 0));
    const totaleDoc = Number(valore(dg, "ImportoTotaleDocumento"));
    const scadenze = prendiTutti(prendi(body, "DatiPagamento"), "DettaglioPagamento").map((p) => valore(p, "DataScadenzaPagamento")).filter(Boolean).sort();
    return { tipo: valore(dg, "TipoDocumento") || "TD01", numero: valore(dg, "Numero"), data: valore(dg, "Data").slice(0, 10), totale: totaleDoc > 0 ? n2(totaleDoc) : n2(imponibile + imposta), imponibile, imposta, righe, scadenza: scadenze[0] || "", causale: prendiTutti(dg, "Causale").map((c) => testo(c, 200)).filter(Boolean).join(" · ") };
  });
  if (!documenti.length) return { errore: "Fattura senza corpo (FatturaElettronicaBody)." };
  return { cedente, cessionario, documenti };
}
// È un acquisto della ditta? Il cessionario deve essere lei (P.IVA o codice fiscale).
export function eCessionario(cessionario, ditta) {
  const d = ditta || {}, c = cessionario || {};
  const p = pivaPulita(d.piva), cf = cfPulito(d.cf);
  return !!((p && (c.piva === p || c.cf === p)) || (cf && (c.cf === cf || c.piva === cf)));
}
export const chiaveAcquisto = (a) => ((a && (a.fornitore && (a.fornitore.piva || a.fornitore.cf))) || "") + "|" + String((a && a.numero) || "").trim().toUpperCase();
export function acquistoDaXml(letto, doc, origine) {
  return { id: "acq-" + Math.random().toString(36).slice(2, 9), fornitore: { denominazione: letto.cedente.denominazione, piva: letto.cedente.piva, cf: letto.cedente.cf, comune: letto.cedente.comune }, tipo: doc.tipo, numero: doc.numero, data: doc.data, totale: doc.totale, imponibile: doc.imponibile, imposta: doc.imposta, scadenza: doc.scadenza, righe: doc.righe.slice(0, 200), causale: doc.causale, origine: origine || "effatta", importataIl: new Date().toISOString() };
}

// ───────────── che cosa ha detto lo SDI ─────────────
// Lo SDI manda notifiche con un titolo in burocratese: qui diventano una frase
// chiara. L'ordine conta: lo scarto si riconosce per primo, è l'unico caso in
// cui c'è da rifare.
export const ESITI_SDI = [
  { re: /scarto/i, tipo: "scartata", frase: "Scartata dallo SDI: va corretta e rimandata. Il numero si può riusare, perché una fattura scartata è come non emessa." },
  { re: /ricevuta.*consegna|consegna.*ricevut|consegnat/i, tipo: "consegnata", frase: "Consegnata al destinatario. Per questa fattura non c'è altro da fare." },
  { re: /mancata consegna|impossibilit.*recapit|attestazione/i, tipo: "mancata", frase: "Accettata dallo SDI ma non recapitata: il cliente la trova nel suo cassetto fiscale. Per te è emessa a tutti gli effetti." },
  { re: /decorrenza termini/i, tipo: "decorrenza", frase: "Accettata: il destinatario non ha risposto entro i termini e la fattura si considera buona." },
  { re: /esito.*committente|notifica di esito|accettazione|rifiuto/i, tipo: "esito", frase: "Il destinatario ha risposto: guarda il dettaglio." },
  { re: /avvenuto con successo|ricevut/i, tipo: "presa", frase: "Presa in carico dallo SDI. Non vuol dire ancora consegnata: l'esito vero arriva poco dopo." },
];
export const ESITO_DEFINITIVO = (tipo) => tipo === "consegnata" || tipo === "scartata" || tipo === "decorrenza";
export function notificheSdi(d, prof) {
  const p = prof || 0;
  if (p > 4) return [];
  if (Array.isArray(d)) { const out = []; d.forEach((x) => out.push(...notificheSdi(x, p + 1))); return out; }
  if (!d || typeof d !== "object") return [];
  const pare = Object.keys(d).some((k) => /^titolo$|^tipo|descrizione_?esito|identificativo|data_?ora|idnotifica/i.test(k));
  const out = pare ? [d] : [];
  Object.keys(d).forEach((k) => { const v = d[k]; if (v && typeof v === "object") out.push(...notificheSdi(v, p + 1)); });
  return out;
}
export function leggiEsitoSdi(d) {
  const note = notificheSdi(d);
  if (!note.length) return null;
  const val = (o, ...chiavi) => { for (const k of chiavi) { const v = o && o[k]; if (v != null && typeof v !== "object" && String(v).trim()) return testo(v, 220); } return ""; };
  let titolo = "", quando = "", desc = "", ident = "", nota = "";
  note.forEach((n) => {
    const t = val(n, "Titolo", "titolo", "Tipo", "tipoNotifica", "Tipo_Notifica");
    if (t) { titolo = t; quando = val(n, "Data_Ora_Consegna", "Data_Ora_Ricezione", "dataConsegna", "data") || quando; }
    desc = val(n, "Descrizione_Esito", "descrizioneEsito", "Descrizione") || desc;
    ident = val(n, "Identificativo_Sdi", "IdentificativoSdI", "identificativoSdi") || ident;
    nota = val(n, "Note", "note", "Motivo", "Errore") || nota;
  });
  const chiave = titolo + " " + desc;
  if (!chiave.trim()) return null;
  const trovato = ESITI_SDI.find((e) => e.re.test(chiave));
  const pezzi = [];
  if (titolo) pezzi.push(titolo);
  if (quando) pezzi.push("del " + quando);
  if (ident) pezzi.push("rif. SDI " + ident);
  if (nota) pezzi.push("nota: " + nota);
  return { testo: (trovato ? trovato.frase + " " : "") + "(" + pezzi.join(" · ") + ")", tipo: trovato ? trovato.tipo : "" };
}
