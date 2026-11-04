-- Registro delle attività del salone (accessi, salvataggi, scontrini, fatture, backup…).
CREATE TABLE IF NOT EXISTS registro (id TEXT PRIMARY KEY, azienda_id TEXT NOT NULL, quando TEXT DEFAULT (datetime('now')), chi TEXT, origine TEXT, tipo TEXT, testo TEXT, dettagli TEXT);
CREATE INDEX IF NOT EXISTS idx_registro_azienda ON registro(azienda_id, quando);
