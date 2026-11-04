// Fatture elettroniche (modulo "fatture"): l'XML FatturaPA, il ponte verso
// Effatta e la lettura delle fatture dei fornitori, con un Effatta finto che
// risponde come quello vero (HTTP 500 sugli errori applicativi, JSON dentro
// <string>, login senza idMittente, file .p7m) e un D1 in memoria.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";
import { fatturaXml, totali, controlla, nomeFile, progressivoCodice, nettoDaLordo, xmlDaContenuto, leggiFatturaPa, eCessionario, leggiEsitoSdi, ESITO_DEFINITIVO, chiaveAcquisto } from "../src/core/fatture/fatturapa.js";
import { effattaLeggi, effattaLista, idDocumento } from "../server/core/effatta.js";

const AID = "az1";
const DITTA = { denominazione: "Estetica Aura di Maria Rossi", piva: "01234567897", cf: "RSSMRA80A41F952K", regime: "RF01", indirizzo: "Via Roma", civico: "12", cap: "28047", comune: "Oleggio", provincia: "NO", nazione: "IT", email: "info@aura.it", aliquota: 22 };
const CLIENTE = { denominazione: "Bianchi S.r.l.", piva: "12345678903", indirizzo: "Corso Italia", civico: "5", cap: "28100", comune: "Novara", provincia: "NO", nazione: "IT", codiceDestinatario: "ABCDEFG" };
const FATTURA = { id: "f1", tipo: "TD01", numero: "7/2026", data: "2026-11-02", cliente: CLIENTE, righe: [{ descrizione: "Trattamento viso", qta: 1, prezzo: nettoDaLordo(60, 22), aliquota: 22 }, { descrizione: "Crema giorno", qta: 2, prezzo: nettoDaLordo(25, 22), aliquota: 22 }], pagamento: { modalita: "MP08" }, causale: "Appuntamento del 02/11/2026" };

// ------------------------------------------------------------ XML
test("l'XML FatturaPA segue l'ordine dello schema e i totali tornano", () => {
  const xml = fatturaXml(FATTURA, DITTA, 6);
  const pos = (s) => { const i = xml.indexOf(s); assert.ok(i >= 0, "manca " + s); return i; };
  assert.ok(pos("<DatiTrasmissione>") < pos("<CedentePrestatore>") && pos("<CedentePrestatore>") < pos("<CessionarioCommittente>"));
  assert.ok(pos("<FatturaElettronicaHeader>") < pos("<FatturaElettronicaBody>"));
  assert.ok(pos("<DatiGenerali>") < pos("<DatiBeniServizi>") && pos("<DatiBeniServizi>") < pos("<DatiPagamento>"));
  assert.ok(pos("<DettaglioLinee>") < pos("<DatiRiepilogo>"));
  assert.ok(pos("<TipoDocumento>TD01</TipoDocumento>") < pos("<Divisa>EUR</Divisa>") && pos("<Divisa>EUR</Divisa>") < pos("<Data>2026-11-02</Data>") && pos("<Data>2026-11-02</Data>") < pos("<Numero>7/2026</Numero>"));
  assert.match(xml, /<ProgressivoInvio>00006<\/ProgressivoInvio>/);
  assert.match(xml, /<FormatoTrasmissione>FPR12<\/FormatoTrasmissione>/);
  assert.match(xml, /<CodiceDestinatario>ABCDEFG<\/CodiceDestinatario>/);
  assert.match(xml, /<IdCodice>01234567897<\/IdCodice>/);
  assert.match(xml, /<RegimeFiscale>RF01<\/RegimeFiscale>/);
  // 60 + 50 lordi = 110,00: imponibile 90,16 + IVA 19,84
  const T = totali(FATTURA, DITTA);
  assert.equal(T.imponibile, 90.16); assert.equal(T.imposta, 19.84); assert.equal(T.totale, 110);
  assert.match(xml, /<ImportoTotaleDocumento>110\.00<\/ImportoTotaleDocumento>/);
  assert.match(xml, /<ImponibileImporto>90\.16<\/ImponibileImporto>\s*<Imposta>19\.84<\/Imposta>/);
  assert.match(xml, /<Quantita>2\.00<\/Quantita>\s*<PrezzoUnitario>20\.49<\/PrezzoUnitario>\s*<PrezzoTotale>40\.98<\/PrezzoTotale>\s*<AliquotaIVA>22\.00<\/AliquotaIVA>/);
  assert.match(xml, /<ImportoPagamento>110\.00<\/ImportoPagamento>/);
  assert.equal(nomeFile(DITTA.piva, 6), "IT01234567897_00006.xml");
  assert.equal(progressivoCodice(36 * 36), "00100");
  assert.deepEqual(controlla(FATTURA, DITTA), []);
  // privato senza codice destinatario: 0000000 e PEC; caratteri speciali protetti
  const priv = fatturaXml({ ...FATTURA, cliente: { denominazione: "Rossi & Figli <srl>", cf: "RSSMRA80A01H501U", indirizzo: "Via Po", cap: "28100", comune: "Novara", provincia: "NO", pec: "rossi@pec.it" } }, DITTA, 1);
  assert.match(priv, /<CodiceDestinatario>0000000<\/CodiceDestinatario>[\s\S]*?<PECDestinatario>rossi@pec.it<\/PECDestinatario>\s*<\/DatiTrasmissione>/);
  assert.match(priv, /<Denominazione>Rossi &amp; Figli &lt;srl&gt;<\/Denominazione>/);
  assert.doesNotMatch(priv, /<IdFiscaleIVA>\s*<IdPaese>IT<\/IdPaese>\s*<IdCodice><\/IdCodice>/);
});

