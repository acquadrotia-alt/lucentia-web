# Lucentia — guida operativa

Lucentia è **un solo codice che gira in due modalità**, decise dalla variabile
d'ambiente `MODALITA` del progetto Cloudflare Pages:

| Modalità | Dove gira | Cosa fa |
|---|---|---|
| `hub` (predefinita) | lucentia-app.com | sito vetrina del prodotto, demo pubblica, pannello di amministrazione delle installazioni |
| `cliente` | il dominio di ogni salone (es. `salonebellezza.it`) | sito vetrina del salone sulla radice, gestionale su `/gestionale`, database proprio, licenza presa dal portale |

Questo repository è il **ceppo** (upstream). Ogni cliente ha un proprio
repository GitHub clonato da qui, con le sue personalizzazioni nella cartella
`src/cliente/` (frontend) e `server/cliente/` (API), e riceve gli aggiornamenti
del core con `git merge`.

## Struttura

```
src/App.jsx                 instradamento: portale oppure installazione cliente (/, /prenota, /evento/:id, /gestionale)
src/site/                   sito vetrina di Lucentia (solo portale)
src/hub/PannelloHub.jsx     pannello di amministrazione (solo portale)
src/core/salone/            il gestionale, un file per vista (agenda, clienti, cassa, impostazioni…)
src/core/sito/SitoSalone.jsx il sito del salone sul suo dominio (solo installazioni)
src/BookingPage.jsx         pagina di prenotazione online (/prenota oppure ?prenota=<id>)
src/EventoPage.jsx          pagina pubblica di un evento
src/OperatorApp.jsx         agenda in sola lettura per gli accessi operatore
src/orari.js                motore degli orari (usato da gestionale e API)
src/cliente/                ZONA DEL CLIENTE: moduli su misura, viste e sezioni in più, tema, sito
server/router.js            instradamento API e modalità
server/core/                API uguali per tutti (sessioni, salone, prenotazioni online)
server/hub/                 API del portale (installazioni, licenze/verifica, demo, richieste, saloni di prova)
server/cliente/             API delle installazioni (licenza dal portale, /api/sito, rotte su misura)
functions/api/[[path]].js   punto d'ingresso Cloudflare: importa server/router.js
schema.sql                  schema completo del database, sicuro da rieseguire
migrazione-*.sql            migrazioni incrementali (riesecuzione: errori "duplicate column" innocui)
public/setup.html           primo avvio (crea l'amministratore sul portale, il salone su un'installazione)
scripts/nuova-installazione.sh  prepara repository e progetto Cloudflare di un nuovo cliente
```

## Comandi

```bash
npm install
npm run dev        # solo frontend (le /api non girano sotto Vite)
npm run build      # build + prerender (in modalità hub le pagine del sito; in modalità cliente i gusci /gestionale e /prenota)
npm test           # test dell'API, degli orari, delle installazioni e della licenza cliente
```

Per provare le API in locale serve `wrangler pages dev` con un binding D1 chiamato `DB`.

---

## 1. Il portale (lucentia-app.com)

### Primo avvio
1. Progetto Cloudflare Pages collegato a questo repository (branch principale).
2. D1: crea il database, collegalo al progetto come binding `DB`, esegui `schema.sql`
   nella console (sicuro da rieseguire) e poi tutte le `migrazione-*.sql`.
3. Variabili d'ambiente → Production: `SETUP_TOKEN` = una stringa lunga e segreta.
   (`MODALITA` non va impostata: senza, il codice è in modalità hub.)
4. Apri `https://lucentia-app.com/setup.html`, inserisci il token, email e password →
   crea l'amministratore. Funziona una volta sola.
5. Accedi dalla home (pulsante **Accedi**): vedrai il pannello di amministrazione.

### Aggiornare il portale
Push sul branch principale: Cloudflare ricompila da solo. Se hai aggiunto tabelle o
colonne, riesegui `schema.sql` (o la migrazione nuova) nella console D1.
**Non** usare "Retry deployment": rifà il commit vecchio.

