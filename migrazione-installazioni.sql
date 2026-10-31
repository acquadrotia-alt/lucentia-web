-- Installazioni cliente (portale) e copia locale della licenza (installazioni).
-- Eseguire sul database del portale E su quello di ogni installazione: le
-- tabelle inutili restano vuote. Sicura da rieseguire.
CREATE TABLE IF NOT EXISTS installazioni (id TEXT PRIMARY KEY, nome TEXT, dominio TEXT, chiave_hash TEXT, licenza_scadenza TEXT, attiva INTEGER DEFAULT 1, moduli TEXT, moduli_disponibili TEXT, note TEXT, versione TEXT, dominio_rilevato TEXT, ultimo_contatto TEXT, creata_il TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS licenza_locale (id TEXT PRIMARY KEY, dati TEXT, verificata_il TEXT, tentata_il TEXT);
