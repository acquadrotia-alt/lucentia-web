// ============================================================================
// EMAIL AUTOMATICHE AI CLIENTI (modulo google, casella Gmail del salone):
//   · conferma a ogni nuovo appuntamento (subito per le prenotazioni online,
//     al primo giro per quelle prese al banco o dal telefono),
//   · promemoria alle 19 del giorno prima,
//   · promemoria un'ora prima,
//   · richiesta di recensione dopo il PRIMO appuntamento svolto del cliente,
//     una volta sola per cliente (chiave mail:recensione:<email>), se il salone
//     ha scritto il link in config.google.recensioni.link.
// Cloudflare Pages non ha un orologio: il giro lo chiama GitHub ogni 10 minuti
// (.github/workflows/promemoria.yml) sul portale, POST /api/promemoria/giro,
// che lo esegue per i saloni ospitati e lo gira a ogni installazione
// (POST https://<dominio>/api/promemoria). La rotta è pubblica ma innocua:
// manda solo ciò che è dovuto, una volta sola (chiave mail:<id>:<tipo> in
// `integrazioni`), e non più di una volta al minuto.
// ============================================================================
import { json, parseModuli } from "./util.js";
import { getCollezione } from "./disponibilita.js";
import { gmailInvia } from "./gmail.js";
import { leggiInt, scriviInt, cancellaInt } from "./integrazioni.js";
import { emailPronta, valoriAppuntamento } from "../../src/core/email/modelli.js";