test("regime forfettario: niente IVA, natura N2.2, riferimento normativo e bollo sopra 77,47 €", () => {
  const d = { ...DITTA, regime: "RF19", natura: "N2.2", bollo: true };
  const f = { ...FATTURA, righe: [{ descrizione: "Percorso benessere", qta: 1, prezzo: 120, aliquota: 0 }] };
  const T = totali(f, d);
  assert.equal(T.imposta, 0); assert.equal(T.bollo, 2); assert.equal(T.totale, 120);
  const xml = fatturaXml(f, d, 1);
  assert.match(xml, /<Natura>N2\.2<\/Natura>/);
  assert.match(xml, /<DatiBollo>\s*<BolloVirtuale>SI<\/BolloVirtuale>\s*<ImportoBollo>2\.00<\/ImportoBollo>\s*<\/DatiBollo>\s*<ImportoTotaleDocumento>120\.00/);
  assert.match(xml, /<RiferimentoNormativo>Operazione non soggetta a IVA/);
  assert.equal(totali({ ...f, righe: [{ descrizione: "x", qta: 1, prezzo: 50, aliquota: 0 }] }, d).bollo, 0, "sotto la soglia niente bollo");
});

test("controlla() dice che cosa manca prima di inviare", () => {
  const manca = controlla({ ...FATTURA, cliente: { denominazione: "Pinco" }, righe: [{ descrizione: "", qta: 0 }] }, { ...DITTA, piva: "123" });
  assert.ok(manca.some((m) => /partita IVA della tua attività/.test(m)));
  assert.ok(manca.some((m) => /partita IVA o codice fiscale del cliente/.test(m)));
  assert.ok(manca.some((m) => /indirizzo e comune/.test(m)));
  assert.ok(manca.some((m) => /descrizione della riga 1/.test(m)));
});

// ------------------------------------------------------------ fatture ricevute
// La fattura di un fornitore: lui è il cedente, il salone il cessionario.
const FORNITORE = { denominazione: "Cosmetici Nord S.p.A.", piva: "98765432109", regime: "RF01", indirizzo: "Via Industria", civico: "1", cap: "20900", comune: "Monza", provincia: "MB" };
const XML_FORNITORE = fatturaXml({ tipo: "TD01", numero: "FT/2026/4471", data: "2026-10-08", cliente: { denominazione: DITTA.denominazione, piva: DITTA.piva, cf: DITTA.cf, indirizzo: "Via Roma", civico: "12", cap: "28047", comune: "Oleggio", provincia: "NO" }, righe: [{ descrizione: "Crema viso 50ml", qta: 12, prezzo: 8.2, aliquota: 22 }], pagamento: { modalita: "MP05", scadenza: "2026-11-30" } }, FORNITORE, 44);
// una busta CMS/DER minima ma vera, con dentro l'XML (così arrivano i .p7m)
const der = (tag, contenuto) => { const len = contenuto.length; if (len < 128) return Buffer.concat([Buffer.from([tag, len]), contenuto]); const b = []; let n = len; while (n > 0) { b.unshift(n & 0xff); n = Math.floor(n / 256); } return Buffer.concat([Buffer.from([tag, 0x80 | b.length].concat(b)), contenuto]); };
const P7M = der(0x30, Buffer.concat([der(0x06, Buffer.from([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x01])), der(0xa0, der(0x04, Buffer.from(XML_FORNITORE, "utf8")))])).toString("base64");

