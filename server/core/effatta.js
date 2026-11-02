// ============================================================================
// EFFATTA — FATTURE ELETTRONICHE VERSO LO SDI (modulo "fatture")
//
// Effatta fa da intermediario con il Sistema di Interscambio: da qui le
// fatture emesse PARTONO e quelle dei fornitori ARRIVANO. Il servizio dello
// scontrino elettronico di Effatta è un'altra cosa e qui non c'entra.
//
// Come si parla col servizio (https://fattura.effatta.it/webservice/RestAPI.asmx):
// è un vecchio .asmx ma accetta il binding HttpPost, cioè una POST
// form-urlencoded su {base}/{metodo}, senza buste SOAP. La risposta è sempre
// `<string>…</string>` con dentro del JSON. Due trappole, viste sul servizio
// vero: gli errori applicativi tornano con HTTP 500 (login sbagliato = 500 e
// {"errCode":"-1","errMsg":"Login fallito"}), quindi si legge SEMPRE `errCode`
// e mai il codice HTTP; e la stringa JSON va prima estratta dall'XML.
//
// Rotte (/api/effatta?action=…), col cookie del titolare:
//   GET  stato                      → { attivo, configurato, utente, idMittente, dataUserId, ultimaProva, ultimoEsito }
//   POST config {attivo, utente, password, idMittente, dataUserId}   la password NON torna mai indietro
//   POST spegni                     cancella credenziali e token
//   POST prova                      login + checkToken
//   GET  ricevute&anno=&mese=       elenco grezzo dei documenti del mese
//   GET  xml&id=                    l'XML (o p7m) di un documento
//   GET  acquisti&anno=&mese=&gia=  le fatture dei fornitori già lette: solo quelle dove il salone è il cessionario
//   GET  esito&id=                  le notifiche dello SDI di una fattura inviata
//   POST invia {xml, nome}          UNA sola chiamata `sendXML`: è l'invio allo SDI
//
// Credenziali in `integrazioni` (effatta:cfg, effatta:token), per salone: mai
// nel browser, mai in /api/data.
// ============================================================================
import { json } from "./util.js";
import { leggiInt, scriviInt, cancellaInt } from "./integrazioni.js";
import { getCollezione } from "./disponibilita.js";
import { xmlDaContenuto, leggiFatturaPa, eCessionario, acquistoDaXml } from "../../src/core/fatture/fatturapa.js";

export const BASE = "https://fattura.effatta.it/webservice/RestAPI.asmx";
const CFG = "effatta:cfg", TOKEN = "effatta:token";
const TOKEN_TTL = 1800 * 1000;          // mezz'ora: poi si rifà il login
const MAX_XML = 5 * 1024 * 1024;
const SOURCE = "lucentia";

const testo = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max || 200);

// Dalla risposta del servizio al dato: prima la stringa dentro l'XML, poi il JSON.
export function effattaLeggi(xml) {
  const s = String(xml == null ? "" : xml);
  const m = s.match(/<string[^>]*>([\s\S]*?)<\/string>/i);
  let dentro = m ? m[1] : s;
  dentro = dentro.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim();
  try { return { dato: JSON.parse(dentro), grezzo: dentro }; } catch (e) { return { dato: null, grezzo: dentro }; }
}
// il servizio segnala gli errori applicativi dentro il JSON, non col codice HTTP
const effattaErrore = (d) => { if (!d || typeof d !== "object") return ""; const c = d.errCode != null ? String(d.errCode) : ""; return c && c !== "0" ? testo(d.errMsg || ("errore " + c), 300) : ""; };
function inBase64(byte) { let s = ""; for (let i = 0; i < byte.length; i += 8192) s += String.fromCharCode.apply(null, byte.subarray(i, i + 8192)); return btoa(s); }

