// Contenuti del sito pubblico: funzionalità, approfondimenti, passi,
// licenza, moduli e domande frequenti. Tenuti qui per non duplicarli tra le
// pagine. Attenzione: il sito non riporta prezzi — la licenza è su preventivo.
import { Calendar, Users, Star, Mail, Layers, ShoppingBag, BarChart3, MessageCircle, HeartPulse, KeyRound, Cloud, FileText, ShieldCheck, Gift, CalendarClock, PartyPopper, Globe, Database, Server, Wrench, Palette, Sparkles, Rocket, PenTool, RefreshCw, Headset, ToggleRight, Puzzle, Image, Type, LayoutTemplate, Package, Scissors, Lock, Receipt, Smartphone, UserCog, ScrollText, WifiOff, Truck, UserCheck, LayoutDashboard, Percent, Fingerprint, Bell } from "lucide-react";

// ===== Funzionalità del gestionale, senza alcun riferimento a prezzi =====
export const FUNZIONALITA = [
  [Calendar, "Agenda intelligente", "Operatori, cabine e servizi a fasi: gli orari liberi sono calcolati sulle risorse reali del salone, con vista elenco o a griglia per postazione."],
  [Users, "Scheda cliente", "Anagrafica completa, storico appuntamenti e acquisti, tessera digitale, allergie e note, ricerca rapida."],
  [Receipt, "Cassa fiscale", "Scontrini dal registratore telematico Custom direttamente dalla cassa, con Lucentia Cassa sul PC del negozio: contanti o carta, resi, chiusura Z, ricevute non fiscali per gli acconti."],
  [Smartphone, "L'app per il telefono", "Ogni operatrice apre la sua agenda dal telefono, legge la scheda dell'appuntamento in corso, prenota per una cliente e timbra entrata e uscita."],
  [UserCheck, "Area clienti online", "I clienti si registrano, prenotano, spostano o annullano entro il preavviso, ripetono l'ultimo appuntamento e vedono i loro punti. Password recuperabile da soli."],
  [Mail, "Email automatiche", "Conferma a ogni appuntamento, promemoria alle 19 del giorno prima e un'ora prima, richiesta di recensione dopo la prima visita: dalla casella Gmail del salone."],
  [Star, "Fidelity & premi", "Programma punti automatico dai servizi e dalle vendite, con premi riscattabili dalla scheda cliente."],
  [Layers, "Pacchetti sedute", "Crea e gestisci pacchetti prepagati, scala le sedute usate e tieni traccia dei residui."],
  [Gift, "Buoni regalo", "Emetti buoni a valore o a pacchetto, con codice univoco, saldo residuo e storico degli utilizzi."],
  [ShoppingBag, "Vendite & magazzino", "Prodotti con formati, costi e giacenze, documenti di carico dai fornitori, scorta minima, rettifiche d'inventario e storico dei movimenti."],
  [Truck, "Ordini ai fornitori", "L'ordine nasce da solo dai prodotti sotto scorta, parte via email o in stampa e, all'arrivo della merce, diventa un carico."],
  [FileText, "Fatture elettroniche", "Fatture e note di credito FatturaPA inviate allo SDI tramite Effatta, fatture dei fornitori scaricate da sole e riepilogo IVA del periodo pronto per il commercialista."],
  [LayoutDashboard, "Cruscotto settimanale", "Incasso, appuntamenti, occupazione per operatrice, clienti nuovi e abituali, no-show, confronto con la settimana prima: tutto in una schermata."],
  [Percent, "Costo del venduto", "Ricavo, costo della merce e margine per ogni prodotto, col costo fissato al momento della vendita."],
  [UserCog, "Gestione personale", "Fogli ore mensili, timbrature dal telefono, ferie e assenze pianificate, straordinari, provvigioni e invio al consulente paghe."],
  [MessageCircle, "Marketing WhatsApp", "Promemoria, auguri e promozioni ai clienti via WhatsApp, direttamente dalla loro scheda."],
  [HeartPulse, "Allergeni & patologie", "Schede salute del cliente con avvisi sugli appuntamenti, per lavorare in sicurezza."],
  [PartyPopper, "Eventi del salone", "Serate, corsi e open day in agenda: occupano gli operatori coinvolti e hanno una pagina pubblica sul tuo sito."],
  [Calendar, "Google Calendar", "L'agenda di ogni operatrice sincronizzata a due vie col suo calendario Google, anche dal telefono."],
  [Cloud, "Tutti insieme, senza pestarsi", "Banco, telefono, cassa e area clienti scrivono nello stesso gestionale: ogni modifica si salva da sola e arriva agli altri entro un minuto."],
  [WifiOff, "La cassa anche senza rete", "Se internet manca, Lucentia Cassa si apre dalla copia locale, emette gli scontrini e allinea tutto appena torna la linea."],
  [ScrollText, "Registro delle attività", "Chi ha fatto cosa e quando: accessi, salvataggi, scontrini, fatture, backup, timbrature e modifiche dei clienti, per 180 giorni."],
  [ShieldCheck, "Backup e sicurezza", "Accesso protetto, database dedicato al tuo salone, backup automatico scaricato ogni giorno al primo avvio dal computer."],
  [KeyRound, "Accessi operatori", "Ogni operatore entra con le proprie credenziali e vede solo la sua agenda."],
  [FileText, "Listino PDF", "Genera un listino servizi elegante col tuo logo e i tuoi colori, pronto da stampare o condividere."],
];

