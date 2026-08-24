// Prerender del sito pubblico: dopo "vite build" renderizza ogni pagina
// (home, funzionalità, piani) in HTML statico e ne scrive un file dedicato
// dentro dist/, con titolo, description, canonical e Open Graph propri.
// Così i crawler (Google, Bing, WhatsApp, ecc.) vedono il contenuto reale di
// ciascuna pagina invece di un div vuoto; al caricamento React sostituisce il
// markup statico con l'app interattiva.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = fileURLToPath(new URL("..", import.meta.url));

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