// I due identificativi che il servizio pretende in ogni chiamata: si cercano nella risposta del login.
function idDalLogin(d) {
  const out = { idMittente: "", dataUserId: "", candidato: "" };
  if (!d || typeof d !== "object") return out;
  const cerca = (re) => { for (const k of Object.keys(d)) { const v = d[k]; if (re.test(k) && v != null && typeof v !== "object" && String(v).trim()) return testo(v, 60); } return ""; };
  out.idMittente = cerca(/^id_?mittente$/i) || cerca(/mittente/i);
  out.dataUserId = cerca(/^data_?user_?id$/i) || cerca(/datauser/i);
  // visto sul servizio vero: il login manda solo `userId`; è il candidato, da confermare con checkToken
  out.candidato = cerca(/^user_?id$/i) || cerca(/^id$/i);
  return out;
}
function senzaSegreti(d) {
  if (!d || typeof d !== "object") return null;
  const o = {};
  Object.keys(d).slice(0, 40).forEach((k) => { const v = d[k]; o[k] = /token|password|pwd|secret/i.test(k) ? "«nascosto»" : (v == null || typeof v !== "object" ? testo(v, 120) : Array.isArray(v) ? "[" + v.length + " voci]" : "{…}"); });
  return o;
}
// «Login non valido» arriva anche con utente e password giusti ma idMittente sbagliato: lo si dice.
const conIndizio = (errore, cfg) => {
  const s = String(errore || "");
  if (!/login non valid|errCode"?:?\s*"?-2/i.test(s)) return s;
  const manca = [];
  if (!cfg || !cfg.idMittente) manca.push("idMittente");
  if (!cfg || !cfg.dataUserId) manca.push("dataUserId");
  return s + (manca.length ? " — ma il login con utente e password è riuscito: manca " + manca.join(" e ") + ", che il servizio pretende in ogni chiamata. Chiedilo a Effatta." : " — ma il login con utente e password è riuscito: probabilmente idMittente o dataUserId non sono quelli giusti. Falli confermare da Effatta.");
};
// L'elenco dei documenti: formato non documentato, si riconoscono le forme comuni e non si inventa.
export function effattaLista(dato, grezzo) {
  if (Array.isArray(dato)) return { righe: dato };
  if (dato && typeof dato === "object") {
    for (const k of ["documenti", "documents", "data", "result", "results", "lista", "items", "Table", "rows"]) if (Array.isArray(dato[k])) return { righe: dato[k], sotto: k };
    if (dato.idDocumento || dato.IdDocumento || dato.id) return { righe: [dato] };
    const cod = dato.errCode != null ? String(dato.errCode) : "";
    const nienteArray = !Object.keys(dato).some((k) => Array.isArray(dato[k]));
    // visto sul servizio vero: {"errCode":"0","errMsg":"Nessun documento trovato"} = mese vuoto
    if (nienteArray && (cod === "0" || cod === "") && /nessun document|nessun risultat|non trovat|no document|empty/i.test(String(dato.errMsg || ""))) return { righe: [], vuoto: true, messaggio: testo(dato.errMsg, 200) };
  }
  return { righe: null, ignoto: true, grezzo: String(grezzo || "").slice(0, 4000) };
}
// L'identificativo di un documento nell'elenco: nomi noti, poi qualunque chiave che finisca per «id».
export function idDocumento(riga) {
  if (!riga || typeof riga !== "object") return "";
  const buono = (v) => v != null && typeof v !== "object" && String(v).trim();
  for (const k of ["idDocumento", "IdDocumento", "idDoc", "IdDoc", "id", "Id", "ID", "docId", "DocId", "documentId", "DocumentId", "idFattura", "IdFattura", "idtrx", "idTrx"]) if (buono(riga[k])) return testo(riga[k], 200);
  for (const k of Object.keys(riga)) if (/id$/i.test(k) && buono(riga[k])) return testo(riga[k], 200);
  return "";
}
// Il campo che porta il file non ha un nome documentato: nomi noti, poi la stringa più lunga.
function fileDaRisposta(d, grezzo) {
  let xml = "", campi = [];
  if (typeof d === "string") xml = d;
  else if (d && typeof d === "object") {
    campi = Object.keys(d).slice(0, 14);
    for (const k of ["xml", "XML", "base64File", "fileContent", "file", "contenuto", "content", "data"]) if (typeof d[k] === "string" && d[k].length > 40) { xml = d[k]; break; }
    if (!xml) { let piuLunga = ""; Object.keys(d).forEach((k) => { const v = d[k]; if (typeof v === "string" && v.length > piuLunga.length) piuLunga = v; }); if (piuLunga.length > 40) xml = piuLunga; }
  }
  return { xml: String(xml || grezzo || "").slice(0, MAX_XML), campi };
}

