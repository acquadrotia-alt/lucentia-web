// Scrive server/core/versione.js con la versione di package.json, così l'API
// la conosce senza importare JSON (il bundler delle Pages Functions non
// accetta `import … with { type: "json" }`). Eseguito da npm run build e npm test.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const { version } = JSON.parse(readFileSync(root + "package.json", "utf8"));
const contenuto = `// File generato da scripts/versione.mjs a partire da package.json: non modificare a mano.\nexport const APP_VERSION = ${JSON.stringify(version)};\n`;
const dest = root + "server/core/versione.js";
let attuale = ""; try { attuale = readFileSync(dest, "utf8"); } catch (e) {}
if (attuale !== contenuto) { writeFileSync(dest, contenuto); console.log("versione:", version); }
