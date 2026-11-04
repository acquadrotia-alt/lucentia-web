/* Il ponte fra le pagine e il programma, visibile come window.lucentiaCassa. */
"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("lucentiaCassa", {
  programma: true,
  rtRequest: (args) => ipcRenderer.invoke("rt:request", args),
  config: () => ipcRenderer.invoke("cassa:config"),
  apriImpostazioni: () => ipcRenderer.invoke("cassa:apri-impostazioni"),
  // solo la finestra delle impostazioni (il processo principale controlla da dove arriva)
  verificaPassword: (pw) => ipcRenderer.invoke("cassa:verifica-password", pw),
  salva: (nuove, pw) => ipcRenderer.invoke("cassa:salva", nuove, pw),
  versione: () => ipcRenderer.invoke("cassa:versione"),
  onConfigCambiata: (fn) => { ipcRenderer.on("cassa:config-cambiata", () => fn()); },
});
