// ============================================================================
// Sessioni e account: cookie HttpOnly, lettura della sessione, login/logout.
// ============================================================================
import { json, getCookie, randomToken, verifyPassword } from "./util.js";

export const SESSION_DAYS = 30;

export async function getSession(env, request) {
  const sid = getCookie(request, "sid");
  if (!sid) return null;
  const row = await env.DB.prepare(
    "SELECT s.token, s.scadenza, u.id AS uid, u.email, u.ruolo, u.azienda_id, u.nome, u.staff_id, u.reseller_parent FROM sessioni s JOIN utenti u ON u.id = s.utente_id WHERE s.token = ?"
  ).bind(sid).first();
  if (!row) return null;
  if (new Date(row.scadenza).getTime() < Date.now()) { await env.DB.prepare("DELETE FROM sessioni WHERE token = ?").bind(sid).run(); return null; }
  return row;
}
export async function getAzienda(env, id) {
  if (!id) return null;
  return await env.DB.prepare("SELECT * FROM aziende WHERE id = ?").bind(id).first();
}
export function sessionCookie(token) {
  const maxAge = SESSION_DAYS * 24 * 3600;
  return `sid=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export const CLEAR_COOKIE = "sid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";

// ---- /api/login ----
export async function login(ctx) {
  const { request, env } = ctx;
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const u = await env.DB.prepare("SELECT * FROM utenti WHERE email = ?").bind(email).first();
  if (!u || !(await verifyPassword(password, u.password_hash))) return json({ error: "email o password errati" }, 401);
  const token = randomToken();
  const scad = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000).toISOString();
  await env.DB.prepare("INSERT INTO sessioni (token, utente_id, scadenza) VALUES (?, ?, ?)").bind(token, u.id, scad).run();
  return json({ ok: true, ruolo: u.ruolo }, 200, { "Set-Cookie": sessionCookie(token) });
}

// ---- /api/logout ----
export async function logout(ctx) {
  const { request, env } = ctx;
  const sid = getCookie(request, "sid");
  if (sid) await env.DB.prepare("DELETE FROM sessioni WHERE token = ?").bind(sid).run();
  return json({ ok: true }, 200, { "Set-Cookie": CLEAR_COOKIE });
}
