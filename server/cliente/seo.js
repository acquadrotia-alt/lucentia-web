// ============================================================================
// SEO del sito del salone (installazioni cliente).
//
// Il sito è un'applicazione React che carica i contenuti dal database: un
// motore di ricerca che non esegue JavaScript vedrebbe una pagina vuota. Il
// middleware (functions/_middleware.js) passa di qui per ogni pagina HTML e
// completa il file statico con titolo, descrizione, Open Graph, dati
// strutturati e un riassunto dei contenuti già renderizzato in HTML, che React
// sostituisce all'avvio. Genera anche sitemap.xml e robots.txt.
// ============================================================================
import { PAGINE_SITO, metaPagina, datiStrutturati, gruppiServizi } from "../../src/core/sito/contenuti.js";
import { parseModuli } from "../core/util.js";
import { getCollezione } from "../core/disponibilita.js";
import { aziendaCliente, statoCliente, chiaviExtra } from "./licenza.js";

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const eur = (n) => "€ " + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",").replace(",00", "");
const assoluto = (origin, u) => (!u ? null : /^https?:\/\//.test(u) ? u : u.startsWith("data:") ? null : origin + (u.startsWith("/") ? u : "/" + u));

// Che pagina è: null se non è una pagina del sito (asset, API, gestionale…).
export function paginaDelSito(pathname) {
  const p = String(pathname || "/").replace(/\/+$/, "") || "/";
  if (p.startsWith("/evento/")) return "/eventi";
  return PAGINE_SITO.some((x) => x.path === p) ? p : null;
}

// Raccoglie dal database ciò che serve: brand, sito, listino, staff, eventi.
export async function datiSeo(env, esito) {
  const az = await aziendaCliente(env);
  if (!az) return null;
  const stato = statoCliente(esito, az);
  const config = (await getCollezione(env, az.id, "config")) || {};
  const b = config.branding || {};
  const brand = { nome: az.denominazione, brandName: b.name || az.denominazione, tagline: b.tagline || "", logo: b.logo || null, primary: b.primary || "#b8893b", phone: b.phone || "", email: b.email || "", address: b.address || "" };
  const sito = config.sito || {};
  const listino = (config.services || []).filter((s) => s && s.name).map((s) => ({ id: s.id, name: s.name, categoria: s.categoria || null, price: s.price != null ? s.price : null, durationMin: Number(s.durationMin) || null }));
  const staff = (config.staff || []).map((s) => ({ id: s.id, name: s.name, role: s.role || "" }));
  const oggi = new Date().toISOString().slice(0, 10);
  const eventi = ((await getCollezione(env, az.id, "eventi")) || []).filter((e) => e && !e.cancellato && e.date >= oggi).sort((a, b2) => (a.date < b2.date ? -1 : 1)).slice(0, 6);
  const moduli = parseModuli(az.moduli, chiaviExtra());
  return { stato, brand, sito, listino, staff, eventi, prenota: moduli.includes("online") && !(config.onlineBooking || {}).paused };
}

// Il blocco da inserire nel <head>.
export function headSeo(path, origin, d) {
  const m = metaPagina(path, d);
  const url = origin + (path === "/" ? "/" : path);
  const immagine = assoluto(origin, d.sito.ogImage || d.sito.copertina || d.sito.logoEsteso || d.brand.logo);
  const righe = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    m.noindex ? `<meta name="robots" content="noindex, follow" />` : `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(d.brand.brandName)}" />`,
    `<meta property="og:locale" content="it_IT" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    immagine ? `<meta property="og:image" content="${esc(immagine)}" />` : null,
    `<meta name="twitter:card" content="${immagine ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    d.brand.primary ? `<meta name="theme-color" content="${esc(d.brand.primary)}" />` : null,
    (() => { const f = d.sito.favicon || d.brand.logo; return f && !String(f).startsWith("data:") ? `<link rel="icon" href="${esc(f)}" />\n    <link rel="apple-touch-icon" href="${esc(f)}" />` : null; })(),
    `<link rel="preconnect" href="https://fonts.bunny.net" />`,
    (path === "/" || path === "/servizi" || path === "/contatti") ? `<script type="application/ld+json">${JSON.stringify(datiStrutturati({ ...d, url: origin + "/", immagine })).replace(/</g, "\\u003c")}</script>` : null,
  ].filter(Boolean);
  return righe.join("\n    ");
}

