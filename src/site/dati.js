// Contenuti del sito pubblico: funzionalità, approfondimenti, piani e moduli.
// Tenuti qui per non duplicarli tra la home, la pagina Funzionalità e la
// pagina Piani. Attenzione: la pagina Funzionalità non deve contenere prezzi.
import { Calendar, Users, Star, Layers, ShoppingBag, BarChart3, MessageCircle, HeartPulse, KeyRound, Cloud, FileText, ShieldCheck, Gift, CalendarClock, PartyPopper, Globe } from "lucide-react";

// Tutte le funzionalità, senza alcun riferimento a prezzi o piani.
export const FUNZIONALITA = [
  [Calendar, "Agenda intelligente", "Appuntamenti per operatore, slot calcolati in automatico su orari e disponibilità, vista giorno, 3 giorni e settimana."],
  [Users, "Scheda cliente", "Anagrafica completa, storico appuntamenti e servizi, tessera digitale e ricerca rapida."],
  [Star, "Fidelity & premi", "Programma punti automatico dai servizi e dalle vendite, con premi riscattabili dalla scheda cliente."],
  [Layers, "Pacchetti sedute", "Crea e gestisci pacchetti prepagati, scala le sedute usate e tieni traccia dei residui."],
  [Gift, "Buoni regalo", "Emetti buoni a valore o a pacchetto, con codice univoco, saldo residuo e storico degli utilizzi."],
  [ShoppingBag, "Vendite & magazzino", "Cassa integrata, prodotti con formati e giacenze, scontrino di riepilogo e carico magazzino."],
  [BarChart3, "Statistiche", "Andamento incassi, servizi più richiesti e attività dei clienti, sempre aggiornati."],
  [MessageCircle, "Marketing", "Promemoria e messaggi ai clienti via WhatsApp, direttamente dalla loro scheda."],
  [HeartPulse, "Allergeni & patologie", "Schede salute del cliente con avvisi sugli appuntamenti, per lavorare in sicurezza."],
  [KeyRound, "Accessi operatori", "Ogni operatore entra con le proprie credenziali e vede solo la sua agenda."],
  [Cloud, "Cloud & multi-dispositivo", "Dati sincronizzati e al sicuro: lavori da computer, tablet e telefono, ovunque ti trovi."],
  [FileText, "Listino PDF", "Genera un listino servizi elegante e personalizzato col tuo logo e i tuoi colori."],
  [ShieldCheck, "Backup e sicurezza", "Accesso protetto, dati isolati per ogni salone e backup dei tuoi dati."],
  [PartyPopper, "Eventi del salone", "Serate, corsi e open day in agenda: occupano gli operatori e hanno una pagina dedicata da condividere con un link."],
  [CalendarClock, "Mini-sito & prenotazioni online", "Una pagina web della tua attività con prenotazione online, eventi in programma e contenuti personalizzabili."],
];

// Le sei funzionalità mostrate in home come assaggio.
export const FUNZIONALITA_HOME = [0, 1, 2, 5, 6, 14].map((i) => FUNZIONALITA[i]);

