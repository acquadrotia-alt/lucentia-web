-- Gmail e Google Calendar: archivio riservato per salone (client secret, refresh
-- token, abbinamenti dei calendari, codice del feed iCalendar). Sicura da rieseguire.
CREATE TABLE IF NOT EXISTS integrazioni (azienda_id TEXT NOT NULL, chiave TEXT NOT NULL, dati TEXT NOT NULL, aggiornato_il TEXT DEFAULT (datetime('now')), PRIMARY KEY (azienda_id, chiave));
