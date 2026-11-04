import { todayStr } from "./comuni.jsx";

// La licenza NON viene inclusa nel backup: il cliente non può estendersela reimportando un file.
export function exportBackup(config, bookings, clients, catalog, sales, eventi, fatture, acquisti, suffisso) {
  const data = backupPayload(config, bookings, clients, catalog, sales, eventi, fatture, acquisti);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `backup-salone-${todayStr()}${suffisso ? "-" + suffisso : ""}.json`; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export const BACKUP_KEY = "salon-backup-meta-v1";
export function backupPayload(config, bookings, clients, catalog, sales, eventi, fatture, acquisti) { return { config, bookings, clients, catalog, sales, eventi, fatture: fatture || [], acquisti: acquisti || [], exportedAt: new Date().toISOString(), version: 5 }; }
export function openBackupDB() { return new Promise((res, rej) => { const r = indexedDB.open("lucentia-backup", 1); r.onupgradeneeded = () => { r.result.createObjectStore("h"); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
export async function saveDirHandle(handle) { const db = await openBackupDB(); await new Promise((res, rej) => { const tx = db.transaction("h", "readwrite"); tx.objectStore("h").put(handle, "dir"); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }
export async function loadDirHandle() { try { const db = await openBackupDB(); return await new Promise((res) => { const tx = db.transaction("h", "readonly"); const rq = tx.objectStore("h").get("dir"); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); }); } catch (e) { return null; } }
export async function clearDirHandle() { try { const db = await openBackupDB(); await new Promise((res) => { const tx = db.transaction("h", "readwrite"); tx.objectStore("h").delete("dir"); tx.oncomplete = () => res(); tx.onerror = () => res(); }); } catch (e) {} }
export async function writeBackupToDir(handle, data) {
  if (handle.queryPermission) { let p = await handle.queryPermission({ mode: "readwrite" }); if (p !== "granted") { p = await handle.requestPermission({ mode: "readwrite" }); if (p !== "granted") throw new Error("perm"); } }
  const fh = await handle.getFileHandle(`lucentia-backup-${todayStr()}.json`, { create: true });
  const w = await fh.createWritable(); await w.write(JSON.stringify(data, null, 2)); await w.close();
}

// Backup automatico scaricato al primo avvio del giorno dal computer (versione
// web): un file JSON completo nella cartella Download, una volta al giorno per
// ogni PC. Sul telefono e nel programma della cassa non parte.
export const BACKUP_AUTO_KEY = "lc-backup-auto-v1";
export function computerDaBackup() {
  if (typeof window === "undefined") return false;
  if (window.lucentiaCassa) return false;
  try { return window.innerWidth >= 900 && !(window.matchMedia && window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 1100); } catch (e) { return window.innerWidth >= 900; }
}
