CREATE TABLE IF NOT EXISTS dati_app (id TEXT PRIMARY KEY, azienda_id TEXT NOT NULL, collezione TEXT NOT NULL, dati TEXT NOT NULL, aggiornato_il TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_dati_azienda ON dati_app(azienda_id, collezione);
