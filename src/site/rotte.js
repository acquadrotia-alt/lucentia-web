// Le pagine del sito pubblico. Una sola fonte di verità: la usano sia il
// router lato client (src/site/Site.jsx) sia il prerender in fase di build
// (scripts/prerender.mjs), che genera un file HTML statico per ogni pagina.
export const SITO = "https://lucentia-app.com";

export const ROTTE = [
  {
    path: "/",
    out: "index.html",
    title: "Lucentia — Il tuo sito, il tuo dominio, il tuo gestionale per saloni",
    description: "Lucentia realizza per ogni salone un sito vetrina sul proprio dominio e, dietro, un gestionale completo su misura: agenda intelligente, clienti, fidelity, cassa e magazzino, statistiche, prenotazioni online. Licenza annuale tutto incluso, demo gratuita 10 giorni.",
    ogTitle: "Lucentia — Il tuo sito, il tuo dominio, il tuo gestionale",
    ogDescription: "Un progetto dedicato per ogni parrucchiere e centro estetico: sito vetrina personalizzato e gestionale completo su tuodominio.it/gestionale. Licenza annuale tutto incluso. Prova la demo gratis.",
  },
  {
    path: "/funzionalita",
    out: "funzionalita/index.html",
    title: "Funzionalità — Lucentia, gestionale su misura per parrucchieri ed estetisti",
    description: "Tutte le funzioni del gestionale Lucentia: agenda con operatori, cabine e servizi a fasi, scheda cliente, fidelity, pacchetti, buoni regalo, cassa e magazzino, statistiche, marketing WhatsApp, allergeni, eventi, prenotazioni online dal tuo sito. Con le anteprime reali dell'app.",
    ogTitle: "Funzionalità di Lucentia — tutto quello che fa il tuo gestionale",
    ogDescription: "Agenda intelligente, clienti, fidelity, pacchetti, cassa e magazzino, statistiche, marketing, eventi e prenotazioni online dal tuo sito. Guarda le anteprime dell'app.",
  },
  {
    path: "/come-funziona",
    out: "come-funziona/index.html",
    title: "Come funziona — Lucentia, dalla demo al tuo dominio in 3 passi",
    description: "Come nasce un progetto Lucentia: provi la demo gratuita per 10 giorni, progettiamo insieme sito e gestionale su misura, vai online con il tuo dominio. Cosa personalizziamo, come funzionano aggiornamenti e assistenza, domande frequenti.",
    ogTitle: "Come funziona Lucentia — dalla demo al tuo dominio",
    ogDescription: "Tre passi: demo gratuita, progettazione su misura di sito e gestionale, online con il tuo dominio. Aggiornamenti e assistenza inclusi.",
  },
  {
    path: "/licenza",
    out: "licenza/index.html",
    title: "Licenza annuale — Lucentia, sito e gestionale tutto incluso",
    description: "La licenza annuale Lucentia comprende dominio, hosting su Cloudflare, sito vetrina, gestionale, aggiornamenti e assistenza. Moduli e integrazioni attivabili in qualsiasi momento. Prezzo su preventivo, in base ai moduli e alle personalizzazioni.",
    ogTitle: "Licenza annuale Lucentia — tutto incluso, su preventivo",
    ogDescription: "Dominio, hosting, sito, gestionale, aggiornamenti e assistenza in un solo canone annuale. Moduli e integrazioni attivabili quando vuoi. Richiedi un preventivo.",
  },
];

// Vecchi percorsi che continuano a funzionare puntando alla pagina nuova.
const ALIAS = { "/piani": "/licenza", "/prezzi": "/licenza" };

// Normalizza un percorso del browser su una delle rotte conosciute.
// Qualunque percorso non riconosciuto ricade sulla home.
export function normalizePath(p) {
  let s = String(p || "/").split("?")[0].split("#")[0].toLowerCase();
  if (s.length > 1) s = s.replace(/\/+$/, "");
  if (!s.startsWith("/")) s = "/" + s;
  if (ALIAS[s]) s = ALIAS[s];
  return ROTTE.some((r) => r.path === s) ? s : "/";
}

export function rottaDi(path) {
  const p = normalizePath(path);
  return ROTTE.find((r) => r.path === p) || ROTTE[0];
}
