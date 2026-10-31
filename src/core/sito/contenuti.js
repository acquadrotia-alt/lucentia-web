// ============================================================================
// Contenuti e metadati del sito del salone, condivisi fra il browser
// (SitoSalone.jsx) e il server (server/cliente/seo.js): le pagine, i titoli e
// le descrizioni per i motori di ricerca, i testi delle pagine legali.
// JavaScript puro, senza JSX e senza dipendenze.
// ============================================================================

// Raggruppa i servizi per categoria (se almeno uno ce l'ha), nell'ordine in
// cui le categorie compaiono nel listino; quelli senza finiscono in fondo.
export function gruppiServizi(services) {
  const lista = Array.isArray(services) ? services : [];
  if (!lista.some((s) => s && s.categoria)) return [{ nome: null, items: lista }];
  const ordine = []; const mappa = new Map();
  for (const s of lista) { const k = (s.categoria || "").trim() || "Altri servizi"; if (!mappa.has(k)) { mappa.set(k, []); ordine.push(k); } mappa.get(k).push(s); }
  if (ordine.includes("Altri servizi")) { ordine.splice(ordine.indexOf("Altri servizi"), 1); ordine.push("Altri servizi"); }
  return ordine.map((k) => ({ nome: k, items: mappa.get(k) }));
}

export const PAGINE_SITO = [
  { path: "/", nome: "Home", priorita: "1.0" },
  { path: "/servizi", nome: "Servizi", priorita: "0.9" },
  { path: "/team", nome: "Il team", priorita: "0.6" },
  { path: "/eventi", nome: "Eventi", priorita: "0.6" },
  { path: "/prodotti", nome: "Prodotti", priorita: "0.5" },
  { path: "/contatti", nome: "Contatti", priorita: "0.8" },
  { path: "/prenota", nome: "Prenota online", priorita: "0.9" },
  { path: "/privacy", nome: "Privacy", priorita: "0.2" },
  { path: "/cookie", nome: "Cookie", priorita: "0.2" },
  { path: "/note-legali", nome: "Note legali", priorita: "0.2" },
];

const taglia = (s, n) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t; };
const eur = (n) => "€ " + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",").replace(",00", "");

// Titolo e descrizione di ogni pagina, costruiti dai contenuti del salone.
export function metaPagina(path, { brand = {}, sito = {}, listino = [], eventi = [] } = {}) {
  const nome = brand.brandName || brand.nome || "Il salone";
  const dove = brand.address ? ` a ${String(brand.address).split(",").pop().replace(/\d{5}/, "").trim()}` : "";
  const tagline = brand.tagline ? ` — ${brand.tagline}` : "";
  const base = taglia(sito.descrizione || `${nome}${tagline}${dove}.`, 160);
  const categorie = [...new Set(listino.map((s) => s.categoria).filter(Boolean))];
  const p = String(path || "/").replace(/\/+$/, "") || "/";
  switch (p) {
    case "/servizi": return { title: `Servizi e listino prezzi · ${nome}`, description: taglia(`Tutti i trattamenti di ${nome}${dove} con durata e prezzo${categorie.length ? ": " + categorie.join(", ") : ""}.`, 160) };
    case "/team": return { title: `Il team · ${nome}`, description: taglia(`Le persone che lavorano da ${nome}${dove}: ruoli, specializzazioni e trattamenti di cui si occupano.`, 160) };
    case "/eventi": return { title: `Eventi · ${nome}`, description: taglia(eventi.length ? `Prossimi eventi da ${nome}: ${eventi.slice(0, 3).map((e) => e.titolo).join(", ")}.` : `Serate, corsi e open day di ${nome}${dove}.`, 160) };
    case "/prodotti": return { title: `Prodotti · ${nome}`, description: taglia(`I prodotti in vendita da ${nome}${dove}.`, 160) };
    case "/contatti": return { title: `Contatti e orari · ${nome}`, description: taglia(`Orari di apertura, indirizzo, telefono e social di ${nome}${dove}.`, 160) };
    case "/prenota": return { title: `Prenota online · ${nome}`, description: taglia(`Prenota il tuo appuntamento da ${nome}${dove}: scegli trattamento, operatore e orario, conferma immediata.`, 160) };
    case "/privacy": return { title: `Informativa sulla privacy · ${nome}`, description: `Come ${nome} tratta i dati personali di clienti e visitatori.`, noindex: true };
    case "/cookie": return { title: `Cookie · ${nome}`, description: `I cookie usati dal sito di ${nome}.`, noindex: true };
    case "/note-legali": return { title: `Note legali · ${nome}`, description: `Dati societari e note legali di ${nome}.`, noindex: true };
    default: return { title: `${nome}${tagline}${brand.tagline ? "" : dove}`, description: base };
  }
}

