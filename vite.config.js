import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

// La versione mostrata nell'app proviene da package.json: per aggiornarla
// basta cambiare il campo "version" lì e fare un nuovo deploy.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

export default defineConfig({
  plugins: [react()],
  base: "/",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // "hub" (portale Lucentia) oppure "cliente" (sito+gestionale di un salone).
    // È la stessa variabile MODALITA che legge l'API; qui serve solo come
    // ipotesi iniziale, il server resta la fonte di verità.
    __MODALITA__: JSON.stringify(process.env.MODALITA === "cliente" ? "cliente" : "hub"),
  },
});
