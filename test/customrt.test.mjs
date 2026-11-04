// Registratore telematico Custom: l'XML del protocollo 1.30, la lettura della
// risposta e le regole di cassa (mai uno scontrino doppio, mai una vendita
// persa), con un registratore finto che risponde come il K3 RT: autenticazione
// Basic con la matricola, XML controllato (ASCII, 22/42 caratteri), contatori,
// documento aperto; modi normale · perdi · rifiuta · aperto · spento.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { rtImpostazioniDi, rtRicevutaDaRighe, rtXmlScontrino, rtXmlServizio, rtXmlVerificaRif, rtLeggiRisposta, rtInvia, rtEmetti, rtRettifica, rtTesto, rtErroreTesto } from "../src/core/cassa/customrt.js";

const MATRICOLA = "1BMPX000272";
// ---- il registratore finto ----
function avviaSimulatore(matricola) {
  const sim = { modo: "normale", codice: 16, ricevuti: [], count: 0, total: 0, num: 0, z: 12, fp: "000", errori: [] };
  const risp = (success, status, extra) => '<?xml version="1.0" encoding="utf-8"?>\n<response success="' + success + '" status="' + status + '">\n  <addInfo>\n    <printerStatus>00000</printerStatus>\n    <fpStatus>' + sim.fp + "</fpStatus>" + (extra || "") + "\n  </addInfo>\n</response>";
  const att = (tag, nome) => { const m = new RegExp(nome + '="([^"]*)"').exec(tag); return m ? m[1] : ""; };
  const tags = (xml, nome) => xml.match(new RegExp("<" + nome + "\\b[^>]*>", "g")) || [];
  const controlla = (xml) => {
    const e = [];
    if (!/^<\?xml version="1.0" encoding="utf-8"\?>/.test(xml)) e.push("manca l'intestazione xml");
    const radice = /<(printerFiscalReceipt|printerFiscalReport|printerCommand)>/.exec(xml);
    if (!radice || xml.trim().slice(-(radice[1].length + 3)) !== "</" + radice[1] + ">") e.push("radice non chiusa");
    tags(xml, "printRecItem").concat(tags(xml, "printRecTotal"), tags(xml, "printRecRefund")).forEach((t) => { if (att(t, "description").replace(/&[a-z]+;/g, "x").length > 22) e.push("descrizione oltre 22: " + att(t, "description")); });
    tags(xml, "printRecMessage").forEach((t) => { if (att(t, "message").replace(/&[a-z]+;/g, "x").length > 42) e.push("messaggio oltre 42"); });
    if (/[^\x09\x0a\x0d\x20-\x7e]/.test(xml)) e.push("caratteri non ASCII");
    return e;
  };
  const server = http.createServer((req, res) => {
    if (sim.modo === "spento") { req.socket.destroy(); return; }
    const atteso = "Basic " + Buffer.from(matricola + ":" + matricola).toString("base64");
    if (req.method !== "POST" || req.url !== "/xml/printer.htm") { res.statusCode = 404; res.end(); return; }
    if (String(req.headers.authorization || "") !== atteso) { res.statusCode = 401; res.end(); return; }
    let xml = ""; req.on("data", (c) => (xml += c));
    req.on("end", () => {
      sim.ricevuti.push(xml);
      const err = controlla(xml); if (err.length) { sim.errori.push(err); res.end(risp("false", 115)); return; }
      const fine = (body) => { res.setHeader("Content-Type", "text/xml"); res.end(body); };
      if (/<getDailyTotals/.test(xml)) { fine(risp("true", 0, "\n    <dailyTotals><receiptsNum>" + String(sim.count).padStart(4, "0") + "</receiptsNum><receiptsTot>" + String(sim.total).padStart(9, "0") + "</receiptsTot></dailyTotals>")); return; }
      if (/<queryPrinterStatus/.test(xml)) { fine(risp("true", 0, "<cpuRel>K3-SIM 1.0</cpuRel><mfStatus>0</mfStatus>")); return; }
      if (/<resetPrinter/.test(xml) || /<printRecVoid/.test(xml)) { sim.fp = "000"; fine(risp("true", 0)); return; }
      if (/<printXReport/.test(xml)) { fine(risp("true", 0)); return; }
      if (/<printZReport/.test(xml)) { const n = sim.z; sim.z += 1; sim.count = 0; sim.total = 0; sim.num = 0; fine(risp("true", 0, "<nClose>" + String(n).padStart(4, "0") + "</nClose>")); return; }
      if (/<openDrawer/.test(xml) && /<printerCommand>/.test(xml)) { fine(risp("true", 0)); return; }
      if (/checkOnly="1"/.test(xml)) { const t = tags(xml, "beginRtDocRefund").concat(tags(xml, "beginRtDocAnnulment"))[0] || ""; const trovato = Number(att(t, "docRefNumber")) >= 1 && Number(att(t, "docRefNumber")) <= 9999 && /^\d{6}$/.test(att(t, "docDate")); fine(risp("true", 0, "<responseBuf>" + (trovato ? "1" : "0") + "</responseBuf>")); return; }
      if (/<beginFiscalReceipt|<beginRtDocRefund|<beginRtDocAnnulment/.test(xml)) {
        if (sim.modo === "rifiuta") { fine(risp("false", sim.codice)); return; }
        if (sim.modo === "aperto") { sim.fp = "100"; fine(risp("false", 21)); return; }
        const righe = tags(xml, "printRecItem").concat(tags(xml, "printRecRefund")).reduce((s, t) => s + (parseInt(att(t, "unitPrice"), 10) || 0), 0);
        const meno = tags(xml, "printRecSubtotalAdjustment").concat(tags(xml, "printRecAdvancePayments")).reduce((s, t) => s + (parseInt(att(t, "amount"), 10) || 0), 0);
        const pagato = tags(xml, "printRecTotal").reduce((s, t) => s + (parseInt(att(t, "payment"), 10) || 0), 0);
        if (pagato < righe - meno) { fine(risp("false", 25)); return; }
        sim.num += 1;
        if (/<beginFiscalReceipt/.test(xml)) { sim.count += 1; sim.total += righe - meno; }
        if (sim.modo === "perdi") { req.socket.destroy(); return; } // stampato, ma la risposta non arriva
        fine(risp("true", 0, "<fiscalDoc>" + String(sim.num).padStart(4, "0") + "</fiscalDoc><nClose>" + String(sim.z).padStart(4, "0") + "</nClose>")); return;
      }
      fine(risp("true", 0));
    });
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => { sim.porta = server.address().port; sim.chiudi = () => new Promise((r) => server.close(r)); ok(sim); }));
}
// il trasporto del programma Windows, qui in Node
function trasporto({ url, body, user, password, timeout }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(u, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8", Authorization: "Basic " + Buffer.from(user + ":" + password).toString("base64") }, timeout: Math.min(timeout || 2000, 2000) }, (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve({ status: res.statusCode, body: b })); });
    req.on("timeout", () => req.destroy(new Error("timeout"))); req.on("error", (e) => reject(e)); req.end(body);
  });
}
const sim = await avviaSimulatore(MATRICOLA);
after(() => sim.chiudi());
const CFG = rtImpostazioniDi({ simula: false, host: "127.0.0.1", scheme: "http", port: String(sim.porta), matricola: MATRICOLA, timeout: 2, reparti: [{ numero: "1", nome: "IVA 22%", aliquota: "22" }, { numero: "2", nome: "IVA 10%", aliquota: "10" }, { numero: "5", nome: "Esente", aliquota: "N2.2" }], messaggio: "Grazie e arrivederci" });
// l'operatore finto: risponde alle finestre con le scelte in coda
const operatore = (scelte) => { const coda = scelte.slice(); const viste = []; return { viste, amb: { trasporto, attesaVerifica: [10, 10, 10], chiedi: async (titolo, testo, bottoni) => { viste.push(titolo); if (!bottoni || !bottoni.length) return null; return coda.length ? coda.shift() : bottoni[0].value; }, chiudi: () => {} } }; };
const RIGHE = [{ descrizione: "Crema viso 50 ml", qta: 2, prezzo: 34, aliquota: "22" }, { descrizione: "Piega", qta: 1, prezzo: 25, aliquota: "10" }];