// Approfondimenti con screenshot, usati nella pagina Funzionalità.
export const APPROFONDIMENTI = [
  {
    icon: Calendar, kicker: "Agenda & appuntamenti", title: "La giornata del salone, sempre sotto controllo",
    text: "L'agenda di Lucentia mostra gli appuntamenti di ogni operatore con vista giorno, 3 giorni o settimana. Gli orari disponibili vengono calcolati in automatico su turni e disponibilità, e ogni appuntamento tiene traccia di servizio, durata, cliente e incasso.",
    points: ["Vista per operatore o per tutto il salone", "Slot calcolati su orari e disponibilità reali", "Stati chiari: da svolgere, svolto, incassato", "Le prenotazioni online arrivano direttamente in agenda"],
    img: "/anteprime/agenda-desktop.webp", alt: "Agenda del gestionale per parrucchieri Lucentia con appuntamenti della giornata", flip: false,
  },
  {
    icon: Users, kicker: "Clienti, fidelity & pacchetti", title: "Ogni cliente ha la sua storia",
    text: "Anagrafica completa con storico di appuntamenti e acquisti, tessera digitale, punti fedeltà accumulati in automatico da servizi e vendite, pacchetti prepagati con sedute residue e schede salute con allergie e patologie che generano avvisi sugli appuntamenti.",
    points: ["Scheda cliente con storico completo", "Punti fedeltà e premi riscattabili", "Pacchetti prepagati con sedute residue", "Avvisi automatici per allergie e patologie"],
    img: "/anteprime/clienti-desktop.webp", alt: "Scheda clienti del gestionale Lucentia con fidelity e pacchetti", flip: true,
    phone: { img: "/anteprime/clienti-mobile.webp", alt: "Elenco clienti di Lucentia su smartphone" },
  },
  {
    icon: ShoppingBag, kicker: "Cassa, vendite & magazzino", title: "Vendi prodotti e tieni le scorte in ordine",
    text: "La cassa integrata registra vendite di prodotti e servizi, con scontrino di riepilogo e possibilità di collegare ogni vendita al cliente. Il magazzino si aggiorna da solo: carichi i prodotti quando arrivano, le giacenze scalano a ogni vendita.",
    points: ["Cassa rapida con riepilogo di giornata", "Prodotti con formati, prezzi e giacenze", "Carico magazzino e storico movimenti", "Buoni regalo e pacchetti vendibili in cassa"],
    img: "/anteprime/vendite-desktop.webp", alt: "Cassa e magazzino del gestionale per saloni Lucentia", flip: false,
  },
  {
    icon: BarChart3, kicker: "Statistiche & marketing", title: "Decidi con i numeri, fidelizza con i messaggi",
    text: "Incassi di servizi e prodotti, servizi più richiesti, clienti più attivi: le statistiche si aggiornano in tempo reale su 30 giorni, 90 giorni o tutto lo storico. E dalla scheda cliente parti con promemoria e promozioni via WhatsApp, senza esportare nulla.",
    points: ["Andamento incassi servizi e prodotti", "Classifiche di servizi e prodotti più venduti", "Clienti più attivi e frequenza visite", "Messaggi WhatsApp direttamente dalla scheda"],
    img: "/anteprime/statistiche-desktop.webp", alt: "Statistiche del salone nel gestionale Lucentia: incassi e servizi più richiesti", flip: true,
  },
  {
    icon: PartyPopper, kicker: "Eventi & mini-sito", title: "Il tuo salone ha una pagina web, e i tuoi eventi pure",
    text: "Il link di prenotazione è un vero mini-sito della tua attività: copertina, presentazione, orari, social e prenotazione online. E quando organizzi una serata, un corso o un open day, l'evento occupa gli operatori coinvolti in agenda e ha una pagina dedicata con foto e dettagli, pronta da condividere su WhatsApp e Instagram con un link.",
    points: ["Mini-sito con prenotazioni, eventi e contenuti personalizzabili", "Eventi in agenda con operatori occupati automaticamente", "Pagina evento con copertina, dettagli e pulsante WhatsApp", "Tutto col tuo logo e i tuoi colori"],
    img: "/anteprime/minisito-desktop.webp", alt: "Mini-sito pubblico di un salone su Lucentia con calendario eventi", flip: false,
    phone: { img: "/anteprime/evento-mobile.webp", alt: "Pagina pubblica di un evento del salone su smartphone" },
  },
];

// Punti del mini-sito con prenotazione online (descritti senza prezzo).
export const ONLINE_PUNTI = [
  [Globe, "Mini-sito col tuo brand", "Copertina, presentazione, orari, social e contatti: personalizzi tutto dalle impostazioni, senza login per il cliente."],
  [CalendarClock, "Niente vuoti in agenda", "Gli orari si incastrano in automatico dopo gli appuntamenti — oppure a griglia, come preferisci."],
  [PartyPopper, "Eventi in vetrina", "Serate, corsi e open day compaiono da soli sul mini-sito, ognuno con la sua pagina condivisibile."],
  [Users, "Scelta dell'operatore", "Il cliente sceglie chi preferisce, con foto o avatar personalizzati, e gestisce la prenotazione in autonomia."],
];

// ===== Piani =====
// Rispecchiano i preset usati dal rivenditore: Basic (1 operatore, nessun
// modulo opzionale), Smart (3 operatori + fidelity/pacchetti/vendite),
// Pro (operatori illimitati + tutti i moduli).
export const INCLUSO_OVUNQUE = [
  "Agenda e appuntamenti illimitati",
  "Scheda cliente con storico completo",
  "Buoni regalo",
  "Eventi del salone con pagina pubblica",
  "Listino servizi in PDF personalizzato",
  "Cloud, multi-dispositivo e backup",
  "Aggiornamenti e assistenza inclusi",
];