test("il file del fornitore si apre in chiaro, in base64 o dentro un .p7m, e si legge", () => {
  assert.equal(xmlDaContenuto(XML_FORNITORE), XML_FORNITORE);
  assert.equal(xmlDaContenuto(Buffer.from(XML_FORNITORE).toString("base64")).trim(), XML_FORNITORE.trim());
  const daP7m = xmlDaContenuto(P7M);
  assert.match(daP7m, /^<\?xml/);
  assert.ok(daP7m.includes("<Numero>FT/2026/4471</Numero>") && daP7m.trim().endsWith("</p:FatturaElettronica>"));
  assert.equal(xmlDaContenuto("ciao a tutti"), "");
  const letto = leggiFatturaPa(daP7m);
  assert.equal(letto.cedente.denominazione, "Cosmetici Nord S.p.A.");
  assert.equal(letto.cedente.piva, "98765432109");
  assert.equal(letto.cessionario.piva, "01234567897");
  assert.equal(letto.documenti.length, 1);
  const doc = letto.documenti[0];
  assert.equal(doc.numero, "FT/2026/4471"); assert.equal(doc.data, "2026-10-08"); assert.equal(doc.totale, 120.05); assert.equal(doc.imponibile, 98.4); assert.equal(doc.imposta, 21.65); assert.equal(doc.scadenza, "2026-11-30");
  assert.equal(doc.righe[0].descrizione, "Crema viso 50ml"); assert.equal(doc.righe[0].qta, 12);
  assert.equal(eCessionario(letto.cessionario, DITTA), true);
  assert.equal(eCessionario(letto.cessionario, { piva: "00000000000" }), false);
  assert.equal(leggiFatturaPa("<html>no</html>").errore, "Il file non contiene una fattura elettronica.");
});

test("le notifiche dello SDI diventano una frase, e lo scarto vince", () => {
  const consegna = leggiEsitoSdi({ errCode: "0", Esiti: { Notifiche: [{ Descrizione_Esito: "Invio al Sistema di Interscambio avvenuto con successo" }, { Titolo: "RICEVUTA CONSEGNA", Identificativo_Sdi: "18240833677", Data_Ora_Consegna: "20/09/2026 23:23:31" }] } });
  assert.equal(consegna.tipo, "consegnata"); assert.match(consegna.testo, /Consegnata al destinatario/); assert.match(consegna.testo, /rif\. SDI 18240833677/);
  const scarto = leggiEsitoSdi({ Esiti: { Notifiche: [{ Descrizione_Esito: "Invio avvenuto con successo" }, { Titolo: "NOTIFICA DI SCARTO", Note: "00423 - Imposta non calcolata correttamente" }] } });
  assert.equal(scarto.tipo, "scartata"); assert.match(scarto.testo, /00423/);
  const presa = leggiEsitoSdi([{ Descrizione_Esito: "Invio al Sistema di Interscambio avvenuto con successo" }]);
  assert.equal(presa.tipo, "presa");
  assert.equal(leggiEsitoSdi({ errCode: "0" }), null, "senza notifiche non si inventa niente");
  assert.equal(ESITO_DEFINITIVO("consegnata"), true); assert.equal(ESITO_DEFINITIVO("scartata"), true); assert.equal(ESITO_DEFINITIVO("presa"), false);
});

test("la risposta di Effatta: JSON dentro <string>, elenco in più forme, id del documento", () => {
  const r = effattaLeggi('<?xml version="1.0"?><string xmlns="http://tempuri.org/">{&quot;errCode&quot;:&quot;0&quot;,&quot;documenti&quot;:[{&quot;idDocumento&quot;:&quot;D-1&quot;}]}</string>');
  assert.equal(r.dato.errCode, "0");
  assert.deepEqual(effattaLista(r.dato, r.grezzo).righe, [{ idDocumento: "D-1" }]);
  assert.deepEqual(effattaLista([{ id: 1 }]).righe, [{ id: 1 }]);
  assert.equal(effattaLista({ errCode: "0", errMsg: "Nessun documento trovato" }).vuoto, true);
  assert.equal(effattaLista({ errCode: "0", qualcosaDiMaiVisto: [1] }, "{…}").ignoto, true, "forma sconosciuta: non si inventa");
  assert.equal(idDocumento({ Numero: "1", IdDocumento: "D-7" }), "D-7");
  assert.equal(idDocumento({ docRefId: 42 }), "42");
  assert.equal(idDocumento({ numero: "x" }), "");
});

