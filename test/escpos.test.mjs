// Ricevuta non fiscale ESC/POS: byte di controllo, testi ASCII, importi e taglio.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ricevutaNonFiscale, inBase64 } from "../src/core/cassa/escpos.js";

test("la ricevuta non fiscale ha reset, intestazione centrata, righe allineate, totale e taglio", () => {
  const b = ricevutaNonFiscale({ larghezza: 42, intestazione: { nome: "Estetica Aura", telefono: "0321 1" }, cliente: "Anna Rossi", righe: [{ descrizione: "Pulizia viso anti-età", qta: 1, prezzo: 30 }, { descrizione: "Crema", qta: 2, prezzo: 12.5 }], totale: 20, totaleDovuto: 55, pagamento: "Contanti", piede: "Grazie" });
  const s = Buffer.from(b).toString("latin1");
  assert.ok(s.startsWith("\x1b@"), "reset all'inizio");
  assert.ok(s.includes("\x1ba\x01"), "centrato");
  assert.ok(s.includes("Estetica Aura"));
  assert.ok(s.includes("RICEVUTA NON FISCALE"));
  assert.ok(s.includes("Pulizia viso anti-eta"), "accenti tolti");
  assert.ok(!/[^\x00-\x7f]/.test(s), "solo byte ASCII");
  assert.match(s, /Pulizia viso anti-eta\s+30,00 EUR\n/);
  assert.match(s, /2 x Crema\s+25,00 EUR\n/);
  assert.match(s, /TOTALE\s+20,00 EUR\n/);
  assert.match(s, /Resta da pagare\s+35,00 EUR\n/);
  assert.ok(s.includes("DOCUMENTO NON FISCALE"));
  assert.ok(s.endsWith("\x1dVB\x00"), "taglio parziale alla fine");
  assert.equal(Buffer.from(inBase64(b), "base64").length, b.length);
});
