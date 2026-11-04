// ============================================================================
// Modelli delle email ai clienti (modulo puro, condiviso fra gestionale e
// server): benvenuto alla registrazione, conferma dell'appuntamento,
// promemoria alle 19 del giorno prima, promemoria un'ora prima.
// I testi personalizzati stanno in config.google.modelli[tipo]; i segnaposto
// si riempiono con `compila()` dai valori di `valoriAppuntamento()`.
// ============================================================================
export const MODELLI_EMAIL = {
  benvenuto: { oggetto: "Benvenuto da {salone}: la tua registrazione", testo: "Gentile {nome},\n\nla tua registrazione da {salone} è completata. Ecco il riepilogo dei tuoi dati:\n\nNome: {nome} {cognome}\nTelefono: {telefono}\nEmail: {email}\nPassword: {password}\n\nCon email e password puoi prenotare online, vedere i tuoi appuntamenti e i tuoi punti:\n{linkPrenota}\n\nA presto,\n{salone}{telefonoFrase}" },
  conferma: { oggetto: "Conferma appuntamento {data} alle {ora} · {salone}", testo: "Gentile {cliente},\n\nle confermiamo l'appuntamento di {data} alle {ora} per {servizi}{conOperatore}.\n\nSe avesse un imprevisto la preghiamo di avvisarci con anticipo{telefonoFrase}.\n\nA presto,\n{salone}" },
  promemoria: { oggetto: "Promemoria: domani alle {ora} da {salone}", testo: "Gentile {cliente},\n\nle ricordiamo l'appuntamento di domani, {data} alle {ora}, per {servizi}{conOperatore}.\n\nLa aspettiamo{indirizzoFrase}.\n\n{salone}" },
  oraPrima: { oggetto: "Tra un'ora: il suo appuntamento da {salone}", testo: "Gentile {cliente},\n\nle ricordiamo che l'appuntamento per {servizi} è alle {ora}{conOperatore}.\n\nA tra poco,\n{salone}{indirizzoFrase}" },
  recensione: { oggetto: "Com'è andata da {salone}?", testo: "Gentile {cliente},\n\ngrazie per essere venuta da noi per {servizi}. Ci farebbe piacere sapere com'è andata: una recensione aiuta il nostro lavoro e chi deve ancora conoscerci.\n\nLasciarla richiede un minuto:\n{linkRecensione}\n\nGrazie di cuore,\n{salone}" },
  recuperoPassword: { oggetto: "Reimposta la tua password · {salone}", testo: "Gentile {nome},\n\nabbiamo ricevuto la richiesta di reimpostare la password del tuo account per prenotare da {salone}. Scegli la nuova password da qui (il link vale un'ora):\n{linkReset}\n\nSe non sei stata tu, ignora questa email: la password resta quella di sempre.\n\n{salone}" },
};
export const TIPI_EMAIL = [["conferma", "Conferma appuntamento"], ["promemoria", "Promemoria alle 19 del giorno prima"], ["oraPrima", "Promemoria un'ora prima"], ["recensione", "Richiesta di recensione (dopo il primo appuntamento svolto)"], ["benvenuto", "Benvenuto alla registrazione"], ["recuperoPassword", "Recupero della password"]];
export const SEGNAPOSTO_EMAIL = "{cliente} {nome} {cognome} {data} {ora} {fine} {servizi} {operatore} {conOperatore} {salone} {telefono} {telefonoFrase} {indirizzo} {indirizzoFrase} {linkPrenota} · nella recensione: {linkRecensione} · nel benvenuto: {email} {password} · nel recupero: {linkReset}";

export const compila = (t, v) => String(t || "").replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m));
export function modelloEmail(config, tipo) {
  const g = (config && config.google) || {};
  const mio = (g.modelli || {})[tipo] || {};
  const base = MODELLI_EMAIL[tipo] || { oggetto: "", testo: "" };
  return { oggetto: mio.oggetto || base.oggetto, testo: mio.testo || base.testo, firma: g.firma || "" };
}
const GIORNI = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const pad = (n) => String(n).padStart(2, "0");
export const minutiTesto = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export function dataTesto(s) { const [y, mo, d] = String(s || "").split("-").map(Number); if (!y) return ""; const dt = new Date(y, mo - 1, d); return `${GIORNI[dt.getDay()]} ${dt.getDate()} ${MESI[dt.getMonth()]}`; }
// b: { date, startMin, endMin, serviceIds | serviceId, staffId, clientName }
export function valoriAppuntamento(b, config, extra) {
  const br = (config && config.branding) || {};
  const ids = Array.isArray(b.serviceIds) ? b.serviceIds : (b.serviceId ? [b.serviceId] : []);
  const servizi = ids.map((id) => { const s = ((config && config.services) || []).find((x) => x.id === id); return s ? s.name : null; }).filter(Boolean).join(", ");
  const op = ((config && config.staff) || []).find((s) => s.id === b.staffId);
  return {
    cliente: b.clientName || "cliente", data: dataTesto(b.date), ora: minutiTesto(b.startMin || 0), fine: minutiTesto(b.endMin || 0), servizi: servizi || "il servizio prenotato",
    operatore: op ? op.name : "", conOperatore: op ? ` con ${op.name}` : "",
    salone: br.name || "", telefono: br.phone || "", telefonoFrase: br.phone ? ` al numero ${br.phone}` : "", indirizzo: br.address || "", indirizzoFrase: br.address ? ` in ${br.address}` : "",
    ...(extra || {}),
  };
}
// Testo e oggetto pronti (con la firma in fondo).
export function emailPronta(config, tipo, valori) {
  const m = modelloEmail(config, tipo);
  return { oggetto: compila(m.oggetto, valori), testo: compila(m.testo, valori) + (m.firma ? "\n\n" + m.firma : "") };
}
