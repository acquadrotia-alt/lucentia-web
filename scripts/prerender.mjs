// Prerender della landing: dopo "vite build" renderizza Landing.jsx in HTML
// statico e lo inietta dentro <div id="root"> di dist/index.html.
// Così i crawler (Google, Bing, WhatsApp, ecc.) vedono il contenuto reale
// della pagina invece di un div vuoto; al caricamento React sostituisce
// il markup statico con l'app interattiva.
import { readFileSync, writeFileSync } from "node:fs";
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

try {
  const { default: Landing } = await vite.ssrLoadModule("/src/Landing.jsx");
  const html = renderToStaticMarkup(React.createElement(Landing, { onLogin: () => {} }));

  const file = root + "dist/index.html";
  const doc = readFileSync(file, "utf8");
  const marker = '<div id="root"></div>';
  if (!doc.includes(marker)) throw new Error("dist/index.html: marker <div id=\"root\"></div> non trovato");
  writeFileSync(file, doc.replace(marker, `<div id="root">${html}</div>`));
  console.log(`prerender: landing iniettata in dist/index.html (${(html.length / 1024).toFixed(1)} KB)`);
} finally {
  await vite.close();
}
