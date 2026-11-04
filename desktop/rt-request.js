/* Invio di un comando XML al registratore Custom, dal PC della cassa.
   Il certificato del registratore è autofirmato: si accetta, ma SOLO per indirizzi della rete
   locale (10.x, 172.16–31.x, 192.168.x, 169.254.x, 127.x, nomi senza punto, .local, .lan) e
   solo verso percorsi /xml/… . Qualsiasi altro indirizzo viene rifiutato. */
"use strict";
const http = require("http");
const https = require("https");

function isLocalHost(hostname) {
  const h = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "::1" || h.endsWith(".local") || h.endsWith(".lan") || (!h.includes(".") && !h.includes(":"))) return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const a = Number(m[1]), b = Number(m[2]);
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
}

function rtRequest({ url, body, user, password, timeout }) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch (e) { reject(new Error("indirizzo non valido")); return; }
    if (!/^https?:$/.test(u.protocol)) { reject(new Error("protocollo non valido")); return; }
    if (!isLocalHost(u.hostname)) { reject(new Error("il registratore deve trovarsi sulla rete locale")); return; }
    if (!/\/xml\/printer\.htm$/i.test(u.pathname) && !/^\/xml\//i.test(u.pathname)) { reject(new Error("percorso non ammesso")); return; }
    const data = Buffer.from(String(body || ""), "utf8");
    const headers = { "Content-Type": "text/plain;charset=UTF-8", "Content-Length": data.length };
    if (user || password) headers.Authorization = "Basic " + Buffer.from((user || "") + ":" + (password || ""), "utf8").toString("base64");
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(u, {
      method: "POST", headers,
      timeout: Math.min(Math.max(Number(timeout) || 20000, 1000), 120000),
      rejectUnauthorized: false, // certificato autofirmato del registratore (solo rete locale, vedi sopra)
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("timeout", () => req.destroy(new Error("timeout: il registratore non ha risposto")));
    req.on("error", (err) => reject(new Error(err.message)));
    req.end(data);
  });
}

module.exports = { rtRequest, isLocalHost };