const SISTEMA = "_sistema";
const PAUSA_MS = 60 * 1000;
const pad = (n) => String(n).padStart(2, "0");
// l'ora di Roma, per «le 19 del giorno prima» e «un'ora prima»
export function oraRoma(adesso) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(adesso).map((x) => [x.type, x.value]));
  return { data: `${p.year}-${p.month}-${p.day}`, minuti: Number(p.hour) * 60 + Number(p.minute) };
}
const giornoPrima = (d) => { const [y, m, g] = d.split("-").map(Number); const x = new Date(Date.UTC(y, m - 1, g - 1)); return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`; };
const emailOk = (s) => /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/.test(String(s || ""));

// Manda un'email di un tipo per un appuntamento, una volta sola.
export async function inviaEmailAppuntamento(env, aid, config, b, tipo, extra) {
  const a = String(b.clientEmail || "").trim().toLowerCase();
  if (!emailOk(a)) return { ok: false, motivo: "senza email" };
  const chiave = `mail:${b.id}:${tipo}`;
  if (await leggiInt(env, aid, chiave)) return { ok: false, motivo: "già inviata" };
  await scriviInt(env, aid, chiave, { il: new Date().toISOString(), a });
  const m = emailPronta(config, tipo, valoriAppuntamento(b, config, extra));
  const r = await gmailInvia(env, aid, { a: [a], oggetto: m.oggetto, testo: m.testo, allegati: [] });
  if (!r.ok) { await cancellaInt(env, aid, chiave); return { ok: false, motivo: r.errore }; }
  return { ok: true };
}

// Tutti gli appuntamenti futuri del salone con l'email del cliente: quelli
// dell'agenda (blob bookings) e le prenotazioni online non ancora importate.
export async function appuntamentiConEmail(env, aid, config, dataDa) {
  const clients = (await getCollezione(env, aid, "clients")) || [];
  const emailDi = (code, diretta) => { if (emailOk(diretta)) return String(diretta).trim(); const c = (Array.isArray(clients) ? clients : []).find((x) => x.code === code); return c && emailOk(c.email) ? String(c.email).trim() : ""; };
  const bookings = (await getCollezione(env, aid, "bookings")) || [];
  const out = (Array.isArray(bookings) ? bookings : []).filter((b) => b && b.date >= dataDa && b.status !== "cancelled" && b.status !== "noshow").map((b) => ({ ...b, clientEmail: emailDi(b.clientCode, b.clientEmail) })).filter((b) => b.clientEmail);
  try {
    const res = await env.DB.prepare("SELECT * FROM prenotazioni_online WHERE azienda_id = ? AND stato = 'attiva' AND data >= ? ORDER BY data, start_min").bind(aid, dataDa).all();
    (res.results || []).forEach((r) => { const e = emailDi(r.client_code, r.client_email); if (e) out.push({ id: r.id, date: r.data, startMin: r.start_min, endMin: r.end_min, serviceIds: [r.service_id], staffId: r.staff_id, clientName: r.client_name, clientCode: r.client_code, clientEmail: e, createdAt: Date.parse(r.creato_il + "Z") || Date.now(), online: true }); });
  } catch (e) {}
  return out;
}

// La richiesta di recensione: al primo appuntamento svolto del cliente (negli
// ultimi 3 giorni), una volta sola per indirizzo email.
export async function giroRecensioni(env, aid, config, ora, esito) {
  const rc = (config.google || {}).recensioni || {};
  if (!rc.attivo || !rc.link) return;
  const clients = (await getCollezione(env, aid, "clients")) || [];
  const emailDi = (b) => { if (emailOk(b.clientEmail)) return String(b.clientEmail).trim().toLowerCase(); const c = (Array.isArray(clients) ? clients : []).find((x) => x.code === b.clientCode); return c && emailOk(c.email) ? String(c.email).trim().toLowerCase() : ""; };
  const bookings = (await getCollezione(env, aid, "bookings")) || [];
  const da = giornoPrima(giornoPrima(giornoPrima(ora.data)));
  const svolti = (Array.isArray(bookings) ? bookings : []).filter((b) => b && (b.status === "done" || b.status === "partial") && b.date >= da && b.date <= ora.data && !(b.date === ora.data && (Number(b.endMin) || 0) > ora.minuti));
  const visti = new Set();
  for (const b of svolti.slice(0, 200)) {
    const a = emailDi(b); if (!a || visti.has(a)) continue; visti.add(a);
    const chiave = `mail:recensione:${a}`;
    if (await leggiInt(env, aid, chiave)) continue;
    try {
      await scriviInt(env, aid, chiave, { il: new Date().toISOString(), appuntamento: b.id });
      const m = emailPronta(config, "recensione", valoriAppuntamento({ ...b, clientEmail: a }, config, { linkRecensione: rc.link }));
      const r = await gmailInvia(env, aid, { a: [a], oggetto: m.oggetto, testo: m.testo, allegati: [] });
      if (r.ok) esito.recensioni++; else { await cancellaInt(env, aid, chiave); esito.errori++; }
    } catch (e) { esito.errori++; }
  }
}

// Il giro per un salone: cosa è dovuto adesso.
export async function giroPromemoria(env, aid, az, adesso) {
  const esito = { aid, conferme: 0, giornoPrima: 0, oraPrima: 0, recensioni: 0, errori: 0 };
  if (!parseModuli(az.moduli).includes("google")) return { ...esito, motivo: "modulo google spento" };
  const tok = await leggiInt(env, aid, "gmail:token");
  if (!tok || !tok.refresh) return { ...esito, motivo: "Gmail non collegato" };
  const config = (await getCollezione(env, aid, "config")) || {};
  const g = config.google || {};
  const ora = oraRoma(adesso || new Date());
  const lista = await appuntamentiConEmail(env, aid, config, ora.data);
  for (const b of lista.slice(0, 400)) {
    const inizio = Number(b.startMin) || 0;
    const oggi = b.date === ora.data;
    const passato = oggi && inizio <= ora.minuti;
    try {
      // conferma: appuntamento futuro preso da poco (48 h), non ancora confermato per email
      if (g.confermaAutomatica !== false && !passato && (Number(b.createdAt) || 0) > (adesso || new Date()).getTime() - 48 * 3600000) {
        const r = await inviaEmailAppuntamento(env, aid, config, b, "conferma"); if (r.ok) esito.conferme++; else if (r.motivo && !/già|senza/.test(r.motivo)) esito.errori++;
      }
      // alle 19 del giorno prima (e fino all'inizio dell'appuntamento, se il giro è passato dopo)
      if (g.promemoriaGiornoPrima !== false && !passato && ((ora.data === giornoPrima(b.date) && ora.minuti >= 19 * 60) || (oggi && !passato && ora.minuti < inizio - 60))) {
        const r = await inviaEmailAppuntamento(env, aid, config, b, "promemoria"); if (r.ok) esito.giornoPrima++; else if (r.motivo && !/già|senza/.test(r.motivo)) esito.errori++;
      }
      // un'ora prima
      if (g.promemoriaOraPrima !== false && oggi && !passato && inizio - ora.minuti <= 60) {
        const r = await inviaEmailAppuntamento(env, aid, config, b, "oraPrima"); if (r.ok) esito.oraPrima++; else if (r.motivo && !/già|senza/.test(r.motivo)) esito.errori++;
      }
    } catch (e) { esito.errori++; }
  }
  try { await giroRecensioni(env, aid, config, ora, esito); } catch (e) { esito.errori++; }
  return esito;
}

// POST /api/promemoria  (ogni deployment)  ·  POST /api/promemoria/giro  (solo il portale: anche le installazioni)
export async function promemoriaRoute(ctx, segs, cliente, statoDi) {
  const { request, env } = ctx;
  if (request.method !== "POST") return json({ error: "metodo non consentito" }, 405);
  const ultimo = await leggiInt(env, SISTEMA, "promemoria:ultimo");
  if (ultimo && Date.now() - (Number(ultimo.ts) || 0) < PAUSA_MS && !new URL(request.url).searchParams.get("forza")) return json({ ok: true, saltato: true, motivo: "giro fatto da meno di un minuto" });
  await scriviInt(env, SISTEMA, "promemoria:ultimo", { ts: Date.now() });
  const res = await env.DB.prepare("SELECT * FROM aziende WHERE attiva = 1").all();
  const esiti = [];
  for (const az of res.results || []) {
    if (az.demo) continue;
    if ((await statoDi(az)) !== "active") continue;
    try { esiti.push(await giroPromemoria(env, az.id, az, new Date())); } catch (e) { esiti.push({ aid: az.id, errore: String((e && e.message) || e) }); }
  }
  const out = { ok: true, quando: new Date().toISOString(), saloni: esiti };
  if (!cliente && segs[1] === "giro") {
    // le installazioni dei clienti, ognuna sul suo dominio
    let inst = [];
    try { inst = ((await env.DB.prepare("SELECT id, nome, dominio, dominio_rilevato FROM installazioni WHERE attiva = 1").all()).results || []); } catch (e) {}
    const chiamate = inst.map(async (i) => {
      const dom = String(i.dominio || i.dominio_rilevato || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      if (!dom) return { installazione: i.nome, motivo: "senza dominio" };
      try {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 25000);
        const r = await fetch(`https://${dom}/api/promemoria`, { method: "POST", signal: ctrl.signal });
        clearTimeout(t);
        return { installazione: i.nome, dominio: dom, http: r.status, esito: await r.json().catch(() => null) };
      } catch (e) { return { installazione: i.nome, dominio: dom, errore: String((e && e.message) || e) }; }
    });
    out.installazioni = (await Promise.allSettled(chiamate)).map((x) => (x.status === "fulfilled" ? x.value : { errore: String(x.reason) }));
  }
  return json(out);
}
