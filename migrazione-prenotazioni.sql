-- Migrazione: modulo "Prenotazioni online" (add-on).
-- Tabella separata per le prenotazioni autonome dei clienti, così le scritture
-- del salone (blob dati_app) non le sovrascrivono. Eseguibile più volte.
CREATE TABLE IF NOT EXISTS prenotazioni_online (id TEXT PRIMARY KEY, azienda_id TEXT NOT NULL, data TEXT NOT NULL, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL, service_id TEXT, staff_id TEXT, client_code TEXT, client_name TEXT, client_phone TEXT, client_email TEXT, note TEXT, stato TEXT DEFAULT 'attiva', creato_il TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_prenotazioni_azienda ON prenotazioni_online(azienda_id, data);
