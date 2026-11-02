// ============================================================================
// GOOGLE CALENDAR A DUE VIE
//
// Stesso account Google collegato per Gmail, col permesso in più `calendar`.
// Ogni operatore del salone è abbinato a un calendario che esiste già su
// Google (più un calendario predefinito per gli appuntamenti senza operatore,
// es. solo cabina): gli appuntamenti dell'agenda finiscono lì, e quello che si
// crea, sposta o cancella su Google si vede nell'agenda.
//
// Abbinamenti in `integrazioni` → gcal:cfg:
//   { attivo, mappa: { op: { <staffId>: <calendarId> }, altro: <calendarId> }, nomi: { <calendarId>: { nome, colore } }, ultimoErrore }
//
// Rotte (/api/gcal?action=…), col cookie del titolare:
//   GET  stato      → { collegato, email, permesso, attivo, mappa, nomi, ultimoErrore }
//   GET  calendari  → { calendari: [{ id, nome, colore, primario, scrivibile }] }
//   POST config  { attivo, mappa }
//   POST eventi  { da, a, noti:[{gid, cal}] } → { calendari, eventi, noti }
//   POST spingi  { eventi:[{ locale?, gid?, cal, primaCal?, title, date, start, end, allDay, place, descrizione }] } → { esiti }
//   POST elimina { eventi:[{gid, cal}] } → { esiti }
// L'id Google di un appuntamento del gestionale è fisso, ricavato dal suo id:
// rimandarlo due volte non crea mai doppioni.
// ============================================================================
import { json } from "./util.js";
import { leggiInt, scriviInt, cancellaInt } from "./integrazioni.js";
import { gmailAccesso } from "./gmail.js";

export const GCAL = "https://www.googleapis.com/calendar/v3";
const CFG = "gcal:cfg";
const TZ = "Europe/Rome";

const riga = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max || 300);
const testo = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").slice(0, max || 8000);
const isoOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const oraOk = (s) => /^\d{2}:\d{2}$/.test(String(s || ""));
const calOk = (s) => typeof s === "string" && s.length > 0 && s.length < 300;
const giornoDopo = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + (n == null ? 1 : n)); return x.toISOString().slice(0, 10); };
const minuti = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const hm = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");

// id Google degli appuntamenti del gestionale: i byte dell'id in esadecimale (Google accetta 0-9 a-v)
export const gidDaLocale = (id) => "lc" + Array.from(new TextEncoder().encode(String(id)), (b) => b.toString(16).padStart(2, "0")).join("");
export function localeDaGid(gid) {
  const m = /^lc((?:[0-9a-f]{2})+)$/.exec(String(gid || ""));
  if (!m) return "";
  try { return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(m[1].match(/../g).map((h) => parseInt(h, 16)))); } catch (e) { return ""; }
}

// evento di Google → forma del gestionale
export function daGoogle(g, cal) {
  const s = g.start || {}, e = g.end || {};
  let date = "", start = "", end = "", allDay = false, multiGiorno = false;
  if (s.date) { allDay = true; date = s.date; multiGiorno = !!(e.date && e.date > giornoDopo(s.date)); }
  else if (s.dateTime) {
    date = s.dateTime.slice(0, 10); start = s.dateTime.slice(11, 16);
    const fine = e.dateTime || "";
    if (fine.slice(0, 10) === date) end = fine.slice(11, 16); else { end = "23:59"; multiGiorno = !!fine; }
  }
  const priv = (g.extendedProperties && g.extendedProperties.private) || {};
  return { gid: g.id, cal, locale: priv.gestionale || localeDaGid(g.id), title: g.summary || "", date, start, end, allDay, multiGiorno, place: g.location || "", note: g.description || "", updated: g.updated || "", link: g.htmlLink || "", ricorrente: !!g.recurringEventId, stato: g.status || "" };
}
// forma del gestionale → corpo per Google
export function versoGoogle(x) {
  const date = isoOk(x.date) ? x.date : "";
  const corpo = { summary: riga(x.title, 400) || "(senza titolo)", location: riga(x.place, 400), description: testo(x.descrizione, 8000), status: "confirmed" };
  if (x.allDay || !oraOk(x.start)) { corpo.start = { date }; corpo.end = { date: giornoDopo(date) }; }
  else {
    const a = Math.min(minuti(x.start), 23 * 60 + 58);
    let b = oraOk(x.end) ? minuti(x.end) : a + 60;
    if (b <= a) b = Math.min(a + 60, 23 * 60 + 59);
    corpo.start = { dateTime: date + "T" + hm(a) + ":00", timeZone: TZ };
    corpo.end = { dateTime: date + "T" + hm(Math.min(b, 23 * 60 + 59)) + ":00", timeZone: TZ };
  }
  if (x.locale) corpo.extendedProperties = { private: { gestionale: riga(x.locale, 200) } };
  return corpo;
}

