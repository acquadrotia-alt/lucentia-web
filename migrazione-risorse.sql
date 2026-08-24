-- Modello a risorse: un appuntamento può impegnare più operatori e una cabina,
-- a tratti diversi. La colonna conserva gli impegni risolti al momento della
-- prenotazione: [{"tipo":"operatore","risorsaId":"a1","from":540,"to":550}, ...]
-- Le righe già esistenti restano a NULL e valgono come prima: un operatore
-- (staff_id) occupato da start_min a end_min.
ALTER TABLE prenotazioni_online ADD COLUMN impegni TEXT;
