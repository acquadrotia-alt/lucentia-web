// ============================================================================
// Installazione cliente: le informazioni pubbliche del salone (per il sito
// sul suo dominio) e il primo avvio (creazione del salone e del suo accesso).
// ============================================================================
import { json, parseModuli, hashPassword, APP_VERSION } from "../core/util.js";
import { getCollezione } from "../core/disponibilita.js";
import { brandPubblico, payloadPubblico, serviziPrenotabili } from "../core/pubbliche.js";
import { aziendaCliente, statoCliente, descriviEsito, chiaviExtra } from "./licenza.js";

// ---- GET /api/installazione (pubblica) ----
// Sul portale dice solo "hub". Su un'installazione cliente dice in che stato è
// (da configurare, attiva, in manutenzione) e porta il brand del salone, che
// serve anche a disegnare la pagina di manutenzione coi suoi colori.
export async function installazione(ctx, esito) {
  const { env } = ctx;
  const az = await aziendaCliente(env);
  if (!az) return json({ modalita: "cliente", stato: "setup", versione: APP_VERSION });
  const config = (await getCollezione(env, az.id, "config")) || {};
  const stato = statoCliente(esito, az);
  const moduli = parseModuli(az.moduli, chiaviExtra());
  return json({
    modalita: "cliente", stato, versione: APP_VERSION,
    salone: { id: az.id, ...brandPubblico(az, config) },
    online: moduli.includes("online"),
    licenza: descriviEsito(esito),
  });
}

// ---- GET /api/sito (pubblica) ----
// Tutto quello che il sito del salone mostra: brand, servizi, operatori,
// contenuti, eventi, catalogo. A differenza del link di prenotazione non
// richiede il modulo "online": il sito esiste anche senza prenotazioni.
export async function sito(ctx, esito) {
  const { env } = ctx;
  const az = await aziendaCliente(env);
  if (!az) return json({ error: "Installazione da configurare." }, 404);
  if (statoCliente(esito, az) !== "active") return json({ error: "Sito in manutenzione." }, 503);
  const config = (await getCollezione(env, az.id, "config")) || {};
  const { services, abilitatiDi } = serviziPrenotabili(config);
  const moduli = parseModuli(az.moduli, chiaviExtra());
  const payload = await payloadPubblico(env, az.id, az, config, services, abilitatiDi);
  const booking = config.onlineBooking || {};
  // Sul sito il listino mostra TUTTI i servizi con una durata, anche quelli
  // non prenotabili online (es. senza operatore abilitato al momento).
  const listino = (config.services || []).filter((s) => s && s.name).map((s) => ({ id: s.id, name: s.name, price: s.price != null ? s.price : null, durationMin: Number(s.durationMin) || null }));
  return json({ ...payload, salone: { id: az.id, ...payload.salone }, listino, prenotazioniOnline: moduli.includes("online") && !booking.paused, moduli });
}

// ---- POST /api/setup (installazione cliente) ----
// Crea il salone e il suo accesso, una volta sola. L'id del salone è quello
// dell'installazione (INSTALLAZIONE_ID), così la licenza si aggancia da sola.
export async function setupCliente(ctx) {
  const { request, env } = ctx;
  if (!env.SETUP_TOKEN) return json({ error: "SETUP_TOKEN non configurato" }, 500);
  const body = await request.json().catch(() => ({}));
  if (body.token !== env.SETUP_TOKEN) return json({ error: "token non valido" }, 403);
  const esiste = await aziendaCliente(env);
  if (esiste) return json({ error: "salone già configurato" }, 409);
  const denominazione = String(body.denominazione || body.nome || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!denominazione || !email || password.length < 6) return json({ error: "nome del salone, email valida e password (min 6) richieste" }, 400);
  const aid = env.INSTALLAZIONE_ID || crypto.randomUUID();
  const uidv = crypto.randomUUID();
  const ph = await hashPassword(password);
  // Senza portale configurato la licenza è illimitata e con tutti i moduli
  // (moduli NULL = tutto attivo); col portale verrà riscritta alla prima verifica.
  await env.DB.prepare("INSERT INTO aziende (id, denominazione, licenza_scadenza, attiva, note, moduli, demo) VALUES (?, ?, NULL, 1, '', NULL, 0)").bind(aid, denominazione).run();
  await env.DB.prepare("INSERT INTO utenti (id, email, password_hash, ruolo, azienda_id, nome) VALUES (?, ?, ?, 'azienda', ?, ?)").bind(uidv, email, ph, aid, denominazione).run();
  return json({ ok: true, id: aid });
}