### Il pannello di amministrazione
- **Installazioni**: i clienti veri. Per ognuno: licenza (rinnova, sospendi, scadenza),
  moduli (quelli del core, il livello operatori, le prenotazioni online e i moduli
  su misura che l'installazione ha dichiarato), chiave (rigenera), dati, note,
  ultimo contatto e versione in esecuzione.
- **Richieste e demo**: le richieste di preventivo arrivate dal sito e le demo
  attivate (10 giorni, tutti i moduli). Da qui si eliminano le demo scadute.
- **Saloni di prova**: saloni ospitati sul portale stesso, per prove e presentazioni.
  I clienti veri hanno la loro installazione.

Il pagamento del canone si gestisce fuori dal software: qui si registra solo la
scadenza con **Rinnova**.

---

## 2. Creare l'installazione di un cliente

Riassunto: una licenza sul portale, un repository GitHub, un progetto Cloudflare
Pages con il suo D1, quattro variabili d'ambiente, il dominio.

### 2.1 Sul portale
Pannello → **Installazioni** → **Nuova installazione cliente**: nome, dominio,
durata, moduli → **Crea**. Compare una volta sola il riquadro con le variabili:

```
MODALITA=cliente
HUB_URL=https://lucentia-app.com
INSTALLAZIONE_ID=…
INSTALLAZIONE_CHIAVE=…
```

Copiale subito. Nel database resta solo l'impronta della chiave: se la perdi, **Rigenera chiave**.

### 2.2 Repository del cliente
Lo script fa tutto il lavoro di git (e stampa i comandi Cloudflare se hai `wrangler`):

```bash
scripts/nuova-installazione.sh salonebellezza https://github.com/TUO-UTENTE/lucentia-salonebellezza.git
```

Crea la cartella `../lucentia-salonebellezza`, clona il ceppo, imposta `origin` sul
nuovo repository (vuoto, da creare prima su GitHub) e `upstream` su questo, fa il
primo push. A mano equivale a:

```bash
git clone https://github.com/TUO-UTENTE/lucentia-web.git lucentia-salonebellezza
cd lucentia-salonebellezza
git remote rename origin upstream
git remote add origin https://github.com/TUO-UTENTE/lucentia-salonebellezza.git
git push -u origin main
```

### 2.3 Cloudflare
1. **Pages** → nuovo progetto collegato al repository del cliente (comando di build
   `npm run build`, cartella `dist`).
2. **D1** → crea un database per il cliente (es. `lucentia-salonebellezza`), collegalo
   al progetto come binding **`DB`**, esegui `schema.sql` e le `migrazione-*.sql` nella console.
3. **Variabili d'ambiente** (Production, e anche Preview se usi le anteprime): le
   quattro del riquadro più `SETUP_TOKEN` (una stringa segreta qualsiasi, diversa per cliente).
   `MODALITA` serve anche al build: Pages la passa sia al build sia alle Functions.
4. **Dominio**: Pages → Custom domains → aggiungi `salonebellezza.it` (e `www`). Il dominio
   è registrato su Aruba con i DNS su Cloudflare: Cloudflare crea i record da solo.
5. Fai partire il primo deploy (push o "Create deployment").

### 2.4 Primo avvio dell'installazione
Apri `https://salonebellezza.it/setup.html`: inserisci `SETUP_TOKEN`, nome del salone,
email e password del titolare → **Crea salone**. Da quel momento:

- `https://salonebellezza.it/` è il sito del salone (contenuti da Impostazioni → *Sito e prenotazioni*),
- `https://salonebellezza.it/gestionale` è il gestionale,
- `https://salonebellezza.it/prenota` è la prenotazione online (se il modulo è acceso).

Alla prima richiesta l'installazione si presenta al portale, riceve licenza e
moduli e nel pannello compaiono *ultimo contatto* e *versione*.

---

## 3. Come funziona la licenza di un'installazione

- Ogni qualche ora (6) l'installazione chiama `POST /api/licenze/verifica` sul portale
  con id e chiave, dichiarando versione, dominio e i moduli su misura del suo codice.
- La risposta (attiva/sospesa/scaduta, scadenza, moduli) viene salvata nel suo database
  e copiata nella riga del salone: il gestionale la legge come sempre.
- Se il portale non risponde vale l'ultimo esito buono per **7 giorni**; poi l'installazione
  va in manutenzione. Se il portale risponde "chiave non valida" o "installazione
  sconosciuta", va in manutenzione subito.
- **Licenza non attiva** (scaduta, sospesa, non verificabile) = tutto il dominio mostra
  la pagina "Sito in manutenzione" con logo e colori del salone; le API dei dati rispondono 403.
- Modificando moduli o scadenza dal pannello, l'installazione li riceve al contatto
  successivo (al massimo 6 ore). Il titolare può forzarlo da Impostazioni → Licenza → **Verifica ora**.
- Senza `HUB_URL` l'installazione usa la licenza scritta nella sua riga `aziende`
  (modalità locale): serve per sviluppo ed emergenze, non lasciarla così in produzione.

---

## 4. Aggiornare un cliente col codice nuovo del ceppo

Nel repository del cliente:

```bash
git fetch upstream
git merge upstream/main
npm test && npm run build
git push
```

Se il ceppo ha aggiunto una migrazione, eseguila anche nel D1 del cliente.
I conflitti sono rari se le personalizzazioni restano in `src/cliente/` e
`server/cliente/`: il ceppo non tocca quelle cartelle.

## 5. Personalizzare un cliente

| Cosa | Dove |
|---|---|
| Moduli su misura (interruttori nel portale) | `src/cliente/moduli.js` |
| Viste in più nel gestionale, sezioni in più nelle Impostazioni, blocchi in più nella scheda cliente e nel dettaglio appuntamento, tema | `src/cliente/index.jsx` (`ESTENSIONI`) |
| Sito del salone: home sostitutiva, sezioni in più, pagine in più | `src/cliente/index.jsx` → `ESTENSIONI.sito` |
| Rotte API su misura (`/api/cliente/...`) | `server/cliente/rotte.js` |
| Tabelle in più | una `migrazione-cliente-*.sql` nel repository del cliente |

Regola: se una richiesta è utile anche ad altri clienti, falla nel ceppo dietro
un modulo del core, non nella cartella del cliente.

---

## 6. Il gestionale: promemoria

- **Moduli**: Fidelity, Vendite, Statistiche, Marketing, Allergeni e patologie, Pacchetti
  sedute; livello operatori 1 / fino a 3 / illimitati; Prenotazioni online (richiede
  più di un operatore). Sempre inclusi: Agenda, Clienti, Buoni regalo, Eventi.
  Un salone con colonna `moduli` NULL ha tutto attivo.
- **Accessi operatori** (piani con più operatori): da Impostazioni → Operatori e cabine il
  titolare crea email+password per ogni operatore, che vede solo la propria agenda in sola lettura.
- **Prenotazioni online**: tre modalità (anti-vuoto, griglia, ottimizzata), preavviso,
  giorni in avanti, sospensione; link `/prenota` sul dominio del cliente, `/?prenota=<id>` sul portale.
- **Migrazioni**: `migrazione-prenotazioni.sql` crea la tabella delle prenotazioni online
  (obbligatoria per il modulo), `migrazione-risorse.sql` aggiunge la colonna `impegni`
  (senza, una prenotazione online occupa l'operatore per tutta la durata del servizio),
  `migrazione-installazioni.sql` crea `installazioni` (portale) e `licenza_locale` (installazioni).
- **Zona ripristino** (Impostazioni → Dati e backup): azzera punti, azzera vendite e
  appuntamenti, ripristino totale, protetti da password.
- **Svuota dati** (pannello, saloni di prova): riporta un salone a licenza vuota lasciando
  licenza e accesso.