// Per chi è pensata ogni parte del gestionale.
export const PER_CHI = [
  { icon: Scissors, titolo: "Per chi lavora in salone", testo: "Tutto ciò che serve dietro la poltrona o in cabina, senza passare dalla reception.", punti: ["L'agenda del giorno sul telefono, con la scheda dell'appuntamento in corso", "Prenotare per una cliente mentre è ancora in negozio", "Timbrare entrata e uscita con un tocco", "Allergie e note della cliente sempre a portata di mano"] },
  { icon: Receipt, titolo: "Per chi sta in cassa", testo: "Scontrini, acconti e vendite senza doppioni, anche se la rete fa i capricci.", punti: ["Scontrino fiscale col registratore Custom, contanti o carta", "L'appuntamento entra nel carrello con un tasto", "Acconti con ricevuta non fiscale sulla stampante da 80 mm", "Resi, annulli e chiusura Z dal gestionale"] },
  { icon: BarChart3, titolo: "Per chi amministra", testo: "I numeri del salone letti in un minuto, i documenti pronti per il commercialista.", punti: ["Cruscotto della settimana e margine sui prodotti", "Fatture elettroniche e riepilogo IVA del periodo", "Fogli ore, ferie e provvigioni del personale", "Registro delle attività e backup automatici"] },
];

