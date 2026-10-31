// Contenuti del sito pubblico: funzionalità, approfondimenti, passi,
// licenza, moduli e domande frequenti. Tenuti qui per non duplicarli tra le
// pagine. Attenzione: il sito non riporta prezzi — la licenza è su preventivo.
import { Calendar, Users, Star, Layers, ShoppingBag, BarChart3, MessageCircle, HeartPulse, KeyRound, Cloud, FileText, ShieldCheck, Gift, CalendarClock, PartyPopper, Globe, Database, Server, Wrench, Palette, Sparkles, Rocket, PenTool, RefreshCw, Headset, ToggleRight, Puzzle, Image, Type, LayoutTemplate, Package, Scissors, Lock } from "lucide-react";

// ===== Funzionalità del gestionale, senza alcun riferimento a prezzi =====
export const FUNZIONALITA = [
  [Calendar, "Agenda intelligente", "Operatori, cabine e servizi a fasi: gli orari liberi sono calcolati sulle risorse reali del salone, con vista elenco o a griglia per postazione."],
  [Users, "Scheda cliente", "Anagrafica completa, storico appuntamenti e acquisti, tessera digitale e ricerca rapida."],
  [Star, "Fidelity & premi", "Programma punti automatico dai servizi e dalle vendite, con premi riscattabili dalla scheda cliente."],
  [Layers, "Pacchetti sedute", "Crea e gestisci pacchetti prepagati, scala le sedute usate e tieni traccia dei residui."],
  [Gift, "Buoni regalo", "Emetti buoni a valore o a pacchetto, con codice univoco, saldo residuo e storico degli utilizzi."],
  [ShoppingBag, "Cassa & magazzino", "Cassa integrata, prodotti con formati e giacenze, scontrino di riepilogo e carico magazzino."],
  [BarChart3, "Statistiche", "Andamento incassi, servizi più richiesti e attività dei clienti, sempre aggiornati."],
  [MessageCircle, "Marketing WhatsApp", "Promemoria, auguri e promozioni ai clienti via WhatsApp, direttamente dalla loro scheda."],
  [HeartPulse, "Allergeni & patologie", "Schede salute del cliente con avvisi sugli appuntamenti, per lavorare in sicurezza."],
  [PartyPopper, "Eventi del salone", "Serate, corsi e open day in agenda: occupano gli operatori coinvolti e hanno una pagina pubblica sul tuo sito."],
  [CalendarClock, "Prenotazioni online", "I clienti prenotano dal tuo sito 24 ore su 24: gli orari si incastrano in automatico e arrivano dritti in agenda."],
  [KeyRound, "Accessi operatori", "Ogni operatore entra con le proprie credenziali e vede solo la sua agenda."],
  [Cloud, "Multi-dispositivo", "Computer alla reception, tablet in cabina, telefono in borsa: lo stesso gestionale, sempre sincronizzato."],
  [FileText, "Listino PDF", "Genera un listino servizi elegante col tuo logo e i tuoi colori, pronto da stampare o condividere."],
  [ShieldCheck, "Backup e sicurezza", "Accesso protetto, database dedicato al tuo salone e copie di sicurezza dei dati."],
];

// Le tre funzionalità in evidenza nella home.
export const FUNZIONALITA_HOME = [0, 1, 5].map((i) => FUNZIONALITA[i]);

