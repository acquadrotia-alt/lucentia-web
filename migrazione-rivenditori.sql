ALTER TABLE aziende ADD COLUMN reseller_id TEXT;
ALTER TABLE utenti ADD COLUMN reseller_parent TEXT;
CREATE TABLE IF NOT EXISTS rivenditori (id TEXT PRIMARY KEY, ragione_sociale TEXT, piva TEXT, codice_fiscale TEXT, indirizzo TEXT, cap TEXT, citta TEXT, provincia TEXT, sdi TEXT, pec TEXT, email TEXT, telefono TEXT, note TEXT, licenza_scadenza TEXT, attiva INTEGER DEFAULT 1, sconto INTEGER DEFAULT 50, creato_il TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS licenze_eventi (id TEXT PRIMARY KEY, azienda_id TEXT, reseller_id TEXT, tipo TEXT, mesi INTEGER, prezzo_imponibile TEXT, prezzo_finale TEXT, fatturato INTEGER DEFAULT 0, fatturato_il TEXT, creato_il TEXT DEFAULT (datetime('now')));