// Le tre funzionalità in evidenza nella home.
export const FUNZIONALITA_HOME = [0, 2, 4].map((i) => FUNZIONALITA[i]);

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
    icon: Receipt, kicker: "Cassa fiscale, vendite & magazzino", title: "Dallo scontrino al magazzino, senza doppioni",
    text: "Con Lucentia Cassa sul PC del negozio la vendita emette lo scontrino fiscale dal registratore telematico Custom: contanti o carta, resi, annulli, chiusura Z. L'appuntamento entra nel carrello con un tasto, gli acconti escono con una ricevuta non fiscale sulla stampante da 80 mm. Il magazzino si aggiorna da solo e, quando un prodotto scende sotto scorta, l'ordine al fornitore è già pronto.",
    points: ["Scontrino fiscale dal registratore Custom (contanti o carta)", "Appuntamento in cassa con un tasto, acconti con ricevuta", "Documenti di carico, scorta minima, rettifiche d'inventario", "Ordini ai fornitori proposti dal sotto scorta, via email"],
    img: "/anteprime/cassa-desktop.webp", alt: "La cassa fiscale di Lucentia col registratore telematico: carrello con i tasti Contanti e Carta", flip: false,
  },
  {
    icon: Smartphone, kicker: "L'app per il telefono", title: "Ogni operatrice ha il salone in tasca",
    text: "Su tuodominio.it/utenti ogni operatrice sceglie il suo nome e trova la sua agenda, la scheda dell'appuntamento in corso con fasi, note e allergie della cliente, il nuovo appuntamento con chiunque e la timbratura di entrata e uscita, che finisce dritta nel foglio ore. Quello che fa dal telefono compare al banco entro un minuto.",
    points: ["La mia agenda e la scheda dell'appuntamento in corso", "Nuovo appuntamento per una cliente, con chi si vuole", "Timbra entrata e uscita: va nel foglio ore", "Chiamata e WhatsApp alla cliente da un tocco"],
    img: "/anteprime/studio-desktop.webp", alt: "Vista Studio dell'agenda di Lucentia: una colonna per ogni operatrice e cabina", flip: true,
    phone: { img: "/anteprime/utenti-mobile.webp", alt: "L'app per il telefono delle operatrici di Lucentia" },
  },
  {
    icon: UserCheck, kicker: "Clienti online & email automatiche", title: "I clienti si gestiscono da soli, con garbo",
    text: "Dal link di registrazione il cliente crea il suo account e da Prenota vede appuntamenti, punti e dati. Prenota, sposta o annulla entro il preavviso del salone — anche gli appuntamenti presi al banco — e ripete l'ultimo trattamento con un tocco. Le email partono da sole dalla casella Gmail del salone: conferma, promemoria alle 19 del giorno prima e un'ora prima, richiesta di recensione dopo la prima visita.",
    points: ["Account cliente con password recuperabile da soli", "Sposta e annulla entro il preavviso, «Ripeti l'ultimo»", "Conferme, promemoria e richiesta di recensione automatici", "Punti fedeltà e premi visibili al cliente"],
    img: "/anteprime/clienti-desktop.webp", alt: "Scheda clienti del gestionale Lucentia con fidelity e pacchetti", flip: false,
    phone: { img: "/anteprime/cliente-mobile.webp", alt: "L'area del cliente di Lucentia su smartphone: appuntamenti da spostare o annullare" },
  },
  {
    icon: BarChart3, kicker: "Statistiche & marketing", title: "Decidi con i numeri, fidelizza con i messaggi",
    text: "Il cruscotto della settimana mette in una schermata incasso, appuntamenti, occupazione di ogni operatrice, clienti nuovi e abituali, no-show e il confronto con la settimana prima. Sotto, il costo del venduto col margine di ogni prodotto, gli incassi mese per mese, i servizi e i clienti più attivi. E dalla scheda cliente parti con promemoria e promozioni via WhatsApp.",
    points: ["Cruscotto settimanale con occupazione per operatrice", "Costo del venduto e margine per prodotto", "Incassi, classifiche e clienti più attivi, con CSV", "Messaggi WhatsApp direttamente dalla scheda"],
    img: "/anteprime/statistiche-desktop.webp", alt: "Il cruscotto settimanale di Lucentia: incasso, occupazione per operatrice, clienti nuovi e no-show", flip: true,
  },
  {
    icon: FileText, kicker: "Amministrazione & personale", title: "Fatture, IVA e fogli ore senza fogli volanti",
    text: "Le fatture elettroniche nascono dalla cassa o da un appuntamento e partono allo SDI tramite Effatta; le fatture dei fornitori arrivano da sole e il riepilogo IVA del periodo è pronto per il commercialista. In Gestione personale ci sono i fogli ore con le timbrature dal telefono, ferie e assenze pianificate (che bloccano anche l'agenda), straordinari, provvigioni e l'invio al consulente paghe. Ogni cosa che succede resta nel registro delle attività.",
    points: ["FatturaPA inviate allo SDI, esiti e fatture dei fornitori", "Riepilogo IVA per mese, trimestre o anno, con CSV", "Fogli ore, timbrature, ferie, provvigioni, invio al consulente", "Registro delle attività e backup automatico ogni giorno"],
    img: "/anteprime/personale-desktop.webp", alt: "Fogli ore della Gestione personale di Lucentia con le timbrature dal telefono", flip: false,
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
  [UserCheck, "L'area del cliente", "Con il suo account il cliente prenota, sposta o annulla entro il preavviso, ripete l'ultimo trattamento e vede i suoi punti."],
  [Bell, "Email che partono da sole", "Conferma, promemoria alle 19 del giorno prima e un'ora prima, richiesta di recensione: dalla casella Gmail del salone."],
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
  [Calendar, "Gestionale completo", "Agenda, clienti, cassa, gestione personale e tutti i moduli attivati, da tuodominio.it/gestionale; l'app per il telefono su /utenti; Lucentia Cassa sul PC del negozio."],
  [Database, "Database dedicato e backup", "Un database solo per il tuo salone, backup automatico ogni giorno e registro delle attività."],
  [RefreshCw, "Aggiornamenti", "Tutte le nuove versioni del gestionale, incluse per tutta la durata della licenza."],
  [Headset, "Assistenza", "Supporto diretto per tutta la durata della licenza, dalla partenza ai dubbi quotidiani."],
  [Lock, "Accessi e sicurezza", "Login protetti per il salone e per ogni operatore, dati isolati e cifrati in transito."],
];

