// ============================================================================
// GMAIL — invio delle email dalla casella del titolare (OAuth 2.0 + Gmail API)
//
// Il titolare collega il SUO account Google: le email partono dal suo
// indirizzo e restano fra le «Inviate». Il gestionale chiede a Google solo il
// permesso di INVIARE (gmail.send), mai di leggere, più `openid email` per
// sapere quale account è collegato e `calendar` per Google Calendar a due vie.
//
// Rotte (/api/gmail?action=…), col cookie del titolare (ruolo azienda):
//   GET  stato                 → { configurato, clientId, collegato, email, scope, redirect, … }
//   POST config {clientId, clientSecret}  il segreto NON torna mai indietro
//   GET  autorizza             → { url } della pagina di Google
//   GET  ritorno&code&state    ← qui torna Google (senza cookie: lo state dice di quale salone è)
//   POST scollega | dimentica
//   POST prova                 email di prova a se stessi
//   POST invia {a, cc, ccn, oggetto, testo, allegati:[{nome,tipo,base64}]}
//
// Segreti in `integrazioni` (server/core/integrazioni.js): gmail:cfg
// {clientId, clientSecret}, gmail:token {refresh, email, scope, il, ultimoInvio,
// ultimoErrore}, gmail:access {token, scade}, gmail:state:<state> {scade}.
// ============================================================================
import { json } from "./util.js";
import { leggiInt, scriviInt, cancellaInt, leggiIntValido } from "./integrazioni.js";

export const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE = "https://oauth2.googleapis.com/revoke";
export const GMAIL_SEND = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
export const SCOPE = "openid email https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar";
const CFG = "gmail:cfg", TOKEN = "gmail:token", ACCESSO = "gmail:access";
const MAX_TOTALE = 18 * 1024 * 1024; // la Gmail API accetta fino a 25 MB di messaggio codificato

const testo = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").slice(0, max || 200);
const riga = (v, max) => testo(v, max).replace(/[\r\n]+/g, " ").trim();
export const emailOk = (s) => /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/.test(s);
export const indirizzi = (v) => String(v || "").split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);

function b64Utf8(s) {
  const byte = new TextEncoder().encode(String(s));
  let bin = "";
  for (let i = 0; i < byte.length; i += 8192) bin += String.fromCharCode.apply(null, byte.subarray(i, i + 8192));
  return btoa(bin);
}
const b64url = (b64) => b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
// intestazioni con caratteri non ASCII (accenti nell'oggetto o nel nome file): RFC 2047
const intestazione = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : "=?UTF-8?B?" + b64Utf8(s) + "?=");
const aCapo = (b64) => b64.replace(/(.{76})/g, "$1\r\n");

