/* ============================================================================
   LUCENTIA CASSA — il programma Windows per la cassa con il registratore
   telematico Custom (Electron).

   Apre il gestionale del salone (l'indirizzo è nelle impostazioni) in una
   finestra sua, mostrando solo l'area Banco, e fa da ponte verso il
   registratore: la pagina chiama window.lucentiaCassa.rtRequest (preload.js)
   e la richiesta parte da qui, dal processo principale, senza i limiti del
   browser (certificato autofirmato, CORS, contenuto misto). Il certificato
   si accetta solo per indirizzi della rete locale (rt-request.js) e le
   richieste al registratore si accettano solo dalla pagina del gestionale.

   Le impostazioni (indirizzo del gestionale, IP e matricola del registratore,
   reparti, pagamenti…) stanno in un file nella cartella dati dell'utente e si
   modificano dalla finestra «Impostazioni», protetta dalla password del tecnico.
   ============================================================================ */
"use strict";
const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { rtRequest } = require("./rt-request");

const PASSWORD_TECNICO = "0724";
const FILE_IMPOSTAZIONI = () => path.join(app.getPath("userData"), "impostazioni.json");
const PREDEFINITE = {
  url: "", host: "", matricola: "", scheme: "https", port: "80", path: "/xml/printer.htm", timeout: 20, simula: true,
  aliquotaPredefinita: "22", aliquotaServizi: "22",
  reparti: [{ numero: "1", nome: "IVA 22%", aliquota: "22" }], categorieReparto: {},
  pagamenti: { contanti: { tipo: "1", nome: "CONTANTI" }, elettronico: { tipo: "2", nome: "ELETTRONICO" } },
  messaggio: "Grazie e arrivederci", cassetto: true, rigaReso: "printRecItem",
};
function leggiImpostazioni() {
  try { return { ...PREDEFINITE, ...JSON.parse(fs.readFileSync(FILE_IMPOSTAZIONI(), "utf8")) }; } catch (e) { return { ...PREDEFINITE }; }
}
function scriviImpostazioni(n) {
  const cur = leggiImpostazioni();
  const nuove = { ...cur, ...(n || {}) };
  fs.mkdirSync(path.dirname(FILE_IMPOSTAZIONI()), { recursive: true });
  fs.writeFileSync(FILE_IMPOSTAZIONI(), JSON.stringify(nuove, null, 2), "utf8");
  return nuove;
}
const origineGestionale = () => { try { return new URL(leggiImpostazioni().url).origin; } catch (e) { return ""; } };
const daGestionale = (url) => { const o = origineGestionale(); try { return !!o && new URL(url).origin === o; } catch (e) { return false; } };
const daImpostazioni = (url) => String(url || "").startsWith("file://") && /impostazioni\.html/.test(url);

let principale = null, impostazioni = null;

// ---- il ponte verso il registratore, solo dalle nostre pagine ----
ipcMain.handle("rt:request", async (evento, args) => {
  const da = (evento.senderFrame && evento.senderFrame.url) || "";
  if (!daGestionale(da) && !daImpostazioni(da)) throw new Error("richiesta non ammessa da " + da);
  return rtRequest(args || {});
});
// le impostazioni: il gestionale le legge, la finestra del tecnico le scrive
ipcMain.handle("cassa:config", () => leggiImpostazioni());
ipcMain.handle("cassa:apri-impostazioni", () => { apriImpostazioni(); return true; });
ipcMain.handle("cassa:verifica-password", (e, pw) => String(pw || "") === PASSWORD_TECNICO);
ipcMain.handle("cassa:salva", (evento, nuove, pw) => {
  const da = (evento.senderFrame && evento.senderFrame.url) || "";
  if (!daImpostazioni(da) || String(pw || "") !== PASSWORD_TECNICO) throw new Error("non autorizzato");
  const prima = leggiImpostazioni();
  const dopo = scriviImpostazioni(nuove);
  if (prima.url !== dopo.url && principale && !principale.isDestroyed()) apriGestionale();
  else if (principale && !principale.isDestroyed()) principale.webContents.send("cassa:config-cambiata");
  return dopo;
});
ipcMain.handle("cassa:versione", () => app.getVersion());

function apriGestionale() {
  const cfg = leggiImpostazioni();
  if (!cfg.url) { principale.loadFile(path.join(__dirname, "benvenuto.html")); return; }
  principale.loadURL(cfg.url);
}

function apri() {
  principale = new BrowserWindow({
    width: 1366, height: 860, minWidth: 1024, minHeight: 700, show: false,
    title: "Lucentia Cassa", autoHideMenuBar: true, backgroundColor: "#fafaf9",
    icon: path.join(__dirname, "risorse", "icona.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  principale.once("ready-to-show", () => { principale.maximize(); principale.show(); });
  // le finestre di stampa del gestionale si aprono dentro il programma; il resto nel browser
  principale.webContents.setWindowOpenHandler(({ url }) => {
    if (!url || url === "about:blank" || daGestionale(url)) return { action: "allow", overrideBrowserWindowOptions: { autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } } };
    shell.openExternal(url); return { action: "deny" };
  });
  principale.webContents.on("will-navigate", (e, url) => { if (!daGestionale(url) && !url.startsWith("file://")) { e.preventDefault(); shell.openExternal(url); } });
  principale.on("closed", () => { principale = null; });
  apriGestionale();
}

function apriImpostazioni() {
  if (impostazioni && !impostazioni.isDestroyed()) { impostazioni.focus(); return; }
  impostazioni = new BrowserWindow({
    width: 760, height: 820, minWidth: 640, minHeight: 600, title: "Impostazioni della cassa", autoHideMenuBar: true, backgroundColor: "#fafaf9", parent: principale || undefined,
    icon: path.join(__dirname, "risorse", "icona.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  impostazioni.loadFile(path.join(__dirname, "impostazioni.html"));
  impostazioni.on("closed", () => { impostazioni = null; });
}

Menu.setApplicationMenu(Menu.buildFromTemplate([
  { label: "Cassa", submenu: [
    { label: "Impostazioni della cassa…", accelerator: "CmdOrCtrl+,", click: apriImpostazioni },
    { type: "separator" },
    { role: "reload", label: "Ricarica" }, { role: "togglefullscreen", label: "Schermo intero" },
    { type: "separator" }, { role: "quit", label: "Esci" },
  ] },
  { label: "Aiuto", submenu: [{ label: "Informazioni", click: () => dialog.showMessageBox({ type: "info", title: "Lucentia Cassa", message: "Lucentia Cassa " + app.getVersion(), detail: "Gestionale Lucentia con il registratore telematico Custom (protocollo XML 1.30).\nImpostazioni: menù Cassa → Impostazioni della cassa (password del tecnico)." }) }] },
]));

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => { if (principale) { if (principale.isMinimized()) principale.restore(); principale.focus(); } });
  app.whenReady().then(apri);
  app.on("window-all-closed", () => app.quit());
}
