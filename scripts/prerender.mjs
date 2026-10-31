// Prerender del sito pubblico: dopo "vite build" renderizza ogni pagina
// (home, funzionalità, piani) in HTML statico e ne scrive un file dedicato
// dentro dist/, con titolo, description, canonical e Open Graph propri.
// Così i crawler (Google, Bing, WhatsApp, ecc.) vedono il contenuto reale di
// ciascuna pagina invece di un div vuoto; al caricamento React sostituisce il
// markup statico con l'app interattiva.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = fileURLToPath(new URL("..", import.meta.url));

// Su un'installazione cliente il sito è quello del salone, con contenuti che
// stanno nel database e cambiano dal gestionale: niente da prerenderizzare.
// Si preparano solo le pagine "guscio" degli indirizzi fissi, così anche chi
// apre direttamente /gestionale o /prenota trova un file.
if (process.env.MODALITA === "cliente") {
  const template = readFileSync(root + "dist/index.html", "utf8");
  // Via i metadati del portale (descrizione, Open Graph, dati strutturati,
  // canonical): sul dominio del salone parlerebbero di Lucentia.
  const neutro = (titolo) => template
    .replace(/(<title>)[^<]*/, (m, pre) => pre + titolo)
    .replace(/(<meta name="description" content=")[^"]*/, (m, pre) => pre + "")
    .replace(/<link rel="canonical"[^>]*>\n?/, "")
    .replace(/<meta name="robots"[^>]*>\n?/, "")
    .replace(/[ \t]*<meta (?:property="og:|name="twitter:)[^>]*>\n?/g, "")
    .replace(/[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/, "");
  for (const [out, titolo] of [["index.html", "Benvenuti"], ["gestionale/index.html", "Gestionale"], ["prenota/index.html", "Prenota"]]) {
    const file = root + "dist/" + out;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, out === "gestionale/index.html" ? neutro(titolo).replace("<head>", '<head>\n    <meta name="robots" content="noindex" />') : neutro(titolo));
    console.log(`prerender (cliente): dist/${out}`);
  }
  // La sitemap e il robots del portale non c'entrano col dominio del salone.
  rmSync(root + "dist/sitemap.xml", { force: true });
  writeFileSync(root + "dist/robots.txt", "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /gestionale\n");
  process.exit(0);
}

const vite = await createServer({
  root,
  logLevel: "error",
  server: { middlewareMode: true, preTransformRequests: false },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
});

// Sostituisce il valore di un attributo in un tag del <head>.
// Il replacement è passato come funzione per non interpretare "$&" e simili.
function setAttr(doc, pattern, valore) {
  const re = new RegExp(pattern);
  if (!re.test(doc)) throw new Error(`prerender: tag non trovato in index.html → ${pattern}`);
  return doc.replace(re, (m, pre) => pre + valore);
}

try {
  const { default: Site } = await vite.ssrLoadModule("/src/site/Site.jsx");
  const { ROTTE, SITO } = await vite.ssrLoadModule("/src/site/rotte.js");

  const marker = '<div id="root"></div>';
  const template = readFileSync(root + "dist/index.html", "utf8");
  if (!template.includes(marker)) throw new Error('dist/index.html: marker <div id="root"></div> non trovato');

  for (const r of ROTTE) {
    const html = renderToStaticMarkup(React.createElement(Site, { onLogin: () => {}, initialPath: r.path }));
    const url = SITO + (r.path === "/" ? "/" : r.path);

    let doc = template;
    doc = setAttr(doc, "(<title>)[^<]*", r.title);
    doc = setAttr(doc, '(<meta name="description" content=")[^"]*', r.description);
    doc = setAttr(doc, '(<link rel="canonical" href=")[^"]*', url);
    doc = setAttr(doc, '(<meta property="og:url" content=")[^"]*', url);
    doc = setAttr(doc, '(<meta property="og:title" content=")[^"]*', r.ogTitle);
    doc = setAttr(doc, '(<meta property="og:description" content=")[^"]*', r.ogDescription);
    doc = setAttr(doc, '(<meta name="twitter:title" content=")[^"]*', r.ogTitle);
    doc = setAttr(doc, '(<meta name="twitter:description" content=")[^"]*', r.ogDescription);
    doc = doc.replace(marker, () => `<div id="root">${html}</div>`);

    const file = root + "dist/" + r.out;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, doc);
    console.log(`prerender: ${r.path} → dist/${r.out} (${(html.length / 1024).toFixed(1)} KB)`);
  }
} finally {
  await vite.close();
}
