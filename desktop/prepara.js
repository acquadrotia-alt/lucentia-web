/* Copia nel programma l'icona del gestionale. Si lancia da solo prima di start e dist. */
const fs = require("fs");
const path = require("path");
fs.mkdirSync(path.join(__dirname, "risorse"), { recursive: true });
fs.copyFileSync(path.join(__dirname, "..", "public", "icon-512.png"), path.join(__dirname, "risorse", "icona.png"));
console.log("Pronto: icona copiata.");
