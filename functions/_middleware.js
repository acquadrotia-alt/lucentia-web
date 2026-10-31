// ============================================================================
// Middleware delle Pages Functions: passa su OGNI richiesta.
// Sul portale non fa nulla. Su un'installazione cliente completa le pagine
// HTML del sito del salone con i metadati per i motori di ricerca e un
// riassunto dei contenuti, e genera sitemap.xml e robots.txt dal database
// (vedi server/cliente/seo.js).
// ============================================================================
import { modalita } from "../server/core/util.js";
import { aggiornaLicenza } from "../server/cliente/licenza.js";
import { paginaDelSito, datiSeo, arricchisciHtml, sitemap, robots } from "../server/cliente/seo.js";

export async function onRequest(context) {
  const { request, env, next } = context;
  if (modalita(env) !== "cliente" || request.method !== "GET") return next();
  const url = new URL(request.url);
  const origin = url.origin;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/api") || path.startsWith("/gestionale") || /\.[a-z0-9]{2,5}$/i.test(path) && path !== "/sitemap.xml" && path !== "/robots.txt") return next();

  try {
    if (path === "/robots.txt") return new Response(robots(origin), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
    const pagina = paginaDelSito(path);
    if (!pagina && path !== "/sitemap.xml") return next();
    const esito = await aggiornaLicenza(env, request);
    const d = await datiSeo(env, esito);
    if (!d || d.stato !== "active") {
      // In manutenzione (o prima del setup) niente da indicizzare.
      if (path === "/sitemap.xml") return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n`, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
      const res = await next();
      return nuovaRisposta(res, (html) => html.replace(/<\/head>/i, `<meta name="robots" content="noindex" />\n  </head>`), { "Cache-Control": "no-store" });
    }
    if (path === "/sitemap.xml") return new Response(sitemap(origin, d), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
    const res = await next();
    const tipo = res.headers.get("Content-Type") || "";
    if (!tipo.includes("text/html")) return res;
    return nuovaRisposta(res, (html) => arricchisciHtml(html, pagina, origin, d), { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" });
  } catch (e) {
    // Un problema nel SEO non deve mai spegnere il sito: si serve la pagina così com'è.
    console.error("seo", String((e && e.stack) || e));
    return next();
  }
}

async function nuovaRisposta(res, trasforma, headers) {
  const html = await res.text();
  const h = new Headers(res.headers);
  h.set("Content-Type", "text/html; charset=utf-8");
  h.delete("Content-Length");
  for (const [k, v] of Object.entries(headers || {})) h.set(k, v);
  return new Response(trasforma(html), { status: res.status, headers: h });
}