// ------------------------------------------------------------ il ponte con un Effatta finto
function db(st) {
  return {
    prepare(sql) {
      let a = [];
      const self = {
        bind(...x) { a = x; return self; },
        async first() {
          if (sql.includes("FROM sessioni s JOIN utenti u")) return st.sessione && a[0] === "tok" ? st.sessione : null;
          if (sql.startsWith("SELECT * FROM aziende WHERE id = ?")) return st.azienda && a[0] === AID ? st.azienda : null;
          if (sql.startsWith("SELECT dati FROM integrazioni")) { const v = st.integrazioni[a[0] + "|" + a[1]]; return v === undefined ? null : { dati: v }; }
          if (sql.includes("FROM dati_app")) { const v = st.dati[a[1]]; return v === undefined ? null : { dati: JSON.stringify(v) }; }
          return null;
        },
        async all() { return { results: [] }; },
        async run() {
          if (sql.startsWith("INSERT INTO integrazioni")) st.integrazioni[a[0] + "|" + a[1]] = a[2];
          else if (sql.startsWith("DELETE FROM integrazioni")) delete st.integrazioni[a[0] + "|" + a[1]];
          return { success: true };
        },
      };
      return self;
    },
  };
}
const titolare = { token: "tok", scadenza: "2099-01-01T00:00:00.000Z", uid: "u1", email: "titolare@x.it", ruolo: "azienda", azienda_id: AID, nome: "Titolare", staff_id: null, reseller_parent: null };
const USER_ID = "11111111-2222-3333-4444-555555555555";
function scenario() {
  return {
    azienda: { id: AID, denominazione: "Estetica Aura", attiva: 1, licenza_scadenza: "2099-12-31", moduli: JSON.stringify(["fatture", "opinf"]), demo: 0 },
    sessione: titolare, integrazioni: {},
    dati: { config: { services: [], staff: [], branding: { name: "Estetica Aura" }, fatture: { ditta: DITTA } } },
    ef: { chiamate: [], loginComeIlVero: true, idMittenteBuono: USER_ID, formaLista: "documenti", formaXml: "p7m", esitoScartata: false, tokenScaduto: false, documenti: { "10": [{ idDocumento: "D-1", numero: "FT/2026/4471" }], "09": [] } },
  };
}
const int = (st, chiave) => { const v = st.integrazioni[AID + "|" + chiave]; return v ? JSON.parse(v) : null; };
const TOKEN_BUONO = "tok-abc-123";
// Il finto Effatta: come quello vero, errori applicativi con HTTP 500 e JSON dentro <string>.
function fintoEffatta(st) {
  const g = st.ef;
  const rispondi = (obj, status) => new Response('<?xml version="1.0" encoding="utf-8"?>\n<string xmlns="http://tempuri.org/">' + JSON.stringify(obj).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</string>", { status: status || 200, headers: { "Content-Type": "text/xml; charset=utf-8" } });
  const errore = (msg, code) => rispondi({ errCode: code || "-1", errMsg: msg }, 500);
  return async (url, init = {}) => {
    const u = new URL(String(url));
    assert.equal(u.origin + "/webservice/RestAPI.asmx", "https://fattura.effatta.it/webservice/RestAPI.asmx", "si parla col servizio vero");
    assert.equal(init.method, "POST");
    const metodo = u.pathname.split("/").pop();
    const p = new URLSearchParams(String(init.body));
    g.chiamate.push({ metodo, params: Object.fromEntries(p) });
    if (metodo === "login") {
      if (p.get("username") !== "mattia" || p.get("password") !== "segreta") return errore("Login fallito");
      g.tokenScaduto = false;
      if (g.loginComeIlVero) return rispondi({ errCode: "0", token: TOKEN_BUONO, userId: USER_ID, email: "prova@esempio.it", regimeFiscale: "RF01", aliquotaIVADefault: "22.00" });
      return rispondi({ errCode: "0", token: TOKEN_BUONO, idMittente: "M-DAL-LOGIN", dataUserId: "U-DAL-LOGIN" });
    }
    if (p.get("token") !== TOKEN_BUONO || g.tokenScaduto) return errore("Token non valido");
    if (metodo !== "checkToken" && !p.get("idMittente")) return errore("Login non valido", "-2");
    if (metodo === "checkToken") return g.idMittenteBuono && p.get("idMittente") !== g.idMittenteBuono ? errore("idMittente non valido") : rispondi({ errCode: "0", valido: true });
    if (metodo === "getUserDocumentsFilter") return errore("Filtro non valido", "-3");
    if (metodo === "getUserDocuments") {
      const righe = g.documenti[p.get("refMonth")] || [];
      if (g.formaLista === "documenti") return righe.length ? rispondi({ errCode: "0", documenti: righe }) : rispondi({ errCode: "0", errMsg: "Nessun documento trovato" });
      if (g.formaLista === "array") return rispondi(righe);
      return rispondi({ errCode: "0", qualcosaDiMaiVisto: righe });
    }
    if (metodo === "getUserXML") {
      if (g.formaXml === "p7m") return rispondi({ errCode: "0", idDocumento: p.get("idDocumento"), nomeFile: "IT98765432109_0012C.xml.p7m", fileContent: P7M });
      if (g.formaXml === "base64") return rispondi({ errCode: "0", xml: Buffer.from(XML_FORNITORE).toString("base64") });
      if (g.formaXml === "altrui") return rispondi({ errCode: "0", xml: XML_FORNITORE.replace("<IdCodice>01234567897</IdCodice>", "<IdCodice>00000000000</IdCodice>").replace("<CodiceFiscale>RSSMRA80A41F952K</CodiceFiscale>", "") });
      return rispondi({ errCode: "0", xml: XML_FORNITORE });
    }
    if (metodo === "uploadXML") return errore("uploadXML non va usata per spedire: raddoppia il documento");
    if (metodo === "sendXML") return rispondi({ errCode: "0", idDocumento: "SDI-777", stato: "inviata" });
    if (metodo === "getEsitoDocument") {
      if (g.esitoScartata) return rispondi({ errCode: "0", Esiti: { Notifiche: [{ Descrizione_Esito: "11767177 - Invio al Sistema di Interscambio avvenuto con successo" }, { Titolo: "NOTIFICA DI SCARTO", Identificativo_Sdi: "18240833677", Note: "00423 - Imposta non calcolata correttamente" }] } });
      return rispondi({ errCode: "0", Esiti: { Notifiche: [{ Descrizione_Esito: "11767177 - Invio al Sistema di Interscambio avvenuto con successo" }, { Titolo: "RICEVUTA CONSEGNA", Identificativo_Sdi: "18240833677", Data_Ora_Consegna: "20/09/2026 23:23:31" }] } });
    }
    return errore("Metodo sconosciuto");
  };
}
async function chiama(st, path, { method = "GET", body, auth = true } = {}) {
  const fetchVero = globalThis.fetch;
  globalThis.fetch = fintoEffatta(st);
  try {
    const res = await onRequest({
      request: new Request("https://salone.test" + path, { method, headers: { "Content-Type": "application/json", ...(auth ? { Cookie: "sid=tok" } : {}) }, body: body ? JSON.stringify(body) : undefined }),
      env: { DB: db(st), SETUP_TOKEN: "x" },
      params: { path: path.replace(/^\/api\/?/, "").split("?")[0].split("/").filter(Boolean) },
    });
    return { status: res.status, body: await res.json() };
  } finally { globalThis.fetch = fetchVero; }
}
const accendi = async (st, extra) => chiama(st, "/api/effatta?action=config", { method: "POST", body: { attivo: true, utente: "mattia", password: "segreta", ...(extra || {}) } });

test("Effatta è riservato al titolare col modulo fatture, e nasce spento", async () => {
  const st = scenario();
  assert.equal((await chiama(st, "/api/effatta?action=stato", { auth: false })).status, 401);
  st.azienda.moduli = JSON.stringify(["google"]);
  assert.match((await chiama(st, "/api/effatta?action=stato")).body.error, /modulo Fatture/);
  st.azienda.moduli = JSON.stringify(["fatture"]);
  st.sessione = { ...titolare, ruolo: "operatore", staff_id: "a1" };
  assert.equal((await chiama(st, "/api/effatta?action=stato")).status, 403);
  st.sessione = titolare;
  const s = (await chiama(st, "/api/effatta?action=stato")).body;
  assert.equal(s.attivo, false); assert.equal(s.configurato, false);
  const r = await chiama(st, "/api/effatta?action=ricevute&anno=2026&mese=10");
  assert.equal(r.status, 400, "finché è spento non si scarica niente");
  assert.equal(st.ef.chiamate.length, 0, "e Effatta non viene mai chiamato");
});

test("le credenziali si salvano sul server e la password non torna mai indietro", async () => {
  const st = scenario();
  assert.equal((await chiama(st, "/api/effatta?action=config", { method: "POST", body: { attivo: true, utente: "mattia" } })).status, 400, "acceso senza password: no");
  assert.equal((await accendi(st)).status, 200);
  const s = (await chiama(st, "/api/effatta?action=stato")).body;
  assert.equal(s.attivo, true); assert.equal(s.utente, "mattia");
  assert.ok(!JSON.stringify(s).includes("segreta"), "la password non esce");
  assert.equal(int(st, "effatta:cfg").password, "segreta", "ma sul server c'è");
  // si può cambiare l'utente lasciando la password vuota
  await chiama(st, "/api/effatta?action=config", { method: "POST", body: { attivo: true, utente: "mattia", password: "" } });
  assert.equal(int(st, "effatta:cfg").password, "segreta");
  await chiama(st, "/api/effatta?action=spegni", { method: "POST", body: {} });
  assert.equal(int(st, "effatta:cfg"), null);
});

test("la prova: il login sbagliato (HTTP 500) è un errore letto da errCode; quello giusto deduce idMittente da userId e lo conferma", async () => {
  const st = scenario();
  await accendi(st, { password: "sbagliata" });
  let r = await chiama(st, "/api/effatta?action=prova", { method: "POST", body: {} });
  assert.equal(r.status, 200); assert.equal(r.body.ok, false); assert.match(r.body.errore, /Login fallito/);
  assert.match(int(st, "effatta:cfg").ultimoEsito, /errore: Login fallito/);
  await accendi(st);
  r = await chiama(st, "/api/effatta?action=prova", { method: "POST", body: {} });
  assert.equal(r.body.ok, true);
  assert.equal(r.body.idMittente, USER_ID, "idMittente dedotto da userId e confermato da checkToken");
  assert.ok(r.body.presi.some((x) => /idMittente/.test(x)));
  assert.equal(r.body.campiLogin.token, "«nascosto»");
  assert.equal(int(st, "effatta:cfg").idMittente, USER_ID);
  assert.equal(int(st, "effatta:cfg").ultimoEsito, "ok");
  // se checkToken non conferma, non si scrive niente e lo si dice
  const st2 = scenario(); st2.ef.idMittenteBuono = "ALTRO"; await accendi(st2);
  r = await chiama(st2, "/api/effatta?action=prova", { method: "POST", body: {} });
  assert.equal(r.body.ok, true); assert.equal(r.body.idMittente, ""); assert.equal(r.body.dedotto.confermato, false);
  // se il login porta già gli identificativi, si prendono da lì
  const st3 = scenario(); st3.ef.loginComeIlVero = false; await accendi(st3);
  r = await chiama(st3, "/api/effatta?action=prova", { method: "POST", body: {} });
  assert.equal(r.body.idMittente, "M-DAL-LOGIN"); assert.equal(r.body.dataUserId, "U-DAL-LOGIN");
});

test("invio: una sola chiamata sendXML col nome giusto, mai uploadXML; token scaduto → un login e si riprova", async () => {
  const st = scenario(); await accendi(st);
  const xml = fatturaXml(FATTURA, DITTA, 6);
  assert.equal((await chiama(st, "/api/effatta?action=invia", { method: "POST", body: { xml: "<html>", nome: "IT01234567897_00006.xml" } })).status, 400);
  assert.equal((await chiama(st, "/api/effatta?action=invia", { method: "POST", body: { xml, nome: "fattura.xml" } })).status, 400, "nome file fuori formato");
  let r = await chiama(st, "/api/effatta?action=invia", { method: "POST", body: { xml, nome: "IT01234567897_00006.xml" } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.invio.idDocumento, "SDI-777");
  const invii = st.ef.chiamate.filter((c) => c.metodo === "sendXML");
  assert.equal(invii.length, 1, "una sola chiamata di invio");
  assert.equal(st.ef.chiamate.filter((c) => c.metodo === "uploadXML").length, 0, "uploadXML mai");
  assert.equal(invii[0].params.nomeFile, "IT01234567897_00006.xml");
  assert.equal(Buffer.from(invii[0].params.base64File, "base64").toString("utf8"), xml, "il file è l'XML, intero");
  assert.equal(invii[0].params.idMittente, USER_ID); assert.equal(invii[0].params.dataUserId, USER_ID);
  // il token del login resta in cache: il secondo invio non rifà il login
  const login0 = st.ef.chiamate.filter((c) => c.metodo === "login").length;
  await chiama(st, "/api/effatta?action=invia", { method: "POST", body: { xml, nome: "IT01234567897_00007.xml" } });
  assert.equal(st.ef.chiamate.filter((c) => c.metodo === "login").length, login0);
  // token non più valido: un login nuovo, poi la chiamata riesce
  st.ef.tokenScaduto = true;
  r = await chiama(st, "/api/effatta?action=invia", { method: "POST", body: { xml, nome: "IT01234567897_00008.xml" } });
  assert.equal(r.status, 200);
  assert.equal(st.ef.chiamate.filter((c) => c.metodo === "login").length, login0 + 1);
});

test("l'esito dello SDI: consegnata e scartata arrivano così come sono, e si leggono", async () => {
  const st = scenario(); await accendi(st);
  let r = await chiama(st, "/api/effatta?action=esito&id=SDI-777");
  assert.equal(r.status, 200);
  assert.equal(leggiEsitoSdi(r.body.esito).tipo, "consegnata");
  const chiamata = st.ef.chiamate.find((c) => c.metodo === "getEsitoDocument");
  assert.equal(chiamata.params.idFattura, "SDI-777"); assert.equal(chiamata.params.idMittente, USER_ID);
  st.ef.esitoScartata = true;
  r = await chiama(st, "/api/effatta?action=esito&id=SDI-776");
  assert.equal(leggiEsitoSdi(r.body.esito).tipo, "scartata");
  assert.equal((await chiama(st, "/api/effatta?action=esito")).status, 400);
});

test("fatture dei fornitori: p7m aperto, solo se il salone è il cessionario, un mese vuoto non è un errore, niente doppioni", async () => {
  const st = scenario(); await accendi(st);
  let r = await chiama(st, "/api/effatta?action=acquisti&anno=2026&mese=10");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.acquisti.length, 1);
  const a = r.body.acquisti[0];
  assert.equal(a.effattaId, "D-1"); assert.equal(a.numero, "FT/2026/4471"); assert.equal(a.fornitore.denominazione, "Cosmetici Nord S.p.A."); assert.equal(a.totale, 120.05); assert.equal(a.scadenza, "2026-11-30");
  assert.match(a.xml, /^<\?xml/);
  assert.equal(chiaveAcquisto(a), "98765432109|FT/2026/4471");
  // già scaricato: non si richiede nemmeno l'XML
  const xmlPrima = st.ef.chiamate.filter((c) => c.metodo === "getUserXML").length;
  r = await chiama(st, "/api/effatta?action=acquisti&anno=2026&mese=10&gia=D-1");
  assert.equal(r.body.acquisti.length, 0);
  assert.equal(st.ef.chiamate.filter((c) => c.metodo === "getUserXML").length, xmlPrima);
  // mese vuoto («Nessun documento trovato»): risposta riuscita, zero documenti
  r = await chiama(st, "/api/effatta?action=acquisti&anno=2026&mese=09");
  assert.equal(r.status, 200); assert.equal(r.body.vuoto, true); assert.equal(r.body.acquisti.length, 0);
  // elenco in una forma mai vista: si restituisce il grezzo, non si inventa
  st.ef.formaLista = "strano";
  r = await chiama(st, "/api/effatta?action=acquisti&anno=2026&mese=10");
  assert.equal(r.body.ignoto, true); assert.ok(r.body.grezzo.includes("qualcosaDiMaiVisto"));
  st.ef.formaLista = "array"; st.ef.formaXml = "base64";
  r = await chiama(st, "/api/effatta?action=acquisti&anno=2026&mese=10");
  assert.equal(r.body.acquisti.length, 1, "elenco nudo e XML in base64");
  // la fattura di qualcun altro non è un acquisto del salone
  st.ef.formaXml = "altrui";
  r = await chiama(st, "/api/effatta?action=acquisti&anno=2026&mese=10");
  assert.equal(r.body.acquisti.length, 0);
  assert.ok(r.body.scartati.some((s) => /non è un acquisto/.test(s)));
  // la variante «…Filter» non si usa mai
  assert.equal(st.ef.chiamate.filter((c) => c.metodo === "getUserDocumentsFilter").length, 0);
});

test("senza idMittente l'errore spiega che cosa manca invece di parlare di password", async () => {
  const st = scenario(); st.ef.idMittenteBuono = "QUALCOSALTRO"; await accendi(st);
  const r = await chiama(st, "/api/effatta?action=ricevute&anno=2026&mese=10");
  assert.equal(r.status, 400);
  assert.match(r.body.error, /idMittente/);
  assert.match(r.body.error, /Effatta/);
});

test("riepilogo IVA del periodo: emesse per aliquota, ricevute dal riepilogo o dalle righe, note di credito in negativo", async () => {
  const { riepilogoIva, periodoIva } = await import("../src/core/fatture/fatturapa.js");
  const ditta = { regime: "RF01" };
  const fatture = [
    { id: "f1", tipo: "TD01", numero: "1", data: "2026-10-05", righe: [{ descrizione: "Taglio", qta: 1, prezzo: 100, aliquota: 22 }, { descrizione: "Libro", qta: 1, prezzo: 10, aliquota: 4 }] },
    { id: "f2", tipo: "TD04", numero: "2", data: "2026-10-20", righe: [{ descrizione: "Storno", qta: 1, prezzo: 50, aliquota: 22 }] },
    { id: "f3", tipo: "TD01", numero: "3", data: "2026-11-02", righe: [{ descrizione: "Fuori periodo", qta: 1, prezzo: 999, aliquota: 22 }] },
    { id: "f4", tipo: "TD01", numero: "4", data: "2026-10-21", annullata: true, righe: [{ descrizione: "Annullata", qta: 1, prezzo: 999, aliquota: 22 }] },
  ];
  const acquisti = [
    { id: "a1", tipo: "TD01", numero: "A1", data: "2026-10-10", imponibile: 200, imposta: 44, totale: 244, riepilogo: [{ aliquota: 22, natura: "", imponibile: 200, imposta: 44 }] },
    { id: "a2", tipo: "TD01", numero: "A2", data: "2026-10-12", imponibile: 100, imposta: 10, totale: 110, righe: [{ descrizione: "x", qta: 1, totale: 100, aliquota: 10 }] },
    { id: "a3", tipo: "TD01", numero: "A3", data: "2026-10-15", imponibile: 50, imposta: 11, totale: 61 },
  ];
  const p = periodoIva("mese", 2026, 10);
  assert.equal(p.da, "2026-10-01"); assert.equal(p.a, "2026-10-31"); assert.equal(p.etichetta, "Ottobre 2026");
  assert.deepEqual(periodoIva("trimestre", 2026, 4), { da: "2026-10-01", a: "2026-12-31", etichetta: "4º trimestre 2026" });
  const r = riepilogoIva(fatture, acquisti, ditta, p.da, p.a);
  assert.equal(r.emesse.n, 2); assert.equal(r.emesse.noteCredito, 1);
  const e22 = r.emesse.gruppi.find((g) => g.aliquota === 22); assert.equal(e22.imponibile, 50); assert.equal(e22.imposta, 11);
  assert.equal(r.emesse.gruppi.find((g) => g.aliquota === 4).imposta, 0.4);
  assert.equal(r.ivaDebito, 11.4);
  assert.equal(r.ricevute.n, 3); assert.equal(r.ricevute.stimate, 1);
  assert.equal(r.ricevute.gruppi.find((g) => g.aliquota === 22).imponibile, 250, "200 dal riepilogo + 50 stimati");
  assert.equal(r.ricevute.gruppi.find((g) => g.aliquota === 10).imposta, 10);
  assert.equal(r.ivaCredito, 65); assert.equal(r.saldo, -53.6);
});
