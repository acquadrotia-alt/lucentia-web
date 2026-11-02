// ============================================================================
// Archivio riservato delle integrazioni (tabella `integrazioni`): chiavi per
// salone che NON passano mai dall'API dei dati (/api/data), perché contengono
// segreti — il client secret di Google, il refresh token, il codice del feed
// iCalendar. Il browser vede solo ciò che le rotte decidono di restituire.
// ============================================================================

export async function leggiInt(env, aziendaId, chiave) {
  try {
    const r = await env.DB.prepare("SELECT dati FROM integrazioni WHERE azienda_id = ? AND chiave = ?").bind(aziendaId, chiave).first();
    return r && r.dati ? JSON.parse(r.dati) : null;
  } catch (e) { return null; }
}
export async function scriviInt(env, aziendaId, chiave, valore) {
  await env.DB.prepare("INSERT INTO integrazioni (azienda_id, chiave, dati, aggiornato_il) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(azienda_id, chiave) DO UPDATE SET dati = excluded.dati, aggiornato_il = datetime('now')")
    .bind(aziendaId, chiave, JSON.stringify(valore)).run();
}
export async function cancellaInt(env, aziendaId, chiave) {
  await env.DB.prepare("DELETE FROM integrazioni WHERE azienda_id = ? AND chiave = ?").bind(aziendaId, chiave).run();
}
// Valore con scadenza (es. lo `state` dell'OAuth, il token di accesso): si
// legge solo se non è scaduto.
export async function leggiIntValido(env, aziendaId, chiave) {
  const v = await leggiInt(env, aziendaId, chiave);
  if (!v) return null;
  if (v.scade && Number(v.scade) < Date.now()) { await cancellaInt(env, aziendaId, chiave).catch(() => {}); return null; }
  return v;
}