// Dati strutturati schema.org per l'attività (BeautySalon / HairSalon).
export function datiStrutturati({ brand = {}, sito = {}, listino = [], staff = [], url = "", tipo = "BeautySalon", immagine = null }) {
  const nome = brand.brandName || brand.nome || "";
  const legale = sito.legale || {};
  const out = {
    "@context": "https://schema.org",
    "@type": tipo,
    name: nome,
    url: url || undefined,
    image: immagine || undefined,
    telephone: brand.phone ? String(brand.phone) : undefined,
    email: brand.email || undefined,
    description: sito.descrizione || undefined,
    address: brand.address ? { "@type": "PostalAddress", streetAddress: brand.address } : undefined,
    sameAs: [sito.instagram ? (sito.instagram.startsWith("http") ? sito.instagram : `https://instagram.com/${sito.instagram.replace(/^@/, "")}`) : null, sito.facebook ? (sito.facebook.startsWith("http") ? sito.facebook : `https://facebook.com/${sito.facebook}`) : null].filter(Boolean),
    openingHours: sito.orari ? String(sito.orari).split("\n").map((r) => r.trim()).filter(Boolean) : undefined,
    priceRange: listino.length ? (() => { const p = listino.map((s) => s.price).filter((x) => x != null); return p.length ? `${eur(Math.min(...p))} - ${eur(Math.max(...p))}` : undefined; })() : undefined,
    employee: staff.length ? staff.map((s) => ({ "@type": "Person", name: s.name, jobTitle: s.role || undefined })) : undefined,
    hasOfferCatalog: listino.length ? {
      "@type": "OfferCatalog", name: "Listino servizi",
      itemListElement: listino.slice(0, 100).map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.name, category: s.categoria || undefined }, price: s.price != null ? String(s.price) : undefined, priceCurrency: s.price != null ? "EUR" : undefined })),
    } : undefined,
    legalName: legale.ragioneSociale || undefined,
    vatID: legale.piva ? `IT${String(legale.piva).replace(/^IT/i, "")}` : undefined,
  };
  if (!out.sameAs.length) delete out.sameAs;
  return JSON.parse(JSON.stringify(out)); // toglie gli undefined
}

// ---- Testi legali ------------------------------------------------------------
// Blocchi { h, p, lista } resi dalla pagina. Dove manca un dato compare
// un segnaposto evidente, così si vede subito cosa completare dal gestionale.
const manca = (v, cosa) => (v && String(v).trim() ? String(v).trim() : `[${cosa}: da inserire in Impostazioni → Sito e prenotazioni → Dati legali]`);

export function testoPrivacy(brand = {}, legale = {}, { prenota = true } = {}) {
  const nome = brand.brandName || brand.nome || "il salone";
  const titolare = manca(legale.ragioneSociale, "ragione sociale");
  const sede = manca(legale.sede || brand.address, "sede legale");
  const email = manca(legale.emailPrivacy || brand.email, "email per la privacy");
  return [
    { h: "Titolare del trattamento", p: [`Il titolare del trattamento è ${titolare}, con sede in ${sede}${legale.piva ? `, P.IVA ${legale.piva}` : ""}. Per qualsiasi richiesta relativa ai dati personali puoi scrivere a ${email}${legale.pec ? ` oppure, via PEC, a ${legale.pec}` : ""}.`] },
    { h: "Quali dati trattiamo e perché", p: [`Questo sito non richiede registrazione e non traccia la navigazione. I dati personali vengono raccolti solo quando li fornisci tu:`], lista: [
      ...(prenota ? [`Prenotazione online: nome e cognome, numero di telefono, eventuale email e note che scegli di lasciare. Servono a registrare l'appuntamento, a riconoscerti alle visite successive e a contattarti in caso di necessità sull'appuntamento stesso. Base giuridica: esecuzione del contratto e delle misure precontrattuali da te richieste (art. 6, par. 1, lett. b, GDPR).`] : []),
      `Contatti diretti (telefono, WhatsApp, email, social): i dati che ci comunichi vengono usati solo per risponderti. Base giuridica: legittimo interesse a rispondere alle richieste (art. 6, par. 1, lett. f, GDPR).`,
      `Dati tecnici di connessione (indirizzo IP, richieste al server): trattati dal fornitore di hosting per erogare il sito e garantirne la sicurezza, in forma aggregata e per il tempo strettamente necessario.`,
    ] },
    { h: "Scheda cliente in salone", p: [`Quando diventi cliente, ${nome} conserva nel proprio gestionale una scheda con i tuoi dati di contatto, lo storico degli appuntamenti e, solo se li comunichi tu e previo tuo consenso esplicito, eventuali informazioni utili alla sicurezza dei trattamenti (allergie, sensibilità). Queste ultime sono dati particolari ai sensi dell'art. 9 GDPR e vengono trattate esclusivamente per tutelare la tua salute durante i trattamenti.`] },
    { h: "Dove sono i dati e chi li vede", p: [`I dati sono conservati in un database dedicato esclusivamente a ${nome}, ospitato sull'infrastruttura di Cloudflare, Inc. (hosting e sicurezza), che agisce come responsabile del trattamento. Il software gestionale è fornito da Lucentia, che accede ai dati solo per assistenza tecnica su richiesta del titolare. I dati non vengono venduti, ceduti né usati per profilazione.`] },
    { h: "Per quanto tempo", p: [`I dati delle prenotazioni e della scheda cliente sono conservati finché resti cliente e comunque non oltre 10 anni dall'ultimo appuntamento, salvo obblighi di legge. Puoi chiederne la cancellazione in qualsiasi momento.`] },
    { h: "I tuoi diritti", p: [`Puoi chiedere in ogni momento l'accesso ai tuoi dati, la rettifica, la cancellazione, la limitazione del trattamento, la portabilità e opporti al trattamento (artt. 15-22 GDPR), scrivendo a ${email}. Hai inoltre il diritto di proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).`] },
    { h: "Minori", p: [`Il servizio di prenotazione online è riservato a persone maggiorenni. I minori possono prenotare tramite un genitore o chi ne fa le veci.`] },
    { h: "Aggiornamenti", p: [`Questa informativa può essere aggiornata: la versione in vigore è sempre quella pubblicata su questa pagina.`] },
  ];
}

