// ============================================================================
// Rotte API SU MISURA di questa installazione.
//
// Il ceppo Lucentia non tocca mai questo file: qui si aggiungono le rotte
// scritte apposta per il cliente (integrazioni, esportazioni, webhook…).
// Vengono provate PRIMA di quelle del core, sotto /api/cliente/*.
//
// Firma: riceve il contesto (request, env), i segmenti del percorso dopo
// "cliente" e la sessione (null se non autenticato). Restituisce una
// Response, oppure null per lasciare che il core risponda "not found".
//
// Esempio:
//   if (segs[0] === "saluto" && request.method === "GET") return json({ ciao: sess ? sess.email : "ospite" });
// ============================================================================
import { json } from "../core/util.js";

export async function rotteCliente(ctx, segs, sess) {
  void ctx; void segs; void sess; void json;
  return null;
}
