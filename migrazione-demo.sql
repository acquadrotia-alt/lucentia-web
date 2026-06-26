-- Migrazione: modalità demo + richieste (copertina e dashboard)
-- Eseguire una sola volta nella Console del database D1.
-- Se una riga dà "duplicate column name" significa che è già presente: ignorala.
ALTER TABLE aziende ADD COLUMN demo INTEGER DEFAULT 0;
CREATE TABLE IF NOT EXISTS richieste (id TEXT PRIMARY KEY, tipo TEXT, ragione_sociale TEXT, piva TEXT, email TEXT, telefono TEXT, messaggio TEXT, piano TEXT, azienda_id TEXT, stato TEXT DEFAULT 'nuova', creato_il TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_richieste_creato ON richieste(creato_il);
