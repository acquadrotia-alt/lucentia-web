CREATE TABLE IF NOT EXISTS aziende (id TEXT PRIMARY KEY, denominazione TEXT, licenza_scadenza TEXT, attiva INTEGER DEFAULT 1, note TEXT, moduli TEXT, prezzo_imponibile TEXT, prezzo_finale TEXT, creata_il TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS utenti (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, ruolo TEXT NOT NULL DEFAULT 'azienda', azienda_id TEXT, nome TEXT, staff_id TEXT, creato_il TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessioni (token TEXT PRIMARY KEY, utente_id TEXT NOT NULL, scadenza TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS dati_app (id TEXT PRIMARY KEY, azienda_id TEXT NOT NULL, collezione TEXT NOT NULL, dati TEXT NOT NULL, aggiornato_il TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_dati_azienda ON dati_app(azienda_id, collezione);
CREATE INDEX IF NOT EXISTS idx_utenti_azienda ON utenti(azienda_id);
