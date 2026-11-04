// ============================================================================
// RICEVUTA NON FISCALE per stampanti termiche ESC/POS da 80 mm in rete
// (porta 9100). Modulo puro: costruisce i byte; a mandarli alla stampante ci
// pensa il programma Windows (desktop/main.js, window.lucentiaCassa.escposPrint).
// Si usa per i movimenti «parziali» (acconti, pagamenti in più tranche), che
// non passano dal registratore telematico: la ricevuta lo dice chiaro.
// ============================================================================
const ESC = 0x1b, GS = 0x1d;
const ascii = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/€/g, "EUR").replace(/[^\x20-\x7E]/g, "?");
export const importoRicevuta = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",") + " EUR";

export function ricevutaNonFiscale(d) {
  const L = Math.max(32, Math.min(64, Number(d.larghezza) || 42));
  const out = [];
  const b = (...x) => out.push(...x);
  const txt = (s) => { for (const ch of ascii(s)) out.push(ch.charCodeAt(0)); };
  const riga = (s) => { txt(ascii(s).slice(0, L)); b(0x0a); };
  const duePezzi = (a, c) => { a = ascii(a); c = ascii(c); const sp = L - c.length; riga((a.length > sp - 1 ? a.slice(0, sp - 1) : a).padEnd(sp, " ") + c); };
  const linea = () => riga("-".repeat(L));
  const allinea = (n) => b(ESC, 0x61, n); // 0 sx, 1 centro, 2 dx
  const grassetto = (on) => b(ESC, 0x45, on ? 1 : 0);
  const grande = (on) => b(GS, 0x21, on ? 0x11 : 0x00);
  b(ESC, 0x40); // reset
  b(ESC, 0x74, 19); // tabella caratteri PC858 (se supportata; i testi sono comunque ASCII)
  const t = d.intestazione || {};
  allinea(1);
  if (t.nome) { grande(true); grassetto(true); riga(t.nome); grassetto(false); grande(false); }
  if (t.indirizzo) riga(t.indirizzo);
  if (t.telefono) riga("Tel. " + t.telefono);
  b(0x0a);
  grassetto(true); riga(d.titolo || "RICEVUTA NON FISCALE"); grassetto(false);
  if (d.sottotitolo) riga(d.sottotitolo);
  allinea(0);
  linea();
  if (d.cliente) riga("Cliente: " + d.cliente);
  if (d.data) riga("Data: " + d.data);
  if (d.numero) riga("Rif.: " + d.numero);
  linea();
  (d.righe || []).forEach((r) => {
    const q = Number(r.qta) || 1;
    const tot = importoRicevuta((Number(r.prezzo) || 0) * q);
    duePezzi((q !== 1 ? q + " x " : "") + (r.descrizione || "Articolo"), tot);
    if (q !== 1) riga("   " + q + " x " + importoRicevuta(r.prezzo));
  });
  linea();
  if (d.totaleDovuto != null && d.totaleDovuto !== d.totale) duePezzi("Totale", importoRicevuta(d.totaleDovuto));
  grassetto(true); grande(true); duePezzi(d.etichettaTotale || "TOTALE", importoRicevuta(d.totale)); grande(false); grassetto(false);
  if (d.pagamento) duePezzi("Pagamento", d.pagamento);
  const residuo = d.residuo != null ? Number(d.residuo) : (d.totaleDovuto != null ? Math.round((Number(d.totaleDovuto) - Number(d.totale)) * 100) / 100 : null);
  if (residuo != null && residuo > 0) duePezzi("Resta da pagare", importoRicevuta(residuo));
  if (d.note) { linea(); (String(d.note).match(new RegExp(".{1," + L + "}", "g")) || []).forEach(riga); }
  b(0x0a);
  allinea(1);
  riga("DOCUMENTO NON FISCALE");
  riga("Non valido ai fini fiscali");
  if (d.piede) riga(d.piede);
  b(0x0a, 0x0a, 0x0a, 0x0a);
  b(GS, 0x56, 0x42, 0x00); // taglio parziale
  return Uint8Array.from(out);
}
export const inBase64 = (byte) => { let s = ""; for (let i = 0; i < byte.length; i += 8192) s += String.fromCharCode.apply(null, byte.subarray(i, i + 8192)); return btoa(s); };
