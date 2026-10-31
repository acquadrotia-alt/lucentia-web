// ============================================================================
// API di Lucentia (Cloudflare Pages Functions) — instradamento.
//
// Lo stesso codice gira in due modalità (variabile d'ambiente MODALITA):
// - "hub" (predefinita): il portale lucentia-app.com — sito vetrina, demo
//   pubblica, amministrazione delle installazioni e dei saloni di prova.
// - "cliente": il sito + gestionale di UN salone sul suo dominio, con database
//   proprio. La licenza e i moduli arrivano dal portale (server/cliente/licenza.js).
//
// Regole che non cambiano: login email+password (PBKDF2), sessione in cookie
// HttpOnly, ogni dato di salone filtrato per azienda_id lato server,
// operatori in sola lettura sulla propria agenda.
// ============================================================================
import { json, licStatus, isAdmin, modalita, APP_VERSION } from "./core/util.js";
import { getSession, login, logout } from "./core/sessione.js";
import { prenota, evento } from "./core/pubbliche.js";
import { onlineBookings, me, verifyPasswordRoute, operatori, dati } from "./core/salone.js";
import { setupHub } from "./hub/setup.js";
import { richiesta, demo, richieste } from "./hub/richieste.js";
import { aziende } from "./hub/saloni.js";
import { installazioni, verificaLicenza } from "./hub/installazioni.js";
import { aggiornaLicenza, statoCliente, forzaVerifica, descriviEsito, chiaviExtra, configurata } from "./cliente/licenza.js";
import { installazione, sito, setupCliente } from "./cliente/installazione.js";
import { rotteCliente } from "./cliente/rotte.js";

// Un errore imprevisto (una colonna che manca, una query storta) non deve
// arrivare al browser come crash del worker: la pagina pubblica lo leggerebbe
// come "nessuna disponibilità" senza dire perché. Meglio un JSON con il
// dettaglio, che finisce anche nei log di Cloudflare.
export async function onRequest(context) {
  try { return await gestisci(context); }
  catch (e) {
    console.error("api", String((e && e.stack) || e));
    return json({ error: "Errore interno del server.", dettaglio: String((e && e.message) || e) }, 500);
  }
}

async function gestisci(context) {
  const { request, env, params } = context;
  const segs = params.path || [];
  const method = request.method;
  const cliente = modalita(env) === "cliente";

  // ---- /api/health ----
  if (segs[0] === "health") {
    try { await env.DB.prepare("SELECT 1").first(); return json({ ok: true, modalita: modalita(env), versione: APP_VERSION, time: new Date().toISOString() }); }
    catch (e) { return json({ ok: false, error: String(e) }, 500); }
  }

  // Su un'installazione cliente la licenza si riallinea col portale prima di
  // rispondere (al massimo ogni qualche ora: di solito è una lettura in memoria).
  const esito = cliente ? await aggiornaLicenza(env, request) : null;
  // Come si giudica la licenza di un salone in questa modalità.
  const statoDi = async (az) => (cliente ? statoCliente(esito, az) : licStatus(az));

  // ---- /api/installazione (pubblica: in che modalità siamo, e il brand del salone) ----
  if (segs[0] === "installazione" && method === "GET") {
    if (!cliente) return json({ modalita: "hub", versione: APP_VERSION });
    return await installazione(context, esito);
  }

  // ---- /api/setup (una volta sola, protetto da SETUP_TOKEN) ----
  if (segs[0] === "setup" && method === "POST") return cliente ? await setupCliente(context) : await setupHub(context);

  if (segs[0] === "login" && method === "POST") return await login(context);
  if (segs[0] === "logout" && method === "POST") return await logout(context);

  if (cliente) {
    // ---- /api/sito (pubblica: i contenuti del sito del salone) ----
    if (segs[0] === "sito" && method === "GET") return await sito(context, esito);
  } else {
    // ---- rotte pubbliche del portale ----
    if (segs[0] === "richiesta" && method === "POST") return await richiesta(context);
    if (segs[0] === "demo" && method === "POST") return await demo(context);
    if (segs[0] === "licenze" && segs[1] === "verifica") return await verificaLicenza(context);
  }

  // ---- /api/prenota/:aid  e  /api/evento/:aid/:eid (pubbliche) ----
  if (segs[0] === "prenota" && segs[1]) return await prenota(context, segs, statoDi);
  if (segs[0] === "evento" && segs[1] && segs[2] && method === "GET") return await evento(context, segs, statoDi);

  // ---- da qui in poi serve la sessione (tranne le rotte su misura, che decidono da sé) ----
  const sess = await getSession(env, request);
  if (cliente && segs[0] === "cliente") {
    const r = await rotteCliente(context, segs.slice(1), sess);
    if (r) return r;
    return json({ error: "not found" }, 404);
  }
  if (!sess) return json({ error: "non autenticato" }, 401);

  if (segs[0] === "online-bookings") return await onlineBookings(context, segs, sess);
  if (segs[0] === "me") {
    const extra = cliente ? { moduliExtra: chiaviExtra(), me: { installazione: { licenza: descriviEsito(esito), portale: configurata(env), versione: APP_VERSION } } } : { me: { versione: APP_VERSION } };
    return await me(context, sess, statoDi, extra);
  }
  if (segs[0] === "verify-password" && method === "POST") return await verifyPasswordRoute(context, sess);

  if (cliente) {
    // ---- /api/licenza/verifica-ora (il titolare chiede di ricontrollare col portale) ----
    if (segs[0] === "licenza" && segs[1] === "verifica-ora" && method === "POST") {
      if (sess.ruolo !== "azienda") return json({ error: "riservato al titolare" }, 403);
      const nuovo = await forzaVerifica(env, request);
      return json({ ok: true, licenza: descriviEsito(nuovo) });
    }
  } else {
    // ---- amministrazione del portale ----
    if (segs[0] === "installazioni") return await installazioni(context, segs, sess);
    if (segs[0] === "aziende") return await aziende(context, segs, sess);
    if (segs[0] === "richieste") return await richieste(context, segs, sess);
    void isAdmin;
  }

  if (segs[0] === "operatori") return await operatori(context, segs, sess);
  if (segs[0] === "data" && segs[1]) return await dati(context, segs, sess, statoDi);

  return json({ error: "not found" }, 404);
}
