// ============================================================================
// API di Lucentia (Cloudflare Pages Functions)
// Gestisce tutte le rotte sotto /api/...
//
// NOTA SU LOGIN/LICENZE: restano nel frontend (codice rivenditore, demo,
// licenze firmate in locale), quindi qui NON c'è autenticazione di sessione.
// Di conseguenza la versione è MONO-SALONE: un database = un salone, con un
// azienda_id fisso. Quando aggiungeremo l'auth server, basterà ricavare
// azienda_id dalla sessione invece di usare la costante qui sotto.
// ============================================================================

const AZIENDA = "default";
const COLLEZIONI = ["config", "bookings", "clients", "catalog", "sales"];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const segs = params.path || []; // es. ["data","clients"]
  const method = request.method;

  // --- Protezione leggera OPZIONALE (NON sostituisce un vero login) ---------
  // Se imposti la variabile d'ambiente API_SECRET su Cloudflare, l'API
  // richiederà l'header "x-api-key" uguale a quel valore (tranne /api/health).
  // Per attivarla devi anche far inviare l'header dal frontend (vedi nota).
  if (env.API_SECRET && segs[0] !== "health") {
    const key = request.headers.get("x-api-key");
    if (key !== env.API_SECRET) return json({ error: "unauthorized" }, 401);
  }

  // --- /api/health : verifica che API e database rispondano -----------------
  if (segs[0] === "health") {
    try {
      await env.DB.prepare("SELECT 1").first();
      return json({ ok: true, time: new Date().toISOString() });
    } catch (e) {
      return json({ ok: false, error: String(e) }, 500);
    }
  }

  // --- /api/data/:collezione : legge/salva una collezione -------------------
  if (segs[0] === "data" && segs[1]) {
    const coll = segs[1];
    if (!COLLEZIONI.includes(coll)) return json({ error: "collezione sconosciuta" }, 400);
    const id = `${AZIENDA}:${coll}`;

    if (method === "GET") {
      const row = await env.DB
        .prepare("SELECT dati FROM dati_app WHERE azienda_id = ? AND collezione = ?")
        .bind(AZIENDA, coll)
        .first();
      return json({ value: row ? JSON.parse(row.dati) : null });
    }

    if (method === "PUT") {
      const body = await request.json().catch(() => ({}));
      const value = body && "value" in body ? body.value : null;
      const dati = JSON.stringify(value);
      await env.DB
        .prepare(
          "INSERT INTO dati_app (id, azienda_id, collezione, dati, aggiornato_il) VALUES (?, ?, ?, ?, datetime('now')) " +
            "ON CONFLICT(id) DO UPDATE SET dati = excluded.dati, aggiornato_il = datetime('now')"
        )
        .bind(id, AZIENDA, coll, dati)
        .run();
      return json({ ok: true });
    }

    return json({ error: "metodo non consentito" }, 405);
  }

  return json({ error: "not found" }, 404);
}
