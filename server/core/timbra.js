// ============================================================================
// TIMBRATURA dal telefono (/utenti): entrata e uscita del giorno finiscono nel
// foglio ore della collezione `personale` (area Gestione personale), con la
// lettura-modifica-scrittura fatta qui sul server così due timbrature
// ravvicinate non si pestano. Un accesso da operatore può timbrare solo per sé.
//   GET  /api/timbra?staffId=…  → la voce di oggi
//   POST /api/timbra {staffId, azione: "entrata"|"uscita"}
// ============================================================================
import { json } from "./util.js";
import { getCollezione } from "./disponibilita.js";
import { registra } from "./registro.js";
import { oraRoma } from "./promemoria.js";

const pad = (n) => String(n).padStart(2, "0");
const hhmm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
// Il dipendente di un operatore: la scheda con quello staffId, altrimenti l'id implicito "st-<staffId>".
export function dipIdDi(personale, staffId) {
  const e = ((personale && personale.dipendenti) || []).find((d) => d && d.staffId === staffId);
  return e ? e.id : "st-" + staffId;
}
export async function timbraRoute(ctx, sess, statoDi) {
  const { request, env } = ctx;
  if ((sess.ruolo !== "azienda" && sess.ruolo !== "operatore") || !sess.azienda_id) return json({ error: "riservato al salone" }, 403);
  const aid = sess.azienda_id;
  const url = new URL(request.url);
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const staffId = String((request.method === "POST" ? body.staffId : url.searchParams.get("staffId")) || sess.staff_id || "").trim();
  if (!staffId) return json({ error: "operatore richiesto" }, 400);
  if (sess.ruolo === "operatore" && staffId !== sess.staff_id) return json({ error: "puoi timbrare solo per te" }, 403);
  const config = (await getCollezione(env, aid, "config")) || {};
  const st = (config.staff || []).find((x) => x.id === staffId);
  if (!st) return json({ error: "operatore non trovato" }, 404);
  const personale = (await getCollezione(env, aid, "personale")) || {};
  const dipId = dipIdDi(personale, staffId);
  const ora = oraRoma(new Date());
  const ore = personale.ore || {};
  const giorno = (ore[dipId] || {})[ora.data] || {};
  if (request.method === "GET") return json({ ok: true, data: ora.data, dipId, giorno }, 200, { "Cache-Control": "no-store" });
  if (request.method !== "POST") return json({ error: "metodo non consentito" }, 405);
  const azione = body.azione === "uscita" ? "uscita" : "entrata";
  if (azione === "entrata" && giorno.entrata && !body.sovrascrivi) return json({ error: `Entrata già timbrata alle ${giorno.entrata}.`, giorno }, 409);
  if (azione === "uscita" && !giorno.entrata) return json({ error: "Prima timbra l'entrata." }, 409);
  if (azione === "uscita" && giorno.uscita && !body.sovrascrivi) return json({ error: `Uscita già timbrata alle ${giorno.uscita}.`, giorno }, 409);
  const nuovo = { ...giorno, tipo: "lavoro", [azione]: hhmm(ora.minuti), timbrato: true, ...(azione === "uscita" && giorno.pausa == null ? { pausa: Number(body.pausa) || 0 } : {}) };
  const aggiornato = { ...personale, ore: { ...ore, [dipId]: { ...(ore[dipId] || {}), [ora.data]: nuovo } } };
  await env.DB.prepare("INSERT INTO dati_app (id, azienda_id, collezione, dati, aggiornato_il) VALUES (?, ?, 'personale', ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET dati = excluded.dati, aggiornato_il = datetime('now')").bind(aid + ":personale", aid, JSON.stringify(aggiornato)).run();
  await registra(env, aid, { chi: sess.email, origine: "telefono", tipo: "personale", testo: `${st.name}: timbrata ${azione} alle ${hhmm(ora.minuti)}` });
  return json({ ok: true, data: ora.data, dipId, giorno: nuovo });
}