export function testoCookie(brand = {}, legale = {}) {
  const nome = brand.brandName || brand.nome || "il salone";
  return [
    { h: "Nessun cookie di profilazione", p: [`Il sito pubblico di ${nome} non usa cookie di profilazione, non ospita pubblicità e non include strumenti di analisi che tracciano i visitatori. Per questo non ti viene chiesto alcun consenso all'apertura del sito.`] },
    { h: "Cookie tecnici", p: [`L'unico cookie utilizzato si chiama "sid" ed è impostato soltanto quando il personale del salone accede all'area riservata (/gestionale): serve a mantenere la sessione di lavoro ed è un cookie tecnico, esente da consenso ai sensi dell'art. 122 del Codice privacy. Scade dopo 30 giorni o alla disconnessione.`] },
    { h: "Memoria del browser", p: [`La pagina di prenotazione può salvare nel tuo browser, solo sul tuo dispositivo, preferenze di visualizzazione. Non vengono inviate a nessuno e puoi cancellarle dalle impostazioni del browser.`] },
    { h: "Servizi di terze parti", p: [`I caratteri tipografici sono forniti da fonts.bunny.net, un servizio che non registra né conserva gli indirizzi IP dei visitatori. I collegamenti a Google Maps, Instagram, Facebook e WhatsApp portano ai rispettivi servizi, che applicano le proprie informative.`] },
    { h: "Titolare", p: [`${manca(legale.ragioneSociale, "ragione sociale")} — per informazioni: ${manca(legale.emailPrivacy || brand.email, "email")}.`] },
  ];
}

export function testoNoteLegali(brand = {}, legale = {}) {
  const nome = brand.brandName || brand.nome || "il salone";
  return [
    { h: "Dati dell'attività", lista: [
      `Denominazione: ${manca(legale.ragioneSociale, "ragione sociale")}`,
      `Insegna: ${nome}`,
      `Sede: ${manca(legale.sede || brand.address, "sede legale")}`,
      `Partita IVA: ${manca(legale.piva, "partita IVA")}`,
      ...(legale.codiceFiscale && legale.codiceFiscale !== legale.piva ? [`Codice fiscale: ${legale.codiceFiscale}`] : []),
      ...(legale.rea ? [`REA: ${legale.rea}`] : []),
      `Email: ${manca(legale.emailPrivacy || brand.email, "email")}`,
      ...(legale.pec ? [`PEC: ${legale.pec}`] : []),
      ...(brand.phone ? [`Telefono: ${brand.phone}`] : []),
    ] },
    { h: "Contenuti", p: [`Prezzi, durate e descrizioni dei trattamenti pubblicati su questo sito sono indicativi e possono variare in base alle esigenze della cliente: il preventivo definitivo viene sempre confermato in salone. Le immagini, i testi e il logo sono di proprietà di ${nome} o concessi in licenza e non possono essere riprodotti senza autorizzazione.`] },
    { h: "Sito e gestionale", p: [`Il sito e il gestionale sono realizzati con Lucentia (lucentia-app.com) e ospitati su Cloudflare.`] },
  ];
}
