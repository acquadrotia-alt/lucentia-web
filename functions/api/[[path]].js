// ============================================================================
// API di Lucentia — punto d'ingresso delle Cloudflare Pages Functions.
// Tutte le rotte /api/* arrivano qui; il codice vero sta in server/:
//   server/router.js     instradamento e modalità (hub / cliente)
//   server/core/*        ciò che è uguale per tutti (sessioni, salone, prenotazioni online)
//   server/hub/*         solo il portale (installazioni, demo, richieste, saloni di prova)
//   server/cliente/*     solo le installazioni cliente (licenza dal portale, sito, rotte su misura)
// I file dentro functions/ diventano rotte: per questo il codice sta fuori.
// ============================================================================
export { onRequest } from "../../server/router.js";
export { computeStarts, valutaSlot, slotPulito, durateOnline, PUNTI } from "../../server/core/disponibilita.js";
