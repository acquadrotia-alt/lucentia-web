// ============================================================================
// PUNTI DI AGGANCIO del cliente nel gestionale.
//
// Questa cartella (src/cliente/) è la zona di QUESTA installazione: il ceppo
// Lucentia non la tocca mai, quindi gli aggiornamenti del core (git merge
// upstream/main) non entrano mai in conflitto con ciò che sta qui.
// Tutto ciò che è utile a più di un cliente va invece nel core, dietro un
// modulo attivabile.
//
// Ogni voce è facoltativa: lasciare la lista vuota = gestionale standard.
// ============================================================================
import { MODULI_CLIENTE } from "./moduli.js";

export const ESTENSIONI = {
  // Moduli su misura dichiarati al portale (vedi moduli.js). Nel gestionale:
  // `const F = useMods(); if (F.has("chiave")) ...`
  moduli: MODULI_CLIENTE,

  // Viste in più nella barra di navigazione del gestionale.
  // { id, label, icon (lucide), componente, modulo? }
  // Il componente riceve { config, saveConfig, bookings, setBookings, clients,
  // setClients, catalog, setCatalog, sales, setSales, vouchers, setVouchers,
  // eventi, setEventi, azienda }. Con `modulo` la vista compare solo se quel
  // modulo è acceso dal portale.
  viste: [],

  // Sezioni in più nel menù di Impostazioni: { id, label, icon, componente, modulo? }
  // Il componente riceve { config, saveConfig, azienda }.
  impostazioni: [],

  // Blocco in più nella scheda del cliente, sotto i dati anagrafici.
  // Riceve { client, setClient, config }. null = nessuno.
  schedaCliente: null,

  // Blocco in più nel dettaglio di un appuntamento (sotto la timeline).
  // Riceve { booking, config }. null = nessuno.
  dettaglioAppuntamento: null,

  // Sito del salone (solo installazioni cliente). Tutto facoltativo:
  //  - Home: componente che SOSTITUISCE l'intera home del sito; riceve { dati, vai }
  //    dove `dati` è la risposta di GET /api/sito e `vai(path)` naviga.
  //  - sezioni: componenti aggiunti in fondo alla home standard, ognuno riceve { dati }.
  //  - pagine: pagine in più del sito, { path: "/promozioni", label: "Promozioni", componente }
  //    (il componente riceve { dati, vai }); compaiono anche nel menù.
  sito: { Home: null, sezioni: [], pagine: [] },

  // Tema del sito del salone (tutto facoltativo):
  //  primary         colore principale (altrimenti config.branding.primary)
  //  accento         colore per etichette, sfondi tenui e dettagli
  //  sfondoAlternato colore delle sezioni alternate (es. una crema)
  //  fontTitoli      nome di un Google Font per i titoli (es. "Playfair Display")
  //  fontTesto       nome di un Google Font per il testo (es. "Montserrat")
  // Es. { primary: "#4A3A32", accento: "#8FA17A", sfondoAlternato: "#F6EFE7", fontTitoli: "Playfair Display", fontTesto: "Montserrat" }
  tema: {},
};