// Il messaggio MIME: testo semplice + HTML minimo (link cliccabili, a capo) + allegati.
export function gmailMime({ da, a, cc, ccn, oggetto, testo: corpo, html: htmlPronto, allegati }) {
  const conf = "=_lc_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const alt = conf + "_alt";
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = htmlPronto || ('<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#292524">'
    + esc(corpo).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>').replace(/\r?\n/g, "<br>") + "</div>");
  const h = [];
  if (da) h.push("From: " + da);
  h.push("To: " + a.join(", "));
  if (cc && cc.length) h.push("Cc: " + cc.join(", "));
  if (ccn && ccn.length) h.push("Bcc: " + ccn.join(", "));
  h.push("Subject: " + intestazione(oggetto));
  h.push("MIME-Version: 1.0");
  h.push('Content-Type: multipart/mixed; boundary="' + conf + '"');
  const parti = ["--" + conf, 'Content-Type: multipart/alternative; boundary="' + alt + '"', "",
    "--" + alt, 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", aCapo(b64Utf8(corpo)),
    "--" + alt, 'Content-Type: text/html; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", aCapo(b64Utf8(html)),
    "--" + alt + "--"];
  (allegati || []).forEach((x) => {
    const nome = intestazione(x.nome);
    parti.push("--" + conf, "Content-Type: " + x.tipo + '; name="' + nome + '"', 'Content-Disposition: attachment; filename="' + nome + '"', "Content-Transfer-Encoding: base64", "", aCapo(x.base64));
  });
  parti.push("--" + conf + "--", "");
  return h.join("\r\n") + "\r\n\r\n" + parti.join("\r\n");
}

// l'email dentro l'id_token (arriva diretto da Google in HTTPS: non serve verificarne la firma)
function emailDaIdToken(idt) {
  try {
    const p = String(idt || "").split(".")[1] || "";
    const json2 = atob(p.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((p.length + 3) % 4));
    return JSON.parse(decodeURIComponent(escape(json2))).email || "";
  } catch (e) { return ""; }
}

// Il token di accesso dura un'ora: lo si tiene da parte e si rinnova col refresh token.
export async function gmailAccesso(env, aid) {
  const c = await leggiInt(env, aid, ACCESSO);
  if (c && c.token && c.scade > Date.now()) return { token: c.token };
  const cfg = await leggiInt(env, aid, CFG), tok = await leggiInt(env, aid, TOKEN);
  if (!cfg || !tok || !tok.refresh) return { errore: "Google non è collegato: vai in Impostazioni → Google." };
  let r, d;
  try {
    r = await fetch(GOOGLE_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, refresh_token: tok.refresh, grant_type: "refresh_token" }).toString() });
    d = await r.json().catch(() => ({}));
  } catch (e) { return { errore: "Non riesco a raggiungere Google: " + ((e && e.message) || e) }; }
  if (!r.ok || !d.access_token) {
    if (d && d.error === "invalid_grant") {
      await scriviInt(env, aid, TOKEN, { ...tok, refresh: "", ultimoErrore: "Il permesso di Google è scaduto o è stato tolto: ricollega l'account." });
      return { errore: "Il permesso di Google è scaduto o è stato tolto: vai in Impostazioni → Google e ricollega l'account." };
    }
    return { errore: "Google non ha rinnovato l'accesso" + (d && d.error ? " (" + d.error + ")" : "") + "." };
  }
  await scriviInt(env, aid, ACCESSO, { token: d.access_token, scade: Date.now() + (Number(d.expires_in) || 3000) * 1000 - 120000 });
  return { token: d.access_token };
}

// Manda un'email con la casella collegata. m = { a:[…], cc, ccn, oggetto, testo, html?, allegati? }
// → { ok, id, da } oppure { ok:false, errore, http }. La usano anche le email automatiche.
export async function gmailInvia(env, aid, m) {
  const acc = await gmailAccesso(env, aid);
  if (!acc.token) return { ok: false, errore: acc.errore, http: 400 };
  const tok = (await leggiInt(env, aid, TOKEN)) || {};
  const raw = b64url(b64Utf8(gmailMime({ ...m, da: tok.email || "" })));
  let r, d;
  try {
    r = await fetch(GMAIL_SEND, { method: "POST", headers: { Authorization: "Bearer " + acc.token, "Content-Type": "application/json" }, body: JSON.stringify({ raw }) });
    d = await r.json().catch(() => ({}));
  } catch (e) { return { ok: false, errore: "Non riesco a raggiungere Gmail: " + ((e && e.message) || e), http: 502 }; }
  if (!r.ok) {
    if (r.status === 401) await cancellaInt(env, aid, ACCESSO);
    const msg = (d && d.error && (d.error.message || d.error)) || ("HTTP " + r.status);
    await scriviInt(env, aid, TOKEN, { ...tok, ultimoErrore: "Invio non riuscito: " + riga(msg, 200) });
    return { ok: false, errore: "Gmail non ha accettato l'email: " + riga(msg, 300), http: 502 };
  }
  await scriviInt(env, aid, TOKEN, { ...tok, ultimoInvio: new Date().toISOString(), ultimoErrore: "" });
  return { ok: true, id: (d && d.id) || "", da: tok.email || "" };
}