export async function gcal(ctx, sess, aid) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "";
  const corpo = async () => { try { return (await request.json()) || {}; } catch (e) { return {}; } };
  const cfg = (await leggiInt(env, aid, CFG)) || {};
  const tok = (await leggiInt(env, aid, "gmail:token")) || {};
  const permesso = !!tok.refresh && /\/auth\/calendar(\s|$)/.test(String(tok.scope || ""));

  if (action === "stato") return json({ collegato: !!tok.refresh, email: tok.email || "", permesso, attivo: !!cfg.attivo && permesso, mappa: cfg.mappa || { op: {}, altro: "" }, nomi: cfg.nomi || {}, ultimoErrore: cfg.ultimoErrore || "" }, 200, { "Cache-Control": "no-store" });
  if (!permesso) return json({ error: tok.refresh ? "Manca il permesso del calendario: in Impostazioni → Google premi di nuovo «Collega account Google» e lascia la spunta sul calendario." : "Google non è collegato: vai in Impostazioni → Google." }, 400);

  async function g(metodo, percorso, body) {
    const acc = await gmailAccesso(env, aid);
    if (!acc.token) return { ok: false, status: 0, d: { error: { message: acc.errore } } };
    let r, d;
    try {
      r = await fetch(GCAL + percorso, { method: metodo, headers: { Authorization: "Bearer " + acc.token, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      d = r.status === 204 ? {} : await r.json().catch(() => ({}));
    } catch (e) { return { ok: false, status: 0, d: { error: { message: "Non riesco a raggiungere Google: " + ((e && e.message) || e) } } }; }
    if (r.status === 401) await cancellaInt(env, aid, "gmail:access");
    return { ok: r.ok, status: r.status, d };
  }
  const errore = (x) => riga((x.d && x.d.error && (x.d.error.message || x.d.error)) || ("HTTP " + x.status), 300);
  const enc = encodeURIComponent;

  if (action === "calendari") {
    const out = []; let pagina = "";
    for (let i = 0; i < 5; i++) {
      const x = await g("GET", "/users/me/calendarList?maxResults=250" + (pagina ? "&pageToken=" + enc(pagina) : ""));
      if (!x.ok) return json({ error: "Google non ha dato l'elenco dei calendari: " + errore(x) }, 502);
      (x.d.items || []).forEach((c) => out.push({ id: c.id, nome: c.summaryOverride || c.summary || c.id, colore: c.backgroundColor || "", primario: !!c.primary, scrivibile: c.accessRole === "owner" || c.accessRole === "writer" }));
      pagina = x.d.nextPageToken || "";
      if (!pagina) break;
    }
    return json({ calendari: out });
  }
  if (request.method === "POST" && action === "config") {
    const b = await corpo();
    const m = b.mappa || {};
    const op = {};
    Object.keys(m.op || {}).slice(0, 100).forEach((k) => { if (calOk(m.op[k]) && /^[\w:.-]{1,80}$/.test(k)) op[k] = m.op[k]; });
    const mappa = { op, altro: calOk(m.altro) ? m.altro : "" };
    const scelti = Object.values(op).concat(mappa.altro ? [mappa.altro] : []);
    const nomi = {};
    const x = await g("GET", "/users/me/calendarList?maxResults=250");
    if (x.ok) (x.d.items || []).forEach((c) => { if (scelti.indexOf(c.id) >= 0) nomi[c.id] = { nome: c.summaryOverride || c.summary || c.id, colore: c.backgroundColor || "" }; });
    const attivo = b.attivo !== false && scelti.length > 0;
    await scriviInt(env, aid, CFG, { attivo, mappa, nomi, il: new Date().toISOString() });
    return json({ ok: true, attivo, mappa, nomi });
  }
  if (!cfg.attivo) return json({ error: "Google Calendar non è attivo: scegli i calendari in Impostazioni → Google." }, 400);
  const mappa = cfg.mappa || { op: {} };
  const abbinati = Array.from(new Set(Object.values(mappa.op || {}).concat(mappa.altro ? [mappa.altro] : []).filter(Boolean)));

  if (request.method === "POST" && action === "eventi") {
    const b = await corpo();
    if (!isoOk(b.da) || !isoOk(b.a) || b.a < b.da) return json({ error: "Intervallo di date non valido." }, 400);
    const timeMin = giornoDopo(b.da, -1) + "T00:00:00Z", timeMax = giornoDopo(b.a, 1) + "T23:59:59Z";
    const calendari = {}, eventi = [], visti = {};
    for (const cal of abbinati) {
      let pagina = "", buono = true;
      for (let i = 0; i < 8; i++) {
        const x = await g("GET", "/calendars/" + enc(cal) + "/events?singleEvents=true&orderBy=startTime&maxResults=2500&timeZone=" + enc(TZ) + "&timeMin=" + enc(timeMin) + "&timeMax=" + enc(timeMax) + (pagina ? "&pageToken=" + enc(pagina) : ""));
        if (!x.ok) { buono = false; break; }
        (x.d.items || []).forEach((it) => { if (it.status !== "cancelled") { const e = daGoogle(it, cal); if (e.date >= b.da && e.date <= b.a) { eventi.push(e); visti[e.gid] = true; } } });
        pagina = x.d.nextPageToken || "";
        if (!pagina) break;
      }
      calendari[cal] = buono;
    }
    // quelli del gestionale già su Google ma non nell'intervallo: spostati o cancellati?
    const noti = {};
    for (const n of (Array.isArray(b.noti) ? b.noti : []).slice(0, 40)) {
      if (!n || !n.gid || !calOk(n.cal) || visti[n.gid] || noti[n.gid]) continue;
      if (calendari[n.cal] === false) continue;
      const x = await g("GET", "/calendars/" + enc(n.cal) + "/events/" + enc(n.gid) + "?timeZone=" + enc(TZ));
      if (x.status === 404 || x.status === 410 || (x.ok && x.d.status === "cancelled")) noti[n.gid] = { cancellato: true };
      else if (x.ok) noti[n.gid] = daGoogle(x.d, n.cal);
    }
    return json({ calendari, eventi, noti });
  }
  if (request.method === "POST" && action === "spingi") {
    const b = await corpo();
    const esiti = {};
    for (const x of (Array.isArray(b.eventi) ? b.eventi : []).slice(0, 25)) {
      const chiave = (x && (x.locale || x.gid)) || "";
      if (!chiave) continue;
      if (!calOk(x.cal) || abbinati.indexOf(x.cal) < 0) { esiti[chiave] = { ok: false, errore: "Calendario non abbinato." }; continue; }
      if (!isoOk(x.date)) { esiti[chiave] = { ok: false, errore: "Data mancante." }; continue; }
      const gid = x.gid || gidDaLocale(x.locale);
      const body = versoGoogle(x);
      // cambiato operatore → l'appuntamento passa all'altro calendario
      if (calOk(x.primaCal) && x.primaCal !== x.cal) await g("POST", "/calendars/" + enc(x.primaCal) + "/events/" + enc(gid) + "/move?destination=" + enc(x.cal));
      let r;
      if (!x.primaCal && x.locale) {
        r = await g("POST", "/calendars/" + enc(x.cal) + "/events", { ...body, id: gid });
        if (r.status === 409) r = await g("PATCH", "/calendars/" + enc(x.cal) + "/events/" + enc(gid), body);
      } else {
        r = await g("PATCH", "/calendars/" + enc(x.cal) + "/events/" + enc(gid), body);
        if ((r.status === 404 || r.status === 410) && x.locale) r = await g("POST", "/calendars/" + enc(x.cal) + "/events", { ...body, id: gid });
      }
      esiti[chiave] = r.ok ? { ok: true, gid: r.d.id || gid, cal: x.cal, agg: r.d.updated || "" }
        : { ok: false, errore: r.status === 403 ? "Google non permette di scrivere su questo calendario." : r.status === 409 ? "Su Google c'è già un appuntamento con questo codice in un altro calendario." : errore(r) };
    }
    const sbagliati = Object.values(esiti).filter((e) => !e.ok);
    if (sbagliati.length) await scriviInt(env, aid, CFG, { ...cfg, ultimoErrore: sbagliati[0].errore + " (" + new Date().toISOString().slice(0, 16).replace("T", " ") + ")" });
    else if (cfg.ultimoErrore) await scriviInt(env, aid, CFG, { ...cfg, ultimoErrore: "" });
    return json({ esiti });
  }
  if (request.method === "POST" && action === "elimina") {
    const b = await corpo();
    const esiti = {};
    for (const x of (Array.isArray(b.eventi) ? b.eventi : []).slice(0, 25)) {
      if (!x || !x.gid || !calOk(x.cal) || abbinati.indexOf(x.cal) < 0) continue;
      const r = await g("DELETE", "/calendars/" + enc(x.cal) + "/events/" + enc(x.gid));
      esiti[x.gid] = r.ok || r.status === 404 || r.status === 410 ? { ok: true } : { ok: false, errore: errore(r) };
    }
    return json({ esiti });
  }
  return json({ error: "Azione non riconosciuta" }, 400);
}
