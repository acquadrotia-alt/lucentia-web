// Le pagine del sito pubblico. Una sola fonte di verità: la usano sia il
// router lato client (src/site/Site.jsx) sia il prerender in fase di build
// (scripts/prerender.mjs), che genera un file HTML statico per ogni pagina.
export const SITO = "https://lucentia-app.com";

export const ROTTE = [
  {
    path: "/",
    out: "index.html",
    title: "Lucentia — Gestionale per parrucchieri ed estetisti",
    description: "Lucentia è il gestionale cloud per parrucchieri e centri estetici: agenda appuntamenti, scheda cliente, fidelity, vendite, magazzino e statistiche in un'unica app elegante. Prova gratis 10 giorni.",
    ogTitle: "Lucentia — Gestionale per parrucchieri ed estetisti",
    ogDescription: "Agenda, clienti, fidelity, vendite, magazzino e statistiche. Sul cloud, sempre con te, semplice da usare ogni giorno. Prova gratis 10 giorni.",
  },
  {
    path: "/funzionalita",
    out: "funzionalita/index.html",
    title: "Funzionalità — Lucentia, gestionale per parrucchieri ed estetisti",
    description: "Tutte le funzioni di Lucentia: agenda e appuntamenti, scheda cliente, fidelity, pacchetti, buoni, cassa e magazzino, statistiche, marketing WhatsApp, eventi e mini-sito con prenotazioni online. Con le anteprime reali dell'app.",
    ogTitle: "Funzionalità di Lucentia — tutto quello che puoi fare",
    ogDescription: "Agenda, clienti, fidelity, pacchetti, cassa e magazzino, statistiche, marketing, eventi e mini-sito con prenotazioni online. Guarda le anteprime dell'app.",
  },
  {
    path: "/piani",
    out: "piani/index.html",
    title: "Piani e prezzi — Lucentia, gestionale per parrucchieri ed estetisti",
    description: "I piani di Lucentia: Basic da € 9/mese, Smart da € 12/mese, Pro da € 19,50/mese (IVA esclusa). Confronto dettagliato dei moduli inclusi, numero di operatori e add-on prenotazioni online a € 4/mese.",
    ogTitle: "Piani e prezzi di Lucentia",
    ogDescription: "Basic € 9, Smart € 12, Pro € 19,50 al mese, IVA esclusa. Confronta moduli, operatori e l'add-on prenotazioni online a € 4/mese.",
  },
];

// Normalizza un percorso del browser su una delle rotte conosciute.
// Qualunque percorso non riconosciuto ricade sulla home.
export function normalizePath(p) {
  let s = String(p || "/").split("?")[0].split("#")[0].toLowerCase();
  if (s.length > 1) s = s.replace(/\/+$/, "");
  if (!s.startsWith("/")) s = "/" + s;
  return ROTTE.some((r) => r.path === s) ? s : "/";
}

export function rottaDi(path) {
  const p = normalizePath(path);
  return ROTTE.find((r) => r.path === p) || ROTTE[0];
}