// Dove si torna dopo Google: il gestionale del salone (sul suo dominio è /gestionale).
export const paginaRitorno = (origin, cliente, esito) => origin + (cliente ? "/gestionale" : "/") + "?gmail=" + encodeURIComponent(esito);

// ---- il ritorno da Google: PUBBLICO (Google non manda il cookie), lo state dice il salone ----
export async function gmailRitorno(ctx, cliente) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const torna = (esito) => new Response(null, { status: 302, headers: { Location: paginaRitorno(url.origin, cliente, esito), "Cache-Control": "no-store" } });
  const state = url.searchParams.get("state") || "";
  // lo state porta il salone: "<azienda>.<casuale>"
  const aid = state.split(".")[0];
  if (!aid || !state.includes(".")) return torna("scaduto");
  const st = await leggiIntValido(env, aid, "gmail:state:" + state);
  if (!st) return torna("scaduto");
  await cancellaInt(env, aid, "gmail:state:" + state);
  if (url.searchParams.get("error")) return torna("negato");
  const code = url.searchParams.get("code") || "";
  const cfg = await leggiInt(env, aid, CFG);
  if (!cfg || !code) return torna("errore");
  const redirect = url.origin + "/api/gmail?action=ritorno";
  let r, d;
  try {
    r = await fetch(GOOGLE_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: redirect, grant_type: "authorization_code" }).toString() });
    d = await r.json().catch(() => ({}));
  } catch (e) { return torna("errore"); }
  if (!r.ok || !d.refresh_token) return torna(r.ok && d.refresh_token === undefined ? "senza-refresh" : "errore");
  if (String(d.scope || "").indexOf("gmail.send") < 0) return torna("permesso-mancante");
  await scriviInt(env, aid, TOKEN, { refresh: d.refresh_token, email: emailDaIdToken(d.id_token), scope: String(d.scope || ""), il: new Date().toISOString() });
  if (d.access_token) await scriviInt(env, aid, ACCESSO, { token: d.access_token, scade: Date.now() + (Number(d.expires_in) || 3000) * 1000 - 120000 });
  return torna("collegato");
}

