# Lucentia Web — login email/password + gestione licenze

Ora l'accesso è con EMAIL e PASSWORD. Tu (rivenditore) entri e gestisci i saloni-cliente
e le loro licenze da un pannello dedicato. Ogni salone vede solo i propri dati.

## Struttura
- src/App.jsx        → schermata di accesso + instradamento (login, rivenditore, salone, avviso licenza)
- src/SalonApp.jsx   → l'app del salone (agenda, clienti, vendite…)
- src/ResellerPanel.jsx → pannello rivenditore (crea clienti, rinnova/sospendi licenze)
- src/main.jsx, index.html, package.json, vite.config.js
- functions/api/[[path]].js → API con login, sessioni, licenze, isolamento per azienda
- schema.sql         → tabelle del database (utenti, aziende, sessioni, dati_app)
- public/setup.html  → paginetta usata UNA volta per creare il tuo account rivenditore

## AGGIORNARE il sito già online (passi)
1. GitHub: carica/sostituisci tutti questi file nel repository
   (in src/ ora ci sono 3 file: App.jsx, SalonApp.jsx, ResellerPanel.jsx).
2. D1: apri la Console del database ed esegui di nuovo schema.sql
   (crea le nuove tabelle; quelle esistenti restano, è sicuro rieseguirlo).
   Poi esegui migrazione-moduli.sql, migrazione-prezzi.sql, migrazione-operatori.sql
   e migrazione-rivenditori.sql. Se danno errore "duplicate column name" c'erano
   già: ignoralo (è normale).
3. Cloudflare → Settings → Environment variables → Production → Add:
   SETUP_TOKEN = una stringa lunga e segreta a tua scelta.
4. Fai ripartire una pubblicazione con un piccolo commit su GitHub
   (NON usare "Retry deployment", rifà il commit vecchio).

## CREARE il tuo account rivenditore (una volta sola)
1. Apri  https://TUO-SITO.pages.dev/setup.html
2. Inserisci il SETUP_TOKEN, la tua email e una password → Crea rivenditore.
3. Vai su  https://TUO-SITO.pages.dev  e accedi con quella email/password:
   vedrai il pannello Rivenditore.
4. Per sicurezza, elimina poi il file public/setup.html dal repository
   (dopo il primo rivenditore comunque non funziona più).

## USARE il pannello rivenditore
- "Nuovo salone-cliente": nome, email, password iniziale, durata licenza → Crea.
- Per ogni cliente: Rinnova (scegli i mesi), Sospendi/Riattiva, cambia Password, Elimina.
- Consegna al cliente l'indirizzo del sito + la sua email e password.
  Il cliente entra e vede solo la SUA agenda/clienti/vendite.
- Licenza scaduta o sospesa: il cliente entra ma vede un avviso e non può lavorare
  finché non rinnovi/riattivi.

## (Opzionale) Recuperare i dati di prova già inseriti
I dati che avevi inserito finora stanno sotto azienda_id 'default'. I nuovi clienti
partono vuoti. Se vuoi assegnare quei dati a un cliente nuovo, nella Console D1:
  UPDATE dati_app SET azienda_id='ID_DEL_CLIENTE' WHERE azienda_id='default';
(l'ID del cliente lo trovi nel database, tabella aziende.)

## MODULI (cosa attivare per ogni cliente)
BASE (sempre incluso): Agenda con 1 operatore + Clienti (solo anagrafica e storico appuntamenti).
ADD-ON attivabili dal pannello, alla creazione o dopo (riga cliente -> "Moduli"):
  Fidelity · Vendite · Statistiche · Marketing · Allergeni e patologie · Pacchetti sedute
OPERATORI: livello a scelta -> 1 (base) / fino a 3 / illimitati.

Note:
- I clienti creati prima dei moduli hanno tutto attivo (nessuna regressione).
- Il limite operatori blocca l'aggiunta di nuovi operatori oltre il piano; quelli
  gia' presenti non vengono rimossi automaticamente.
- I controlli sono lato server (arrivano da /api/me): il cliente non puo' aggirarli.

## PREZZI (promemoria commerciale, solo lato rivenditore)
Nella scheda di ogni cliente (pannello) puoi indicare Imponibile (IVA escl.) e
Prezzo finale mensile. Sono campi liberi, vuoti di default: li compili tu.
In creazione, sotto il prezzo finale, vedi il Totale licenza = mensile x durata.
Questi prezzi NON sono visibili al cliente: servono solo a te come promemoria.

## ACCESSI OPERATORI
Disponibile nei piani con più di un operatore (Smart/Pro).
Il titolare, da Impostazioni -> Accessi operatori, crea per ogni operatore un
accesso (email + password) collegato alla sua scheda. L'operatore entra con quelle
credenziali e vede SOLO la propria agenda, in sola lettura (nessun cliente, vendite
o impostazioni). Il filtro è applicato anche lato server.
Eliminando un cliente-salone vengono rimossi anche i suoi accessi operatore.

## RIVENDITORI (sub-rivenditori, solo per il principale)
Il rivenditore PRINCIPALE (il primo creato col setup) vede tre schede: Licenze,
Rivenditori, Fatturazione.
- Rivenditori: crea/gestisce altri rivenditori. Richiede tutti i dati di
  fatturazione (ragione sociale, P.IVA, C.F., indirizzo, CAP, città, provincia,
  SDI o PEC) + email e password. Licenza rivenditore: 12 mesi (rinnovo annuale).
- Licenze: filtro Tutte / Mie / per singolo rivenditore.
- Fatturazione: per mese e per rivenditore mostra licenze nuove e rinnovi con
  totali imponibile, e permette di segnarle come fatturate.
Ogni rivenditore vede solo i propri saloni-cliente. Eliminando un rivenditore,
i suoi saloni passano al principale.

## NOVITA (sconto, angolo licenza, ripristino dati)
- I sub-rivenditori possono creare licenze solo con i piani Basic/Smart/Pro (nessun
  personalizzato) e non vedono/modificano il prezzo: il cliente paga sempre il prezzo
  pieno del piano. Ogni rivenditore ha uno "sconto sul canone" (default 50%): in
  Fatturazione l'importo "da fatturare" è già scontato.
- Cliente (salone): in Impostazioni compare "La tua licenza" con piano, canone mensile
  e scadenza.
- Cliente (salone): in Impostazioni, "Zona ripristino" con 3 opzioni protette da
  password e conferma: azzera punti fedeltà; azzera vendite+appuntamenti (mantenendo
  i punti); ripristino totale (clienti, operatori, fidelity, ecc.).
Nessuna nuova migrazione: lo sconto è incluso nella tabella rivenditori (esegui
migrazione-rivenditori.sql se non l'hai ancora fatto).