// ===== Approfondimenti con screenshot (pagina Funzionalità) =====
export const APPROFONDIMENTI = [
  {
    icon: Calendar, kicker: "Agenda & appuntamenti", title: "La giornata del salone, sempre sotto controllo",
    text: "L'agenda mostra gli appuntamenti di ogni operatore con vista giorno, 3 giorni o settimana, oppure a griglia con una colonna per postazione. Un servizio può essere una sequenza di fasi — applicazione, posa, risciacquo — su operatori e cabine diversi: gli orari liberi tengono conto di tutto, in automatico.",
    points: ["Operatori, cabine e servizi a fasi", "Orari calcolati su turni, chiusure e risorse reali", "Vista elenco o studio a griglia per postazione", "Le prenotazioni online arrivano direttamente in agenda"],
    img: "/anteprime/agenda-desktop.webp", alt: "Agenda del gestionale per parrucchieri Lucentia con appuntamenti della giornata", flip: false,
    phone: { img: "/anteprime/agenda-mobile.webp", alt: "Agenda di Lucentia su smartphone" },
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
    icon: Globe, kicker: "Il tuo sito & gli eventi", title: "Il sito del salone si aggiorna dal gestionale",
    text: "Il tuo sito vetrina vive sul tuo dominio: copertina, presentazione, orari, social, catalogo prodotti e prenotazione online. Quando organizzi una serata, un corso o un open day, l'evento occupa gli operatori coinvolti in agenda e compare da solo sul sito con una pagina dedicata, pronta da condividere su WhatsApp e Instagram.",
    points: ["Sito col tuo dominio, le tue foto e i tuoi colori", "Prenotazione online con scelta dell'operatore", "Eventi in agenda e in vetrina, con pagina propria", "Testi, pagine e contenuti modificabili dal gestionale"],
    img: "/anteprime/minisito-desktop.webp", alt: "Sito pubblico di un salone realizzato con Lucentia con calendario eventi", flip: false,
    phone: { img: "/anteprime/evento-mobile.webp", alt: "Pagina pubblica di un evento del salone su smartphone" },
  },
];

// Punti del sito con prenotazione online (descritti senza prezzo).
export const ONLINE_PUNTI = [
  [Globe, "Il tuo sito, col tuo brand", "Foto, colori, testi e pagine: il sito è tuo e vive sul tuo dominio. Lo aggiorni dal gestionale, senza passare da nessuno."],
  [CalendarClock, "Niente vuoti in agenda", "Gli orari offerti online si incastrano in automatico dopo gli appuntamenti — oppure a griglia, come preferisci."],
  [PartyPopper, "Eventi in vetrina", "Serate, corsi e open day compaiono da soli sul sito, ognuno con la sua pagina condivisibile."],
  [Users, "Scelta dell'operatore", "Il cliente sceglie chi preferisce, con foto o avatar personalizzati, e gestisce la prenotazione in autonomia."],
];

// ===== Hero: i tre punti di fiducia =====
export const FIDUCIA = [
  [Globe, "Dominio e hosting inclusi"],
  [Database, "Database solo tuo"],
  [Headset, "Assistenza diretta"],
];

// ===== Come funziona: i tre passi =====
export const PASSI = [
  {
    icon: Sparkles, titolo: "Provi la demo gratuita", breve: "Dieci giorni con tutti i moduli attivi, senza impegno e senza carta di credito.",
    dettaglio: "Compili il modulo e ricevi subito le credenziali di una demo completa. La usi dal browser, su computer e telefono, per capire come lavorerebbe il tuo salone con Lucentia.",
    punti: ["Attivazione immediata, credenziali via schermo", "Tutti i moduli attivi per 10 giorni", "Nessun rinnovo automatico"],
  },
  {
    icon: PenTool, titolo: "Progettiamo insieme", breve: "Sito e gestionale prendono la forma del tuo salone: servizi, operatori, cabine, foto e colori.",
    dettaglio: "Ci sentiamo, guardiamo come lavorate e configuriamo il gestionale sul vostro metodo: servizi a fasi, operatori, cabine, moduli. Nel frattempo prepariamo il sito con le vostre foto, i vostri testi e i vostri colori.",
    punti: ["Configurazione di servizi, operatori e cabine", "Sito vetrina con foto, testi e pagine tue", "Personalizzazioni e integrazioni su misura"],
  },
  {
    icon: Rocket, titolo: "Vai online col tuo dominio", breve: "Il sito è su tuodominio.it e ogni giorno lavori da tuodominio.it/gestionale.",
    dettaglio: "Registriamo o colleghiamo il tuo dominio, pubblichiamo sito e gestionale su Cloudflare e ti affianchiamo alla partenza. Da quel momento i clienti prenotano dal tuo sito e tu lavori dal tuo gestionale.",
    punti: ["Dominio registrato o collegato da noi", "Pubblicazione su Cloudflare, veloce e sicura", "Affiancamento alla partenza"],
  },
];

