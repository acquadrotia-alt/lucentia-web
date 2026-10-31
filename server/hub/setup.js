// ============================================================================
// Portale: /api/setup crea l'amministratore, una volta sola, protetto da
// SETUP_TOKEN. (Il ruolo nel database resta "reseller" per compatibilità.)
// ============================================================================
import { json, hashPassword } from "../core/util.js";

export async function setupHub(ctx) {
  const { request, env } = ctx;
  if (!env.SETUP_TOKEN) return json({ error: "SETUP_TOKEN non configurato" }, 500);
  const body = await request.json().catch(() => ({}));
  if (body.token !== env.SETUP_TOKEN) return json({ error: "token non valido" }, 403);
  const existing = await env.DB.prepare("SELECT COUNT(*) AS n FROM utenti WHERE ruolo = 'reseller'").first();
  if (existing && existing.n > 0) return json({ error: "amministratore già esistente" }, 409);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || password.length < 6) return json({ error: "email valida e password (min 6) richieste" }, 400);
  const id = crypto.randomUUID();
  const ph = await hashPassword(password);
  await env.DB.prepare("INSERT INTO utenti (id, email, password_hash, ruolo, azienda_id, nome) VALUES (?, ?, ?, 'reseller', NULL, ?)").bind(id, email, ph, body.nome || "Amministratore").run();
  return json({ ok: true });
}