export const LICENZA_SINTESI = ["Dominio", "Hosting su Cloudflare", "Sito vetrina", "Gestionale", "Aggiornamenti", "Assistenza"];

// ===== Moduli e integrazioni attivabili =====
export const MODULI = [
  { key: "fidelity", icon: Star, nome: "Fidelity & premi", desc: "Punti accumulati in automatico da servizi e vendite, soglie premio configurabili e riscatto dalla scheda cliente." },
  { key: "pacchetti", icon: Layers, nome: "Pacchetti sedute", desc: "Pacchetti prepagati venduti in cassa, con sedute residue scalate a ogni appuntamento e storico degli utilizzi." },
  { key: "vendite", icon: ShoppingBag, nome: "Cassa, magazzino & ordini", desc: "Cassa prodotti e servizi, formati, costi e giacenze, documenti di carico, scorta minima, ordini ai fornitori e vendite collegate al cliente. Con Lucentia Cassa, gli scontrini fiscali dal registratore Custom." },
  { key: "statistiche", icon: BarChart3, nome: "Statistiche & cruscotto", desc: "Cruscotto della settimana con occupazione per operatrice, clienti nuovi e no-show; costo del venduto e margine; incassi, classifiche e clienti più attivi su 30 giorni, 90 giorni o tutto lo storico." },
  { key: "marketing", icon: MessageCircle, nome: "Marketing WhatsApp", desc: "Promemoria appuntamento, auguri e promozioni inviati via WhatsApp direttamente dalla scheda del cliente." },
  { key: "allergeni", icon: HeartPulse, nome: "Allergeni & patologie", desc: "Schede salute con allergie, patologie e note, con avvisi automatici quando apri l'appuntamento del cliente." },
  { key: "online", icon: CalendarClock, nome: "Prenotazioni online & mini-sito", desc: "I clienti prenotano dal tuo sito 24 ore su 24, scelgono l'operatore e trovano eventi e informazioni. Gli orari si incastrano in automatico in agenda." },
  { key: "fatture", icon: FileText, nome: "Fatture elettroniche", desc: "Fatture e note di credito FatturaPA emesse dal gestionale e inviate allo SDI tramite Effatta, esiti di consegna, fatture dei fornitori scaricate da sole e riepilogo IVA del periodo per il commercialista." },
  { key: "google", icon: Mail, nome: "Gmail & Google Calendar", desc: "Email automatiche dalla tua casella Gmail (conferme, promemoria, richiesta di recensione, benvenuto e recupero password dei clienti, ordini ai fornitori, fogli ore al consulente) e l'agenda sincronizzata a due vie coi calendari Google di ogni operatore." },
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
  ["Possiamo lavorare in più persone insieme?", "Sì. Il banco, i telefoni delle operatrici, la cassa e l'area dei clienti scrivono nello stesso gestionale un record alla volta: ogni modifica arriva agli altri entro un minuto e nessuno sovrascrive il lavoro dell'altro."],
  ["E se manca internet?", "Il gestionale lavora dal browser e ha bisogno della rete, ma i salvataggi non si perdono: restano in coda e partono da soli appena torna la linea. Lucentia Cassa, sul PC del negozio, si apre anche senza rete dalla copia locale e continua a emettere scontrini."],
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