// ---- le altre azioni, col titolare autenticato ----
export async function gmail(ctx, sess, aid) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "";
  const corpo = async () => { try { return await request.json(); } catch (e) { return null; } };
  const redirect = url.origin + "/api/gmail?action=ritorno";
  const noStore = { "Cache-Control": "no-store" };

  if (action === "stato") {
    const cfg = await leggiInt(env, aid, CFG), tok = await leggiInt(env, aid, TOKEN);
    return json({ configurato: !!(cfg && cfg.clientId && cfg.clientSecret), clientId: (cfg && cfg.clientId) || "", collegato: !!(tok && tok.refresh), email: (tok && tok.email) || "",
      scope: (tok && tok.scope) || "", collegatoIl: (tok && tok.il) || "", ultimoInvio: (tok && tok.ultimoInvio) || "", ultimoErrore: (tok && tok.ultimoErrore) || "", redirect }, 200, noStore);
  }
  if (request.method === "POST" && action === "config") {
    const b = (await corpo()) || {};
    const clientId = riga(b.clientId, 300), clientSecret = riga(b.clientSecret, 300);
    const prima = (await leggiInt(env, aid, CFG)) || {};
    if (!clientId) return json({ error: "Manca l'ID client." }, 400);
    if (!/\.apps\.googleusercontent\.com$/.test(clientId)) return json({ error: "L'ID client di Google finisce con «.apps.googleusercontent.com»: controlla di averlo copiato tutto." }, 400);
    const segreto = clientSecret || (prima.clientId === clientId ? prima.clientSecret : "");
    if (!segreto) return json({ error: "Manca il client secret." }, 400);
    await scriviInt(env, aid, CFG, { clientId, clientSecret: segreto, il: new Date().toISOString() });
    // un client nuovo invalida il permesso dato a quello vecchio
    if (prima.clientId && prima.clientId !== clientId) { await cancellaInt(env, aid, TOKEN); await cancellaInt(env, aid, ACCESSO); }
    return json({ ok: true });
  }
  if (request.method === "POST" && action === "dimentica") {
    await cancellaInt(env, aid, CFG); await cancellaInt(env, aid, TOKEN); await cancellaInt(env, aid, ACCESSO);
    return json({ ok: true });
  }
  if (action === "autorizza") {
    const cfg = await leggiInt(env, aid, CFG);
    if (!cfg || !cfg.clientId) return json({ error: "Prima inserisci ID client e client secret." }, 400);
    const state = aid + "." + crypto.randomUUID();
    await scriviInt(env, aid, "gmail:state:" + state, { scade: Date.now() + 15 * 60 * 1000 });
    const q = new URLSearchParams({ client_id: cfg.clientId, redirect_uri: redirect, response_type: "code", scope: SCOPE, access_type: "offline", prompt: "consent", include_granted_scopes: "true", state });
    return json({ url: GOOGLE_AUTH + "?" + q.toString() });
  }
  if (request.method === "POST" && action === "scollega") {
    const tok = await leggiInt(env, aid, TOKEN);
    if (tok && tok.refresh) { try { await fetch(GOOGLE_REVOKE, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "token=" + encodeURIComponent(tok.refresh) }); } catch (e) {} }
    await cancellaInt(env, aid, TOKEN); await cancellaInt(env, aid, ACCESSO);
    return json({ ok: true });
  }
  const manda = async (m) => { const r = await gmailInvia(env, aid, m); return r.ok ? json({ ok: true, id: r.id, da: r.da }) : json({ error: r.errore }, r.http || 502); };
  if (request.method === "POST" && action === "prova") {
    const tok = await leggiInt(env, aid, TOKEN);
    if (!tok || !tok.email) return json({ error: "Google non è collegato." }, 400);
    return manda({ a: [tok.email], oggetto: "Prova dal gestionale", testo: "Questa è un'email di prova mandata dal tuo gestionale.\n\nSe la vedi, il collegamento con Gmail funziona.", allegati: [] });
  }
  if (request.method === "POST" && action === "invia") {
    const b = (await corpo()) || {};
    const a = indirizzi(b.a), cc = indirizzi(b.cc), ccn = indirizzi(b.ccn);
    // «mandane una copia anche a me»: in copia nascosta alla casella collegata
    if (b.copiaAMe) { const tok = await leggiInt(env, aid, TOKEN); if (tok && tok.email && !ccn.includes(tok.email)) ccn.push(tok.email); }
    const sbagliati = a.concat(cc, ccn).filter((x) => !emailOk(x));
    if (!a.length) return json({ error: "Manca l'indirizzo del destinatario." }, 400);
    if (sbagliati.length) return json({ error: "Indirizzo email non valido: " + sbagliati.join(", ") }, 400);
    if (a.length + cc.length + ccn.length > 20) return json({ error: "Troppi destinatari (massimo 20)." }, 400);
    const oggetto = riga(b.oggetto, 250);
    if (!oggetto) return json({ error: "Manca l'oggetto." }, 400);
    const allegati = []; let totale = 0;
    for (const x of Array.isArray(b.allegati) ? b.allegati.slice(0, 10) : []) {
      const base64 = String((x && x.base64) || "").replace(/[^A-Za-z0-9+/=]/g, "");
      if (!base64) continue;
      totale += base64.length;
      allegati.push({ nome: riga(x.nome, 120).replace(/["\\]/g, "") || "allegato.pdf", tipo: /^[\w.+-]+\/[\w.+-]+$/.test(x.tipo || "") ? x.tipo : "application/pdf", base64 });
    }
    if (totale > MAX_TOTALE) return json({ error: "Gli allegati sono troppo grandi per un'email." }, 400);
    return manda({ a, cc, ccn, oggetto, testo: testo(b.testo, 20000), html: b.html ? testo(b.html, 60000) : undefined, allegati });
  }
  return json({ error: "Azione non riconosciuta" }, 400);
}