export async function effatta(ctx, sess, aid) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "";
  const noStore = { "Cache-Control": "no-store" };
  const corpo = async () => { try { return await request.json(); } catch (e) { return null; } };
  const leggiCfg = () => leggiInt(env, aid, CFG);

  // Una chiamata al servizio: sempre { ok, dato, grezzo, errore }, senza XML né 500 da interpretare.
  async function chiama(metodo, params) {
    const body = new URLSearchParams();
    Object.keys(params || {}).forEach((k) => body.append(k, params[k] == null ? "" : String(params[k])));
    let r;
    try { r = await fetch(BASE + "/" + metodo, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "text/xml" }, body: body.toString() }); }
    catch (e) { return { ok: false, errore: "Non riesco a raggiungere Effatta: " + ((e && e.message) || e) }; }
    const xml = await r.text().catch(() => "");
    const { dato, grezzo } = effattaLeggi(xml);
    const err = effattaErrore(dato);
    if (err) return { ok: false, errore: err, dato, grezzo, http: r.status };
    if (!r.ok && !dato) return { ok: false, errore: "Effatta ha risposto con un errore (HTTP " + r.status + ")", grezzo: grezzo.slice(0, 500), http: r.status };
    return { ok: true, dato, grezzo, http: r.status };
  }
  // Un login vero; se la risposta porta gli identificativi li si prende da lì (e si conferma il candidato con checkToken).
  async function loginFresco(cfg) {
    const r = await chiama("login", { username: cfg.utente, password: cfg.password, source: SOURCE });
    if (!r.ok) throw Object.assign(new Error(r.errore), { utente: true });
    const d = r.dato || {};
    const tk = testo(d.token || d.Token || d.accessToken || (typeof r.dato === "string" ? r.dato : ""), 4000);
    if (!tk) throw Object.assign(new Error("Effatta non ha restituito nessun token: " + String(r.grezzo || "").slice(0, 200)), { utente: true });
    await scriviInt(env, aid, TOKEN, { token: tk, scade: Date.now() + TOKEN_TTL });
    const trovati = idDalLogin(d);
    const presi = []; const nuova = { ...cfg };
    if (!nuova.idMittente && trovati.idMittente) { nuova.idMittente = trovati.idMittente; presi.push("idMittente"); }
    if (!nuova.dataUserId && trovati.dataUserId) { nuova.dataUserId = trovati.dataUserId; presi.push("dataUserId"); }
    let dedotto = null;
    if (!nuova.idMittente && trovati.candidato) {
      const chk = await chiama("checkToken", { token: tk, idMittente: trovati.candidato });
      dedotto = { valore: trovati.candidato, da: "userId", confermato: !!chk.ok, errore: chk.ok ? "" : chk.errore || "" };
      if (chk.ok) { nuova.idMittente = trovati.candidato; presi.push("idMittente (da userId, confermato da Effatta)"); if (!nuova.dataUserId) { nuova.dataUserId = trovati.candidato; presi.push("dataUserId (da userId)"); } }
    }
    if (presi.length) await scriviInt(env, aid, CFG, nuova);
    return { token: tk, cfg: nuova, presi, dedotto, campiLogin: senzaSegreti(d) };
  }
  async function token(cfg, forza) {
    if (!forza) { const t = await leggiInt(env, aid, TOKEN); if (t && t.token && Number(t.scade) > Date.now()) return t.token; }
    return (await loginFresco(cfg)).token;
  }
  // i parametri che il servizio vuole in ogni chiamata
  const conCfg = async (extra) => {
    let cfg = await leggiCfg();
    if (!cfg || !cfg.attivo) throw Object.assign(new Error("Il collegamento con Effatta non è attivo: accendilo in Impostazioni → Fatture."), { utente: true });
    let tk;
    if (!cfg.idMittente) { const f = await loginFresco(cfg); tk = f.token; cfg = f.cfg; } else tk = await token(cfg, false);
    if (!cfg.idMittente) throw Object.assign(new Error("Manca «idMittente», che Effatta pretende in ogni chiamata: non è nelle credenziali né nella risposta del login. Chiedilo a Effatta e scrivilo in Impostazioni → Fatture."), { utente: true });
    return { cfg, base: { token: tk, idMittente: cfg.idMittente, dataUserId: cfg.dataUserId, ...(extra || {}) } };
  };
  // una chiamata autenticata; se il token non vale più si rifà il login una volta
  const chiamaAut = async (metodo, params, soloMittente) => {
    let { cfg, base } = await conCfg();
    const p = (b) => (soloMittente ? { token: b.token, idMittente: b.idMittente, ...params } : { ...b, ...params });
    let r = await chiama(metodo, p(base));
    if (!r.ok && /token/i.test(String(r.errore || ""))) { base = { ...base, token: await token(cfg, true) }; r = await chiama(metodo, p(base)); }
    return { r, cfg };
  };

  try {
    if (action === "stato") {
      const cfg = await leggiCfg();
      return json({ ok: true, attivo: !!(cfg && cfg.attivo), configurato: !!(cfg && cfg.utente && cfg.password), utente: cfg ? testo(cfg.utente, 120) : "", idMittente: cfg ? testo(cfg.idMittente, 60) : "", dataUserId: cfg ? testo(cfg.dataUserId, 60) : "", ultimaProva: (cfg && cfg.ultimaProva) || "", ultimoEsito: (cfg && cfg.ultimoEsito) || "" }, 200, noStore);
    }
    if (request.method === "POST" && action === "config") {
      const b = await corpo();
      if (!b) return json({ error: "Richiesta non leggibile" }, 400);
      const vecchia = (await leggiCfg()) || {};
      // password vuota = «lasciala com'era»
      const password = testo(b.password, 200) || vecchia.password || "";
      const cfg = { attivo: !!b.attivo, utente: testo(b.utente, 120), password, idMittente: testo(b.idMittente, 60), dataUserId: testo(b.dataUserId, 60), ultimaProva: vecchia.ultimaProva || "", ultimoEsito: vecchia.ultimoEsito || "" };
      if (cfg.attivo && (!cfg.utente || !cfg.password)) return json({ error: "Per accendere il collegamento servono nome utente e password di Effatta." }, 400);
      await scriviInt(env, aid, CFG, cfg);
      await cancellaInt(env, aid, TOKEN);
      return json({ ok: true, attivo: cfg.attivo, configurato: !!(cfg.utente && cfg.password) });
    }
    if (request.method === "POST" && action === "spegni") { await cancellaInt(env, aid, CFG); await cancellaInt(env, aid, TOKEN); return json({ ok: true }); }
    if (request.method === "POST" && action === "prova") {
      const cfg = await leggiCfg();
      if (!cfg || !cfg.utente || !cfg.password) return json({ error: "Scrivi prima nome utente e password." }, 400);
      const quando = new Date().toISOString();
      let f;
      try { f = await loginFresco(cfg); }
      catch (e) { const msg = (e && e.message) || String(e); await scriviInt(env, aid, CFG, { ...cfg, ultimaProva: quando, ultimoEsito: "errore: " + msg }); return json({ ok: false, errore: msg }, 200, noStore); }
      const chk = f.cfg.idMittente ? await chiama("checkToken", { token: f.token, idMittente: f.cfg.idMittente }) : null;
      await scriviInt(env, aid, CFG, { ...f.cfg, ultimaProva: quando, ultimoEsito: chk && !chk.ok ? "errore: " + chk.errore : "ok" });
      return json({ ok: true, quando, presi: f.presi, dedotto: f.dedotto, campiLogin: f.campiLogin, idMittente: f.cfg.idMittente, dataUserId: f.cfg.dataUserId, checkToken: chk ? { ok: chk.ok, errore: chk.errore || "" } : null }, 200, noStore);
    }

    const annoMese = () => ({ anno: testo(url.searchParams.get("anno"), 4) || String(new Date().getFullYear()), mese: testo(url.searchParams.get("mese"), 2) });
    if (action === "ricevute") {
      const { anno, mese } = annoMese();
      // sempre getUserDocuments: la variante «…Filter» vuole un filtro vero
      const { r, cfg } = await chiamaAut("getUserDocuments", { refYear: anno, refMonth: mese || "" });
      if (!r.ok) return json({ error: conIndizio(r.errore, cfg), grezzo: String(r.grezzo || "").slice(0, 600) }, 502);
      return json({ ok: true, anno, mese, ...effattaLista(r.dato, r.grezzo) });
    }
    if (action === "xml") {
      const id = testo(url.searchParams.get("id"), 80);
      if (!id) return json({ error: "Manca l'identificativo del documento" }, 400);
      const { r, cfg } = await chiamaAut("getUserXML", { idDocumento: id });
      if (!r.ok) return json({ error: conIndizio(r.errore, cfg), grezzo: String(r.grezzo || "").slice(0, 600) }, 502);
      return json({ ok: true, id, ...fileDaRisposta(r.dato, r.grezzo) });
    }
    // Le fatture dei fornitori di un mese, già lette: solo quelle dove il salone è il cessionario.
    if (action === "acquisti") {
      const { anno, mese } = annoMese();
      const gia = new Set(String(url.searchParams.get("gia") || "").split(",").map((x) => x.trim()).filter(Boolean));
      const config = (await getCollezione(env, aid, "config")) || {};
      const ditta = (config.fatture && config.fatture.ditta) || {};
      const { r, cfg } = await chiamaAut("getUserDocuments", { refYear: anno, refMonth: mese || "" });
      if (!r.ok) return json({ error: conIndizio(r.errore, cfg), grezzo: String(r.grezzo || "").slice(0, 600) }, 502);
      const l = effattaLista(r.dato, r.grezzo);
      if (l.ignoto) return json({ ok: true, anno, mese, ignoto: true, grezzo: l.grezzo, acquisti: [], scartati: [] });
      const acquisti = [], scartati = [];
      for (const riga of (l.righe || []).slice(0, 200)) {
        const id = idDocumento(riga);
        if (!id) { scartati.push("documento senza identificativo · campi: " + Object.keys(riga || {}).slice(0, 14).join(", ")); continue; }
        if (gia.has(id)) continue;
        const rx = await chiamaAut("getUserXML", { idDocumento: id });
        if (!rx.r.ok) { scartati.push("documento " + id + ": XML non scaricato (" + rx.r.errore + ")"); continue; }
        const file = fileDaRisposta(rx.r.dato, rx.r.grezzo);
        const xml = xmlDaContenuto(file.xml);
        if (!xml) { scartati.push("documento " + id + ": non riesco ad aprire il file" + (file.campi.length ? " · campi: " + file.campi.join(", ") : "")); continue; }
        const letto = leggiFatturaPa(xml);
        if (letto.errore) { scartati.push("documento " + id + ": " + letto.errore); continue; }
        if (!eCessionario(letto.cessionario, ditta)) { scartati.push("documento " + id + ": non è un acquisto (cessionario " + (letto.cessionario.piva || letto.cessionario.cf || "?") + ")"); continue; }
        letto.documenti.forEach((doc) => {
          if (!doc.numero || !/^\d{4}-\d{2}-\d{2}$/.test(doc.data)) { scartati.push("documento " + id + ": manca numero o data"); return; }
          acquisti.push({ ...acquistoDaXml(letto, doc, "effatta"), effattaId: id, xml });
        });
      }
      return json({ ok: true, anno, mese, vuoto: !!l.vuoto, esaminati: (l.righe || []).length, acquisti, scartati });
    }
    if (action === "esito") {
      const id = testo(url.searchParams.get("id"), 80);
      if (!id) return json({ error: "Manca l'identificativo della fattura" }, 400);
      const { r, cfg } = await chiamaAut("getEsitoDocument", { idFattura: id }, true);
      if (!r.ok) return json({ error: conIndizio(r.errore, cfg), grezzo: String(r.grezzo || "").slice(0, 600) }, 502);
      return json({ ok: true, id, esito: r.dato, grezzo: r.dato ? undefined : String(r.grezzo || "").slice(0, 2000) });
    }
    if (request.method === "POST" && action === "invia") {
      const b = await corpo();
      const xml = b && typeof b.xml === "string" ? b.xml : "";
      const nome = testo(b && b.nome, 120);
      if (!xml || xml.length > MAX_XML) return json({ error: "Serve l'XML della fattura (sotto i 5 MB)." }, 400);
      if (!/<\s*(?:[\w.-]+:)?FatturaElettronica[\s>]/i.test(xml)) return json({ error: "Questo non è un file di fattura elettronica." }, 400);
      if (!/^IT\d{11}_[A-Za-z0-9]{1,5}\.xml$/.test(nome)) return json({ error: "Il nome del file deve essere IT<partita IVA>_<progressivo>.xml." }, 400);
      /* UNA SOLA chiamata, `sendXML`: è l'invio completo. Mai anche `uploadXML`: due chiamate
         con lo stesso file possono far arrivare la fattura due volte allo SDI, e una fattura
         doppia non si disfa (serve una nota di credito). */
      const b64 = inBase64(new TextEncoder().encode(xml));
      const { r: send, cfg } = await chiamaAut("sendXML", { base64File: b64, nomeFile: nome });
      return json({ ok: send.ok, invio: send.dato, error: send.ok ? undefined : conIndizio(send.errore, cfg), grezzo: String(send.grezzo || "").slice(0, 600) }, send.ok ? 200 : 502);
    }
    return json({ error: "Azione non riconosciuta" }, 400);
  } catch (e) {
    return json({ error: (e && e.message) || "Errore imprevisto" }, e && e.utente ? 400 : 500);
  }
}