test("l'XML dello scontrino: centesimi, reparti dall'aliquota, ASCII, contante per ultimo, messaggio, totale che torna", () => {
  const r = rtRicevutaDaRighe([...RIGHE, { descrizione: "Sconto", qta: 1, prezzo: -3 }], "contanti", 90, CFG);
  assert.deepEqual(r.errori, []);
  assert.equal(r.total, 9000);
  const xml = rtXmlScontrino({ ...r, kind: "sale" }, CFG);
  assert.match(xml, /<beginFiscalReceipt><\/beginFiscalReceipt>/);
  assert.match(xml, /<printRecItem description="2x Crema viso 50 ml" unitPrice="6800" department="1"><\/printRecItem>\s*<printRecMessage messageType="1" font="1" message="2 x 34,00"><\/printRecMessage>/);
  assert.match(xml, /<printRecItem description="Piega" unitPrice="2500" department="2">/);
  assert.match(xml, /<printRecSubtotalAdjustment adjustmentType="3" description="SCONTO" amount="300">/);
  assert.match(xml, /<printRecTotal description="CONTANTI" payment="9000" paymentType="1">/);
  assert.match(xml, /<printRecMessage messageType="3" font="1" message="Grazie e arrivederci">\s*<\/printRecMessage>\s*<openDrawer><\/openDrawer>\s*<endFiscalReceiptCut>/);
  // carta: niente cassetto, pagamento elettronico
  const xe = rtXmlScontrino({ ...rtRicevutaDaRighe(RIGHE, "elettronico", 93, CFG), kind: "sale" }, CFG);
  assert.match(xe, /paymentType="2"/); assert.doesNotMatch(xe, /openDrawer/);
  // testi: accenti via, massimo 22 caratteri, escape XML
  assert.equal(rtTesto("Trattamento viso anti-età & \"relax\"", 22), "Trattamento viso anti-");
  assert.equal(rtTesto("Caffè & brioche", 22), "Caffe &amp; brioche");
  // righe che non fanno il totale: errore, non si manda
  assert.match(rtRicevutaDaRighe(RIGHE, "contanti", 100, CFG).errori[0], /non fanno il totale/);
  // aliquota senza reparto: errore chiaro
  assert.match(rtRicevutaDaRighe([{ descrizione: "x", qta: 1, prezzo: 10, aliquota: "4" }], "contanti", 10, CFG).errori[0], /nessun reparto per l'IVA 4%/);
  // aliquota predefinita della cassa quando il prodotto non ne ha una
  assert.equal(rtRicevutaDaRighe([{ descrizione: "x", qta: 1, prezzo: 10 }], "contanti", 10, CFG).lines[0].department, "1");
  // reso e annullo: riferimento su 4 cifre e data ggmmaa; verifica preventiva con checkOnly
  const rr = rtXmlScontrino({ ...rtRicevutaDaRighe(RIGHE, "contanti", 93, CFG), kind: "refund", ref: { z: "12", num: "34", date: "041126" } }, CFG);
  assert.match(rr, /<beginRtDocRefund docRefZ="0012" docRefNumber="0034" docDate="041126" printPreview="0">/);
  assert.match(rtXmlVerificaRif("annul", { z: 12, num: 34, date: "041126" }), /<beginRtDocAnnulment docRefZ="0012" docRefNumber="0034" docDate="041126" checkOnly="1">/);
  assert.match(rtXmlServizio("z"), /<printZReport description="">/);
});

test("la risposta del registratore si legge: numeri, stato, avvisi, errori tradotti", () => {
  const r = rtLeggiRisposta('<?xml version="1.0"?><response success="true" status="0"><addInfo><printerStatus>01000</printerStatus><fpStatus>000</fpStatus><fiscalDoc>0007</fiscalDoc><nClose>0012</nClose><dailyTotals><receiptsNum>0007</receiptsNum><receiptsTot>000012345</receiptsTot></dailyTotals></addInfo></response>');
  assert.equal(r.success, true); assert.equal(r.fiscalDoc, "0007"); assert.equal(r.nClose, "0012");
  assert.deepEqual(r.avvisi, ["carta esaurita"]); assert.deepEqual(r.totali, { count: 7, total: 12345 });
  const e = rtLeggiRisposta('<response success="false" status="54"><addInfo><fpStatus>000</fpStatus></addInfo></response>');
  assert.equal(e.success, false); assert.match(e.errore, /errore 54 – Chiusura giornaliera necessaria\. Esegui la chiusura/);
  assert.equal(rtLeggiRisposta("<html>boh</html>").success, null);
  assert.match(rtErroreTesto(148), /Reparto non presente/);
});

test("modo normale: scontrino emesso una volta sola, con numero e chiusura", async () => {
  sim.modo = "normale"; sim.ricevuti.length = 0;
  const op = operatore([]);
  const r = await rtEmetti({ ...rtRicevutaDaRighe(RIGHE, "contanti", 93, CFG), kind: "sale" }, CFG, op.amb);
  assert.equal(r.ok, true);
  assert.equal(r.rt.fiscalDoc, "0001"); assert.equal(r.rt.nClose, "0012"); assert.equal(r.rt.matricola, MATRICOLA); assert.equal(r.rt.verificato, true);
  assert.equal(sim.ricevuti.filter((x) => /<beginFiscalReceipt/.test(x)).length, 1, "un solo scontrino");
  assert.ok(sim.ricevuti.some((x) => /<getDailyTotals/.test(x)), "prima si leggono i contatori");
  assert.equal(sim.count, 1); assert.equal(sim.total, 9300);
  assert.deepEqual(sim.errori, [], "il registratore non ha trovato niente da ridire sull'XML");
});

test("modo perdi: stampato ma risposta persa → la verifica dei contatori lo riconosce, nessun doppione", async () => {
  sim.modo = "perdi"; const count0 = sim.count, tot0 = sim.total; sim.ricevuti.length = 0;
  const op = operatore([]);
  const r = await rtEmetti({ ...rtRicevutaDaRighe(RIGHE, "elettronico", 93, CFG), kind: "sale" }, CFG, op.amb);
  assert.equal(r.ok, true, "la vendita si registra: lo scontrino è uscito");
  assert.equal(r.rt.verificato, true);
  assert.equal(sim.count, count0 + 1); assert.equal(sim.total, tot0 + 9300);
  assert.equal(sim.ricevuti.filter((x) => /<beginFiscalReceipt/.test(x)).length, 1, "non si rimanda");
  assert.ok(op.viste.includes("Verifica dello scontrino"));
  sim.modo = "normale";
});

test("modo rifiuta: niente registrato, errore tradotto, si può riprovare", async () => {
  sim.modo = "rifiuta"; sim.codice = 16; const count0 = sim.count;
  const op = operatore(["close"]);
  const r = await rtEmetti({ ...rtRicevutaDaRighe(RIGHE, "contanti", 93, CFG), kind: "sale" }, CFG, op.amb);
  assert.equal(r.ok, false); assert.equal(sim.count, count0);
  assert.ok(op.viste.includes("Scontrino rifiutato"));
  // riprova dopo che la carta è stata cambiata
  sim.modo = "normale";
  const op2 = operatore([]);
  assert.equal((await rtEmetti({ ...rtRicevutaDaRighe(RIGHE, "contanti", 93, CFG), kind: "sale" }, CFG, op2.amb)).ok, true);
  assert.equal(sim.count, count0 + 1);
});

test("modo aperto: rifiuto con documento aperto → si propone l'annullo, poi il registratore è pronto", async () => {
  sim.modo = "aperto"; const count0 = sim.count;
  const op = operatore(["reset"]);
  const r = await rtEmetti({ ...rtRicevutaDaRighe(RIGHE, "contanti", 93, CFG), kind: "sale" }, CFG, op.amb);
  assert.equal(r.ok, false); assert.equal(sim.count, count0);
  assert.ok(op.viste.some((t) => /rimasto aperto/.test(t)));
  assert.equal(sim.fp, "000", "il documento aperto è stato annullato");
  assert.ok(sim.ricevuti.some((x) => /<printRecVoid/.test(x)));
  sim.modo = "normale";
});

test("modo spento: nessuna vendita registrata e nessun doppione", async () => {
  sim.modo = "spento"; const count0 = sim.count;
  const op = operatore(["close"]);
  const r = await rtEmetti({ ...rtRicevutaDaRighe(RIGHE, "contanti", 93, CFG), kind: "sale" }, CFG, op.amb);
  assert.equal(r.ok, false); assert.equal(sim.count, count0);
  assert.ok(op.viste.some((t) => /da confermare|non emesso/.test(t)));
  sim.modo = "normale";
});

test("matricola sbagliata = accesso negato, spiegato", async () => {
  const r = await rtInvia(rtXmlServizio("stato"), { ...CFG, matricola: "SBAGLIATA" }, { trasporto });
  assert.equal(r.success, false); assert.match(r.errore, /matricola/);
});

test("reso e annullo: prima la verifica checkOnly, poi il documento; scontrino inesistente = niente", async () => {
  sim.modo = "normale"; sim.ricevuti.length = 0;
  const vendita = { ts: Date.now(), total: 93, metodo: "contanti", rt: { fiscalDoc: "0001", nClose: "0012", data: "041126" } };
  const op = operatore([]);
  const r = await rtRettifica(vendita, "annullo", RIGHE, 93, CFG, op.amb);
  assert.equal(r.fatto, true); assert.ok(r.rt.fiscalDoc);
  const idx = sim.ricevuti.findIndex((x) => /checkOnly="1"/.test(x));
  assert.ok(idx >= 0 && idx < sim.ricevuti.findIndex((x) => /<beginRtDocAnnulment[^>]*printPreview/.test(x)), "checkOnly prima del documento");
  // reso parziale
  const reso = await rtRettifica(vendita, "reso", [{ ...RIGHE[0], qta: 1 }], 34, CFG, operatore([]).amb);
  assert.equal(reso.fatto, true);
  assert.ok(sim.ricevuti.some((x) => /<beginRtDocRefund/.test(x) && /unitPrice="3400"/.test(x)));
  // scontrino d'origine che non esiste: il registratore risponde 0 e non si emette niente
  const num = sim.num;
  const no = await rtRettifica({ ...vendita, rt: { fiscalDoc: "", nClose: "0012", data: "041126" } }, "annullo", RIGHE, 93, CFG, operatore([]).amb);
  assert.equal(no.fatto, undefined); assert.match(no.errore, /non ha emesso/); assert.equal(sim.num, num);
});

test("simulazione: senza registratore risponde come il K3 e tiene i contatori", async () => {
  const mem = { st: {}, leggi() { return this.st; }, scrivi(s) { this.st = s; } };
  const cfg = rtImpostazioniDi({ ...CFG, simula: true });
  const amb = { memoriaSim: mem, pausaSim: 0, chiedi: async () => null, chiudi: () => {} };
  const a = await rtEmetti({ ...rtRicevutaDaRighe(RIGHE, "contanti", 93, cfg), kind: "sale" }, cfg, amb);
  const b = await rtEmetti({ ...rtRicevutaDaRighe(RIGHE, "contanti", 93, cfg), kind: "sale" }, cfg, amb);
  assert.equal(a.rt.fiscalDoc, "0001"); assert.equal(b.rt.fiscalDoc, "0002"); assert.equal(a.rt.simulato, true);
  const z = await rtInvia(rtXmlServizio("z"), cfg, amb);
  assert.equal(z.nClose, "0001"); assert.equal(mem.st.count, 0);
});