// ===== Perché Lucentia: le proposte di valore =====
export const PERCHE = [
  [LayoutTemplate, "Un progetto, non un abbonamento", "Ogni salone ha il suo sito, il suo dominio e il suo gestionale. Niente software condiviso con mille altre attività: un progetto dedicato, costruito sul tuo modo di lavorare."],
  [Database, "I dati sono solo tuoi", "Il tuo salone ha un database tutto suo, isolato dagli altri, con copie di sicurezza. Clienti, appuntamenti e incassi restano a te."],
  [Wrench, "Su misura, anche dopo", "Funzioni e integrazioni aggiuntive si realizzano sul tuo metodo di lavoro. Un modulo in più? Lo accendiamo noi dal portale Lucentia e compare subito nel gestionale."],
  [Headset, "Assistenza vera", "Ti seguiamo noi, dalla configurazione iniziale ai dubbi di ogni giorno. Nessun call center, nessun ticket che si perde."],
];

// ===== Cosa personalizziamo =====
export const PERSONALIZZAZIONI_SITO = [
  [Image, "Foto e copertina", "Le immagini del tuo salone, del team e dei lavori."],
  [Palette, "Colori e logo", "La tua identità visiva su ogni pagina e nel gestionale."],
  [Type, "Testi e pagine", "Presentazione, servizi, team, contatti e le pagine che ti servono."],
  [CalendarClock, "Prenotazione online", "Servizi prenotabili, operatori, tempi e regole di disponibilità."],
  [PartyPopper, "Eventi", "Serate e corsi pubblicati sul sito con una pagina ciascuno."],
  [Package, "Catalogo prodotti", "I prodotti che vendi, in vetrina con formati e descrizioni."],
];

export const PERSONALIZZAZIONI_GESTIONALE = [
  [Scissors, "Servizi a fasi", "Colore, posa, risciacquo: ogni servizio descritto come lo svolgete davvero."],
  [Users, "Operatori e cabine", "Orari, ruoli, postazioni e cabine, anche con più unità dello stesso tipo."],
  [Puzzle, "Moduli attivi", "Solo le funzioni che ti servono, attivabili in qualsiasi momento."],
  [Wrench, "Integrazioni su misura", "Collegamenti e automazioni realizzati sul tuo metodo di lavoro."],
];

// ===== Aggiornamenti e assistenza =====
export const SUPPORTO = [
  [RefreshCw, "Aggiornamenti automatici", "Le nuove versioni del gestionale arrivano da sole, senza installare nulla e senza fermare il lavoro."],
  [ToggleRight, "Moduli attivabili quando vuoi", "Un modulo o un'integrazione in più si accende dal portale Lucentia e compare subito nel tuo gestionale."],
  [Headset, "Assistenza diretta", "Telefono, WhatsApp ed email con chi ha costruito il tuo progetto. Nessun call center."],
];

// ===== Licenza annuale: cosa comprende =====
export const LICENZA_INCLUDE = [
  [Globe, "Il tuo dominio", "Registrazione o collegamento del dominio e rinnovo compresi nella licenza."],
  [Server, "Hosting su Cloudflare", "Sito e gestionale pubblicati sulla rete Cloudflare: veloci, sempre raggiungibili, protetti."],
  [LayoutTemplate, "Sito vetrina personalizzato", "Foto, colori, testi, pagine, eventi e catalogo prodotti, aggiornabili dal gestionale."],
  [Calendar, "Gestionale completo", "Agenda, clienti, cassa e tutti i moduli attivati, raggiungibile da tuodominio.it/gestionale."],
  [Database, "Database dedicato e backup", "Un database solo per il tuo salone, con copie di sicurezza dei dati."],
  [RefreshCw, "Aggiornamenti", "Tutte le nuove versioni del gestionale, incluse per tutta la durata della licenza."],
  [Headset, "Assistenza", "Supporto diretto per tutta la durata della licenza, dalla partenza ai dubbi quotidiani."],
  [Lock, "Accessi e sicurezza", "Login protetti per il salone e per ogni operatore, dati isolati e cifrati in transito."],
];

export const LICENZA_SINTESI = ["Dominio", "Hosting su Cloudflare", "Sito vetrina", "Gestionale", "Aggiornamenti", "Assistenza"];