// Un riassunto della pagina in HTML semplice, dentro #root: lo leggono i
// motori di ricerca e chi ha JavaScript disattivato; React lo sostituisce.
export function corpoStatico(path, origin, d) {
  const b = d.brand; const s = d.sito;
  const nav = PAGINE_SITO.filter((p) => ["/", "/servizi", "/team", "/eventi", "/prodotti", "/contatti"].includes(p.path)).filter((p) => p.path !== "/team" || d.staff.length).filter((p) => p.path !== "/eventi" || d.eventi.length).filter((p) => p.path !== "/prodotti" || s.mostraCatalogo === true);
  const testata = `<header><a href="/">${s.logoEsteso && !String(s.logoEsteso).startsWith("data:") ? `<img src="${esc(s.logoEsteso)}" alt="${esc(b.brandName)}" width="220" height="48" />` : esc(b.brandName)}</a><nav>${nav.map((p) => `<a href="${p.path}">${esc(p.nome)}</a>`).join(" · ")}${d.prenota ? ` · <a href="/prenota">Prenota online</a>` : ""}</nav></header>`;
  const piede = `<footer><p>${esc((s.legale && s.legale.ragioneSociale) || b.brandName)}${s.legale && s.legale.piva ? ` · P.IVA ${esc(s.legale.piva)}` : ""}${b.address ? ` · ${esc(b.address)}` : ""}${b.phone ? ` · Tel. ${esc(b.phone)}` : ""}</p><p><a href="/privacy">Privacy</a> · <a href="/cookie">Cookie</a> · <a href="/note-legali">Note legali</a></p></footer>`;
  let main = "";
  const gruppi = gruppiServizi(d.listino);
  const listinoHtml = () => gruppi.map((g) => `${g.nome ? `<h2>${esc(g.nome)}</h2>` : ""}<ul>${g.items.map((x) => `<li>${esc(x.name)}${x.durationMin ? ` — ${x.durationMin} min` : ""}${x.price != null ? ` — ${eur(x.price)}` : ""}</li>`).join("")}</ul>`).join("");
  if (path === "/servizi") main = `<h1>Servizi e listino prezzi di ${esc(b.brandName)}</h1>${listinoHtml()}`;
  else if (path === "/team") main = `<h1>Il team di ${esc(b.brandName)}</h1><ul>${d.staff.map((x) => `<li>${esc(x.name)}${x.role ? ` — ${esc(x.role)}` : ""}</li>`).join("")}</ul>`;
  else if (path === "/eventi") main = `<h1>Eventi di ${esc(b.brandName)}</h1><ul>${d.eventi.map((e) => `<li><a href="/evento/${encodeURIComponent(e.id)}">${esc(e.titolo || "Evento")}</a> — ${esc(e.date)}${e.descrizione ? `: ${esc(e.descrizione)}` : ""}</li>`).join("")}</ul>`;
  else if (path === "/contatti") main = `<h1>Contatti e orari di ${esc(b.brandName)}</h1>${s.orari ? `<h2>Orari</h2><p>${esc(s.orari).replace(/\n/g, "<br />")}</p>` : ""}<h2>Contatti</h2><ul>${b.phone ? `<li>Telefono: ${esc(b.phone)}</li>` : ""}${b.email ? `<li>Email: ${esc(b.email)}</li>` : ""}${b.address ? `<li>Indirizzo: ${esc(b.address)}</li>` : ""}</ul>`;
  else if (path === "/prenota") main = `<h1>Prenota online da ${esc(b.brandName)}</h1><p>Scegli trattamento, operatore e orario: la conferma è immediata.</p>${listinoHtml()}`;
  else if (path === "/privacy" || path === "/cookie" || path === "/note-legali") main = `<h1>${esc(metaPagina(path, d).title)}</h1>`;
  else if (path === "/prodotti") main = `<h1>Prodotti in vendita da ${esc(b.brandName)}</h1>`;
  else main = `<h1>${esc(b.brandName)}</h1>${b.tagline ? `<p>${esc(b.tagline)}</p>` : ""}${s.descrizione ? `<p>${esc(s.descrizione)}</p>` : ""}${(Array.isArray(s.sezioni) ? s.sezioni : []).map((z) => `${z.titolo ? `<h2>${esc(z.titolo)}</h2>` : ""}${z.testo ? `<p>${esc(z.testo).replace(/\n/g, "<br />")}</p>` : ""}`).join("")}${d.listino.length ? `<h2>Servizi</h2>${listinoHtml()}` : ""}${s.orari ? `<h2>Orari</h2><p>${esc(s.orari).replace(/\n/g, "<br />")}</p>` : ""}`;
  return `${testata}<main>${main}</main>${piede}`;
}

// Mette tutto insieme nel file HTML statico del build.
export function arricchisciHtml(html, path, origin, d) {
  let out = html;
  out = out.replace(/<title>[^<]*<\/title>\s*/i, "");
  out = out.replace(/<meta name="description"[^>]*>\s*/i, "");
  out = out.replace(/<meta name="theme-color"[^>]*>\s*/i, "");
  out = out.replace(/<\/head>/i, `    ${headSeo(path, origin, d)}\n  </head>`);
  out = out.replace(/<div id="root"><\/div>/, `<div id="root">${corpoStatico(path, origin, d)}</div>`);
  return out;
}

export function sitemap(origin, d) {
  const pagine = PAGINE_SITO.filter((p) => !["/privacy", "/cookie", "/note-legali"].includes(p.path)).filter((p) => p.path !== "/team" || d.staff.length).filter((p) => p.path !== "/eventi" || d.eventi.length).filter((p) => p.path !== "/prodotti" || d.sito.mostraCatalogo === true).filter((p) => p.path !== "/prenota" || d.prenota);
  const oggi = new Date().toISOString().slice(0, 10);
  const urls = [...pagine.map((p) => ({ loc: origin + (p.path === "/" ? "/" : p.path), pri: p.priorita })), ...d.eventi.map((e) => ({ loc: `${origin}/evento/${encodeURIComponent(e.id)}`, pri: "0.5" }))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc><lastmod>${oggi}</lastmod><priority>${u.pri}</priority></url>`).join("\n")}\n</urlset>\n`;
}

export function robots(origin) {
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /gestionale\n\nSitemap: ${origin}/sitemap.xml\n`;
}
