// ============================================================================
// REGISTRO DELLE ATTIVITÀ: chi ha fatto cosa e quando, per salone.
//
// Tabella `registro` (migrazione-registro.sql): una riga per accesso,
// salvataggio di dati (con cosa è cambiato), modifica delle impostazioni,
// scontrino, fattura, backup, timbratura, modifica fatta dal cliente dalla
// sua area… Il titolare lo consulta in Impostazioni → Dati e backup.
//
// Il registro non deve mai far fallire l'operazione che lo scrive: ogni
// errore (tabella mancante compresa) viene ignorato. Le voci uguali e
// ravvicinate (es. lo stesso titolare che salva il catalogo dieci volte in
// cinque minuti) si fondono in una sola, col contatore nei dettagli.
// Si tengono gli ultimi 180 giorni.
// ============================================================================
import { json } from "./util.js";

export const GIORNI_REGISTRO = 180;
export const TIPI_REGISTRO = [["accesso", "Accessi"], ["dati", "Dati"], ["impostazioni", "Impostazioni"], ["cassa", "Cassa e scontrini"], ["fatture", "Fatture"], ["backup", "Backup"], ["personale", "Personale"], ["cliente", "Area clienti"], ["sistema", "Sistema"]];

export async function registra(env, aziendaId, { chi, origine, tipo, testo, dettagli, unisci }) {
  if (!env || !env.DB || !aziendaId) return;
  try {
    const t = String(tipo || "sistema").slice(0, 30), s = String(testo || "").slice(0, 300);
    if (unisci) {
      const r = await env.DB.prepare("SELECT id, dettagli FROM registro WHERE azienda_id = ? AND chi = ? AND tipo = ? AND testo = ? AND quando > datetime('now', '-10 minutes') ORDER BY quando DESC LIMIT 1").bind(aziendaId, String(chi || ""), t, s).first();
      if (r) {
        let d = {}; try { d = JSON.parse(r.dettagli || "{}") || {}; } catch (e) {}
        await env.DB.prepare("UPDATE registro SET quando = datetime('now'), dettagli = ? WHERE id = ?").bind(JSON.stringify({ ...d, ...(dettagli || {}), volte: (Number(d.volte) || 1) + 1 }), r.id).run();
        return;
      }
    }
    await env.DB.prepare("INSERT INTO registro (id, azienda_id, quando, chi, origine, tipo, testo, dettagli) VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), aziendaId, String(chi || "").slice(0, 120), String(origine || "").slice(0, 40), t, s, JSON.stringify(dettagli || {})).run();
  } catch (e) { /* registro assente o in errore: l'operazione va avanti lo stesso */ }
}

// Come si descrive un record in una riga del registro.
export function descriviRecord(coll, r) {
  if (!r || typeof r !== "object") return "";
  const ora = (m) => (Number.isFinite(Number(m)) ? `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` : "");
  const data = (d) => (d ? String(d).split("-").reverse().join("/") : "");
  if (coll === "bookings") return `${r.clientName || "appuntamento"} · ${data(r.date)} ${ora(r.startMin)}${r.status ? " · " + r.status : ""}`;
  if (coll === "clients") return `${r.name || "cliente"}${r.code ? " #" + r.code : ""}`;
  if (coll === "sales") return `${r.type === "load" ? "carico" : r.type === "rettifica" ? "rettifica" : r.type === "ordine" ? "ordine" : r.type === "reso" ? "reso" : r.type === "annullo" ? "annullo" : r.partial ? "parziale" : "vendita"} ${r.total != null ? Number(r.total).toFixed(2) + " €" : ""}${r.rt && r.rt.fiscalDoc ? " · scontrino n. " + r.rt.fiscalDoc : ""}`.trim();
  if (coll === "vouchers") return `buono ${r.codice || r.id || ""}`.trim();
  if (coll === "fatture") return `fattura n. ${r.numero || "?"}${r.cliente && r.cliente.denominazione ? " · " + r.cliente.denominazione : ""}`;
  if (coll === "acquisti") return `fattura fornitore n. ${r.numero || "?"}${r.fornitore && r.fornitore.denominazione ? " · " + r.fornitore.denominazione : ""}`;
  if (coll === "eventi") return `evento ${r.titolo || ""}`.trim();
  return "";
}
export const NOMI_COLLEZIONI = { config: "impostazioni", bookings: "appuntamenti", clients: "clienti", catalog: "catalogo e giacenze", sales: "vendite e movimenti", vouchers: "buoni", eventi: "eventi", fatture: "fatture", acquisti: "fatture dei fornitori", personale: "gestione personale" };

// ---- /api/registro  (titolare: legge; titolare e cassa: aggiungono voci dal gestionale) ----
export async function registroRoute(ctx, sess) {
  const { request, env } = ctx;
  if (sess.ruolo !== "azienda" || !sess.azienda_id) return json({ error: "riservato al titolare del salone" }, 403);
  const aid = sess.azienda_id;
  if (request.method === "GET") {
    const u = new URL(request.url);
    const limite = Math.min(500, Math.max(1, Number(u.searchParams.get("limit")) || 200));
    const tipo = String(u.searchParams.get("tipo") || "").slice(0, 30);
    const da = String(u.searchParams.get("da") || "").slice(0, 10), a = String(u.searchParams.get("a") || "").slice(0, 10);
    try {
      await env.DB.prepare(`DELETE FROM registro WHERE azienda_id = ? AND quando < datetime('now', '-${GIORNI_REGISTRO} days')`).bind(aid).run().catch(() => {});
      let sql = "SELECT * FROM registro WHERE azienda_id = ?"; const b = [aid];
      if (tipo) { sql += " AND tipo = ?"; b.push(tipo); }
      if (/^\d{4}-\d{2}-\d{2}$/.test(da)) { sql += " AND quando >= ?"; b.push(da + " 00:00:00"); }
      if (/^\d{4}-\d{2}-\d{2}$/.test(a)) { sql += " AND quando <= ?"; b.push(a + " 23:59:59"); }
      sql += " ORDER BY quando DESC LIMIT ?"; b.push(limite);
      const res = await env.DB.prepare(sql).bind(...b).all();
      return json({ items: (res.results || []).map((r) => { let d = {}; try { d = JSON.parse(r.dettagli || "{}") || {}; } catch (e) {} return { id: r.id, quando: r.quando, chi: r.chi, origine: r.origine, tipo: r.tipo, testo: r.testo, dettagli: d }; }) }, 200, { "Cache-Control": "no-store" });
    } catch (e) { return json({ items: [], errore: "Il registro non è ancora attivo su questo database (esegui migrazione-registro.sql)." }); }
  }
  if (request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    if (!b.testo) return json({ error: "testo richiesto" }, 400);
    await registra(env, aid, { chi: sess.email, origine: String(b.origine || "gestionale"), tipo: b.tipo, testo: b.testo, dettagli: b.dettagli && typeof b.dettagli === "object" ? b.dettagli : {}, unisci: !!b.unisci });
    return json({ ok: true });
  }
  return json({ error: "metodo non consentito" }, 405);
}
