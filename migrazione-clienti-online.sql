-- Account dei clienti per la prenotazione online (/registrazione) e le loro sessioni.
CREATE TABLE IF NOT EXISTS clienti_online (id TEXT PRIMARY KEY, azienda_id TEXT NOT NULL, email TEXT NOT NULL, password_hash TEXT NOT NULL, nome TEXT, cognome TEXT, telefono TEXT, client_code TEXT, creato_il TEXT DEFAULT (datetime('now')), UNIQUE(azienda_id, email));
CREATE TABLE IF NOT EXISTS sessioni_clienti (token TEXT PRIMARY KEY, cliente_id TEXT NOT NULL, scadenza TEXT NOT NULL);
