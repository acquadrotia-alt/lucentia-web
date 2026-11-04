# Lucentia Cassa — il programma Windows per la cassa

Apre il gestionale del salone (solo l'area **Banco**) in una finestra sua e parla direttamente col
**registratore telematico Custom** (K3 RT e gli altri di 3ª generazione, protocollo XML 1.30):
nella sezione Vendita i tasti «Contanti» e «Carta / POS» emettono lo **scontrino fiscale**, e
«Svolto» su un appuntamento emette lo scontrino dei servizi. La vendita si registra nel gestionale
solo dopo che lo scontrino è uscito: mai doppioni, mai vendite perse.

## Costruire l'installazione (.exe)

Su GitHub, scheda **Actions** → «Programma Windows (Lucentia Cassa)» → *Run workflow*. Alla fine,
nella pagina dell'esecuzione (Artifacts), si scaricano:

- `Lucentia-Cassa-Installazione-x.y.z.exe` — installazione con collegamento sul desktop;
- `Lucentia-Cassa-Portatile-x.y.z.exe` — si avvia senza installare.

Il programma è lo stesso per tutti i clienti: cambia solo l'indirizzo del gestionale scritto
nelle impostazioni. Per provarlo da un PC con Node: `cd desktop && npm install && npm start`.

## Primo avvio dal cliente

1. Avvia Lucentia Cassa: chiede di aprire le impostazioni.
2. Menù **Cassa → Impostazioni della cassa** (o `Ctrl+,`), password del tecnico **0724**.
3. Scrivi l'**indirizzo del gestionale** (es. `https://estetica-aura.pages.dev/gestionale` o
   `https://salone.it/gestionale`), poi il registratore: **IP**, **matricola** (è anche utente e
   password), schema `https` porta `80` percorso `/xml/printer.htm`, i **reparti** come sono
   programmati sul registratore (numero → aliquota), i numeri dei **pagamenti** (contanti e
   elettronico), il messaggio in fondo allo scontrino. «Verifica collegamento» dice se il
   registratore risponde.
4. Lascia la **simulazione** accesa per le prime prove (gli scontrini non escono, la cassa risponde
   come il registratore); poi spegnila e fai un primo scontrino da pochi centesimi, un reso e la
   chiusura Z.
5. Nel gestionale, Impostazioni → Servizi e Articoli → Catalogo hanno il campo **IVA** per
   servizi e prodotti; vuoto = aliquota predefinita della cassa.

Le impostazioni stanno in `%APPDATA%\Lucentia Cassa\impostazioni.json` sul PC della cassa e non
passano mai dal gestionale online.

## Ogni giorno

- Vendita → **Cassa**: carrello, poi «Contanti» o «Carta / POS» → scontrino. Lo storico mostra il
  numero (Z e n.) di ogni scontrino, con «Reso» e «Annulla scontrino».
- Agenda → appuntamento → **Svolto** → importo → «Contanti» o «Carta / POS» → scontrino dei servizi.
- Vendita → **Registratore**: verifica, lettura X, **chiusura Z a fine giornata** (obbligatoria,
  altrimenti il giorno dopo il registratore rifiuta: errori 54/61/70), stato dell'invio dei
  corrispettivi, apri cassetto, ristampa, annulla documento aperto.
