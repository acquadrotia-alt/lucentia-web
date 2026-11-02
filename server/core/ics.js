// ============================================================================
// FEED iCALENDAR DELL'AGENDA, in sola lettura, con un codice segreto
// nell'indirizzo: /api/agenda-ics?k=<codice>. Si abbona da iPhone, Outlook o
// Google Calendar («Aggiungi calendario da URL»). Contiene nomi e orari dei
// clienti, quindi mai senza codice. Il codice sta in `integrazioni`
// (ics:chiave) e si vede o si rigenera dal gestionale:
//   GET  ?action=stato     (titolare) → { url }
//   POST ?action=rigenera  (titolare) → { url }   (il vecchio indirizzo smette di valere)
// ============================================================================
import { json, randomToken } from "./util.js";
import { getCollezione } from "./disponibilita.js";
import { leggiInt, scriviInt } from "./integrazioni.js";

const CFG = "ics:chiave";
const pad2 = (n) => String(n).padStart(2, "0");
const hhmm = (m) => pad2(Math.floor(m / 60)) + pad2(m % 60) + "00";

// confronto a tempo costante (il codice è nell'indirizzo)
function confronto(a, b) {
  a = String(a || ""); b = String(b || "");
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function icsGestione(ctx, sess, aid) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "";
  if (action === "rigenera" && request.method !== "POST") return json({ error: "metodo non consentito" }, 405);
  let cfg = await leggiInt(env, aid, CFG);
  if (!cfg || !cfg.chiave || action === "rigenera") { cfg = { chiave: randomToken(24), il: new Date().toISOString() }; await scriviInt(env, aid, CFG, cfg); }
  return json({ url: url.origin + "/api/agenda-ics?k=" + cfg.chiave }, 200, { "Cache-Control": "no-store" });
}

// Il feed pubblico. `trovaAzienda(k)` dice di quale salone è il codice.
export async function icsFeed(ctx, aziende) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const k = String(url.searchParams.get("k") || "").trim();
  const rifiuto = () => new Response("Calendario non disponibile: serve l'indirizzo con il codice (Impostazioni → Google → Calendario per telefono e Outlook).", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  if (!k || k.length < 20) return rifiuto();
  let az = null;
  for (const a of aziende) { const cfg = await leggiInt(env, a.id, CFG); if (cfg && cfg.chiave && confronto(k, cfg.chiave)) { az = a; break; } }
  if (!az) return rifiuto();
  const config = (await getCollezione(env, az.id, "config")) || {};
  const bookings = (await getCollezione(env, az.id, "bookings")) || [];
  const nome = (config.branding && config.branding.name) || az.denominazione || "Agenda";
  const servizio = (id) => { const s = (config.services || []).find((x) => x.id === id); return s ? s.name : null; };
  const operatore = (id) => { const s = (config.staff || []).find((x) => x.id === id); return s ? s.name : ""; };
  const esc = (s) => String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const fold = (line) => {
    const enc = new TextEncoder();
    if (enc.encode(line).length <= 75) return line;
    const out = []; let cur = "", len = 0;
    for (const ch of line) { const l = enc.encode(ch).length; if (len + l > (out.length === 0 ? 75 : 74)) { out.push(cur); cur = ""; len = 0; } cur += ch; len += l; }
    if (cur) out.push(cur);
    return out.join("\r\n ");
  };
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lucentia//Agenda//IT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:" + esc("Agenda " + nome), "X-WR-TIMEZONE:Europe/Rome", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H",
    "BEGIN:VTIMEZONE", "TZID:Europe/Rome", "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT", "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD", "END:VTIMEZONE"];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  for (const b of Array.isArray(bookings) ? bookings : []) {
    if (!b || !/^\d{4}-\d{2}-\d{2}$/.test(b.date || "") || b.status === "cancelled") continue;
    const d = b.date.replace(/-/g, "");
    const servizi = (b.serviceIds || []).map(servizio).filter(Boolean).join(", ");
    lines.push("BEGIN:VEVENT", "UID:" + esc(b.id) + "@lucentia", "DTSTAMP:" + stamp,
      "DTSTART;TZID=Europe/Rome:" + d + "T" + hhmm(b.startMin), "DTEND;TZID=Europe/Rome:" + d + "T" + hhmm(Math.max(b.endMin, b.startMin + 5)),
      "SUMMARY:" + esc((b.clientName || "Appuntamento") + (servizi ? " · " + servizi : "")));
    const descr = [operatore(b.staffId) ? "Operatore: " + operatore(b.staffId) : "", b.clientEmail ? "Email: " + b.clientEmail : "", b.note || ""].filter(Boolean).join("\n");
    if (descr) lines.push("DESCRIPTION:" + esc(descr));
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.map(fold).join("\r\n") + "\r\n", { status: 200, headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="agenda.ics"', "Cache-Control": "no-store" } });
}