// ===== Moduli e integrazioni attivabili =====
export const MODULI = [
  { key: "fidelity", icon: Star, nome: "Fidelity & premi", desc: "Punti accumulati in automatico da servizi e vendite, soglie premio configurabili e riscatto dalla scheda cliente." },
  { key: "pacchetti", icon: Layers, nome: "Pacchetti sedute", desc: "Pacchetti prepagati venduti in cassa, con sedute residue scalate a ogni appuntamento e storico degli utilizzi." },
  { key: "vendite", icon: ShoppingBag, nome: "Cassa & magazzino", desc: "Cassa prodotti e servizi, formati e giacenze, carico magazzino, scontrino di riepilogo e vendite collegate al cliente." },
  { key: "statistiche", icon: BarChart3, nome: "Statistiche", desc: "Incassi di servizi e prodotti, classifiche dei più venduti, clienti più attivi, su 30 giorni, 90 giorni o tutto lo storico." },
  { key: "marketing", icon: MessageCircle, nome: "Marketing WhatsApp", desc: "Promemoria appuntamento, auguri e promozioni inviati via WhatsApp direttamente dalla scheda del cliente." },
  { key: "allergeni", icon: HeartPulse, nome: "Allergeni & patologie", desc: "Schede salute con allergie, patologie e note, con avvisi automatici quando apri l'appuntamento del cliente." },
  { key: "online", icon: CalendarClock, nome: "Prenotazioni online & mini-sito", desc: "I clienti prenotano dal tuo sito 24 ore su 24, scelgono l'operatore e trovano eventi e informazioni. Gli orari si incastrano in automatico in agenda." },
  { key: "integrazioni", icon: Wrench, nome: "Integrazioni su misura", desc: "Funzioni, collegamenti e automazioni realizzati sul metodo di lavoro del tuo salone, aggiunti al gestionale quando servono." },
];

// ===== Domande frequenti sulla licenza =====
export const FAQ_LICENZA = [
  ["Quanto costa?", "La licenza è su preventivo: dipende dai moduli attivati e dalle personalizzazioni del sito e del gestionale. Ci racconti come lavora il tuo salone e ti mandiamo un'offerta chiara, con un solo canone all'anno e nessun costo nascosto."],
  ["Cosa include il canone annuale?", "Tutto: il dominio, l'hosting su Cloudflare, il sito vetrina, il gestionale con i moduli scelti, gli aggiornamenti e l'assistenza. Non ci sono voci separate da sommare."],
  ["Posso aggiungere moduli dopo?", "Sì, in qualsiasi momento. Li attiviamo noi dal portale Lucentia e compaiono subito nel tuo gestionale, senza interruzioni e senza perdere dati. Lo stesso vale per le integrazioni su misura."],
  ["I dati sono miei?", "Sì. Il tuo salone ha un database dedicato, isolato dagli altri, con copie di sicurezza. Clienti, appuntamenti, vendite e statistiche sono tuoi e puoi esportarli dal gestionale."],
  ["Cosa succede alla scadenza?", "Il sito e il gestionale vengono sospesi finché non si rinnova: i dati restano al loro posto e tutto riparte appena la licenza viene rinnovata."],
  ["Posso provare prima?", "Sì: la demo gratuita dura 10 giorni con tutti i moduli attivi, senza carta di credito e senza rinnovo automatico. Poi decidi con calma."],
];

// ===== Domande frequenti sul percorso =====
export const FAQ_PROCESSO = [
  ["Quanto tempo serve per andare online?", "Dipende da quanto c'è da personalizzare. Un progetto standard è pronto in poche settimane dal via libera: nel frattempo il gestionale può già essere usato in demo o in configurazione."],
  ["Ho già un dominio: posso usarlo?", "Sì. Colleghiamo il dominio che hai già al sito e al gestionale, oppure ne registriamo uno nuovo a tuo nome. In entrambi i casi il dominio resta tuo."],
  ["Devo installare qualcosa?", "No. Sito e gestionale funzionano dal browser, su computer, tablet e telefono. Basta aprire tuodominio.it/gestionale e accedere con le tue credenziali."],
  ["Posso aggiornare il sito da solo?", "Sì. Testi, orari, foto, eventi, prodotti e servizi prenotabili si modificano dal gestionale e il sito si aggiorna subito. Per cambiamenti strutturali ci pensiamo noi."],
  ["Cosa succede se cambio il modo di lavorare?", "Il gestionale si adatta: nuovi servizi, operatori, cabine e moduli si configurano in qualsiasi momento. Per esigenze particolari realizziamo funzioni e integrazioni su misura."],
  ["Come funziona l'assistenza?", "Direttamente con noi, per telefono, WhatsApp o email, per tutta la durata della licenza. Ti seguiamo dalla configurazione iniziale ai dubbi di ogni giorno."],
];