export const PIANI = [
  {
    name: "Basic", price: "9", full: null, act: "Attivazione € 100", highlight: false,
    tagline: "Per chi lavora da solo e vuole solo un'agenda impeccabile.",
    operatori: "1 operatore",
    feats: ["Tutto ciò che è incluso in ogni piano", "1 operatore in agenda"],
    esclusi: ["Moduli opzionali non inclusi", "Add-on prenotazioni online non attivabile"],
    moduli: [],
    tier: "1",
  },
  {
    name: "Smart", price: "12", full: "24", act: "Attivazione € 50", highlight: false,
    tagline: "Per il salone con una piccola squadra che vende anche prodotti.",
    operatori: "Fino a 3 operatori",
    feats: ["Tutto di Basic", "Fino a 3 operatori con accessi dedicati", "Fidelity & premi", "Pacchetti sedute", "Vendite & magazzino"],
    esclusi: ["Statistiche, Marketing e Allergeni non inclusi"],
    moduli: ["fidelity", "pacchetti", "vendite"],
    tier: "3",
  },
  {
    name: "Pro", price: "19,50", full: "39", act: "Attivazione inclusa", highlight: true,
    tagline: "Per il salone strutturato che vuole tutto, senza limiti.",
    operatori: "Operatori illimitati",
    feats: ["Tutto di Smart", "Operatori illimitati", "Statistiche", "Marketing WhatsApp", "Allergeni & patologie"],
    esclusi: [],
    moduli: ["fidelity", "pacchetti", "vendite", "statistiche", "marketing", "allergeni"],
    tier: "inf",
  },
];

// I moduli attivabili, con l'indicazione dei piani che li comprendono.
export const MODULI = [
  { key: "fidelity", icon: Star, nome: "Fidelity & premi", desc: "Punti accumulati in automatico da servizi e vendite, soglie premio configurabili e riscatto dalla scheda cliente." },
  { key: "pacchetti", icon: Layers, nome: "Pacchetti sedute", desc: "Pacchetti prepagati venduti in cassa, con sedute residue scalate a ogni appuntamento e storico degli utilizzi." },
  { key: "vendite", icon: ShoppingBag, nome: "Vendite & magazzino", desc: "Cassa prodotti e servizi, formati e giacenze, carico magazzino, scontrino di riepilogo e vendite collegate al cliente." },
  { key: "statistiche", icon: BarChart3, nome: "Statistiche", desc: "Incassi di servizi e prodotti, classifiche dei più venduti, clienti più attivi, su 30 giorni, 90 giorni o tutto lo storico." },
  { key: "marketing", icon: MessageCircle, nome: "Marketing WhatsApp", desc: "Promemoria appuntamento, auguri e promozioni inviati via WhatsApp direttamente dalla scheda del cliente." },
  { key: "allergeni", icon: HeartPulse, nome: "Allergeni & patologie", desc: "Schede salute con allergie, patologie e note, con avvisi automatici quando apri l'appuntamento del cliente." },
];

// Add-on venduto a parte, non compreso in nessun piano.
export const ADDON_ONLINE = {
  key: "online", icon: CalendarClock, nome: "Mini-sito & prenotazioni online",
  prezzo: "4", periodo: "/mese",
  nota: "Attivabile dai piani Smart e Pro (non disponibile con Basic). IVA esclusa.",
  desc: "Un link da condividere su WhatsApp, Instagram, Google o con un QR in negozio: i clienti prenotano da soli 24 ore su 24, scoprono gli eventi in programma e trovano tutte le info utili.",
};

// Righe della tabella di confronto: [etichetta, Basic, Smart, Pro]
export const CONFRONTO = [
  ["Operatori in agenda", "1", "Fino a 3", "Illimitati"],
  ["Accessi dedicati agli operatori", false, true, true],
  ["Agenda e appuntamenti", true, true, true],
  ["Scheda cliente e storico", true, true, true],
  ["Buoni regalo", true, true, true],
  ["Eventi del salone e pagina pubblica", true, true, true],
  ["Listino servizi in PDF", true, true, true],
  ["Fidelity & premi", false, true, true],
  ["Pacchetti sedute", false, true, true],
  ["Vendite & magazzino", false, true, true],
  ["Statistiche", false, false, true],
  ["Marketing WhatsApp", false, false, true],
  ["Allergeni & patologie", false, false, true],
  ["Add-on prenotazioni online", false, "€ 4/mese", "€ 4/mese"],
];

export const FAQ = [
  ["I prezzi sono IVA inclusa?", "No: tutti i canoni e i costi di attivazione indicati sono IVA esclusa."],
  ["Come funziona l'attivazione?", "È un costo una tantum all'apertura della licenza: € 100 con Basic, € 50 con Smart, inclusa con Pro. Comprende la creazione del salone, la configurazione iniziale e l'affiancamento alla partenza."],
  ["Posso cambiare piano dopo?", "Sì. Il passaggio a un piano superiore è immediato: i moduli e gli operatori aggiuntivi si attivano senza perdere nessun dato."],
  ["Posso attivare un solo modulo in più?", "Sì. Oltre ai tre piani è possibile una configurazione su misura, con i singoli moduli e il numero di operatori che ti servono: contattaci per un preventivo."],
  ["Le prenotazioni online sono comprese?", "No, sono un add-on opzionale a € 4/mese che si aggiunge al canone del piano Smart o Pro. Con Basic non è attivabile."],
  ["Posso provare prima di decidere?", "Sì: la prova gratuita dura 10 giorni con tutti i moduli attivi, senza carta di credito e senza rinnovo automatico."],
];
