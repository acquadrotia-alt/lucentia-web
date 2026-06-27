CREATE TABLE IF NOT EXISTS aziende (id TEXT PRIMARY KEY, denominazione TEXT, licenza_scadenza TEXT, attiva INTEGER DEFAULT 1, note TEXT, moduli TEXT, prezzo_imponibile TEXT, prezzo_finale TEXT, reseller_id TEXT, demo INTEGER DEFAULT 0, creata_il TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS utenti (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, ruolo TEXT NOT NULL DEFAULT 'azienda', azienda_id TEXT, nome TEXT, staff_id TEXT, reseller_parent TEXT, creato_il TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessioni (token TEXT PRIMARY KEY, utente_id TEXT NOT NULL, scadenza TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS dati_app (id TEXT PRIMARY KEY, azienda_id TEXT NOT NULL, collezione TEXT NOT NULL, dati TEXT NOT NULL, aggiornato_il TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS rivenditori (id TEXT PRIMARY KEY, ragione_sociale TEXT, piva TEXT, codice_fiscale TEXT, indirizzo TEXT, cap TEXT, citta TEXT, provincia TEXT, sdi TEXT, pec TEXT, email TEXT, telefono TEXT, note TEXT, licenza_scadenza TEXT, attiva INTEGER DEFAULT 1, sconto INTEGER DEFAULT 50, creato_il TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS licenze_eventi (id TEXT PRIMARY KEY, azienda_id TEXT, reseller_id TEXT, tipo TEXT, mesi INTEGER, prezzo_imponibile TEXT, prezzo_finale TEXT, fatturato INTEGER DEFAULT 0, fatturato_il TEXT, creato_il TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_dati_azienda ON dati_app(azienda_id, collezione);
CREATE INDEX IF NOT EXISTS idx_utenti_azienda ON utenti(azienda_id);
CREATE INDEX IF NOT EXISTS idx_aziende_reseller ON aziende(reseller_id);
CREATE INDEX IF NOT EXISTS idx_eventi_reseller ON licenze_eventi(reseller_id, creato_il);
CREATE TABLE IF NOT EXISTS richieste (id TEXT PRIMARY KEY, tipo TEXT, ragione_sociale TEXT, piva TEXT, email TEXT, telefono TEXT, messaggio TEXT, piano TEXT, azienda_id TEXT, stato TEXT DEFAULT 'nuova', creato_il TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_richieste_creato ON richieste(creato_il);
-- Prenotazioni online dei clienti (modulo aggiuntivo "online"): tabella separata
-- così le scritture del salone (blob dati_app) non possono sovrascriverle.
CREATE TABLE IF NOT EXISTS prenotazioni_online (id TEXT PRIMARY KEY, azienda_id TEXT NOT NULL, data TEXT NOT NULL, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL, service_id TEXT, staff_id TEXT, client_code TEXT, client_name TEXT, client_phone TEXT, client_email TEXT, note TEXT, stato TEXT DEFAULT 'attiva', creato_il TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_prenotazioni_azienda ON prenotazioni_online(azienda_id, data);
