// ============================================================================
// Moduli e integrazioni SU MISURA di questa installazione.
//
// Il core conosce già i suoi moduli (fidelity, vendite, statistiche,
// marketing, allergeni, pacchetti, online, op3, opinf). Qui si dichiarano
// quelli scritti apposta per questo cliente: ogni voce diventa un
// interruttore nel portale Lucentia, e il gestionale la legge con
// `useMods().has("chiave")`.
//
// Questo file è importato sia dal gestionale (browser) sia dall'API (server),
// quindi deve restare JavaScript puro, senza JSX e senza dipendenze.
//
// Esempio:
//   { key: "whatsapp-promemoria", label: "Promemoria WhatsApp automatici",
//     desc: "Invia un promemoria il giorno prima dell'appuntamento." }
// ============================================================================
export const MODULI_CLIENTE = [];
