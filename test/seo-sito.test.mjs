// Il sito del salone per i motori di ricerca: titoli e descrizioni per pagina,
// dati strutturati, HTML statico iniettato nel file del build, sitemap e
// robots, il tutto attraverso il middleware in modalità cliente.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { onRequest as middleware } from "../functions/_middleware.js";
import { metaPagina, datiStrutturati, gruppiServizi, testoPrivacy } from "../src/core/sito/contenuti.js";
import { arricchisciHtml, sitemap, paginaDelSito } from "../server/cliente/seo.js";
import { azzeraMemo } from "../server/cliente/licenza.js";

const AID = "inst-1";
const brand = { nome: "Estetica Aura", brandName: "Estetica Aura", tagline: "Centro estetico", logo: "/cliente/logo.webp", primary: "#4A3A32", phone: "0321 123456", email: "info@aura.it", address: "Via Roma 12, 28047 Oleggio (NO)" };
const sito = { descrizione: "Viso, corpo e benessere.", orari: "Mar–Ven 9–19", instagram: "@aura", logoEsteso: "/cliente/logo-esteso.webp", favicon: "/cliente/favicon.png", legale: { ragioneSociale: "Estetica Aura di M. Rossi", piva: "01234567890" }, sezioni: [{ titolo: "Chi siamo", testo: "Tre professionisti." }] };
const listino = [{ id: "s1", name: "Pulizia viso", categoria: "Viso", price: 30, durationMin: 30 }, { id: "s2", name: "Manicure", categoria: "Mani", price: 20, durationMin: 30 }, { id: "s3", name: "Relax", price: 60, durationMin: 50 }];
const staff = [{ id: "a", name: "Clarissa", role: "Estetista" }];
const d = { brand, sito, listino, staff, eventi: [{ id: "e1", titolo: "Open day", date: "2030-06-12" }], prenota: true, stato: "active" };

test("ogni pagina ha titolo e descrizione propri, le legali sono noindex", () => {
  assert.equal(metaPagina("/", d).title, "Estetica Aura — Centro estetico");
  assert.match(metaPagina("/servizi", d).title, /^Servizi e listino prezzi · Estetica Aura$/);
  assert.match(metaPagina("/servizi", d).description, /Viso, Mani/);
  assert.match(metaPagina("/contatti", d).description, /Oleggio/);
  assert.equal(metaPagina("/privacy", d).noindex, true);
  assert.equal(metaPagina("/sconosciuta", d).title, metaPagina("/", d).title);
  assert.ok(metaPagina("/servizi", d).description.length <= 160);
});

test("i dati strutturati descrivono l'attività, gli orari e il listino", () => {
  const j = datiStrutturati({ ...d, url: "https://aura.test/" });
  assert.equal(j["@type"], "BeautySalon");
  assert.equal(j.name, "Estetica Aura");
  assert.deepEqual(j.openingHours, ["Mar–Ven 9–19"]);
  assert.equal(j.hasOfferCatalog.itemListElement.length, 3);
  assert.equal(j.vatID, "IT01234567890");
  assert.deepEqual(j.sameAs, ["https://instagram.com/aura"]);
  assert.equal(j.priceRange, "€ 20 - € 60");
  assert.ok(!("image" in j) || j.image, "niente chiavi vuote");
});

test("i servizi si raggruppano per categoria, quelli senza in fondo", () => {
  const g = gruppiServizi(listino);
  assert.deepEqual(g.map((x) => x.nome), ["Viso", "Mani", "Altri servizi"]);
  assert.deepEqual(gruppiServizi([{ id: "x", name: "Solo" }]), [{ nome: null, items: [{ id: "x", name: "Solo" }] }]);
});

test("l'informativa privacy segnala i dati legali mancanti", () => {
  const con = JSON.stringify(testoPrivacy(brand, sito.legale));
  assert.match(con, /Estetica Aura di M\. Rossi/);
  assert.doesNotMatch(con, /da inserire/);
  const senza = JSON.stringify(testoPrivacy(brand, {}));
  assert.match(senza, /ragione sociale: da inserire/);
});

const HTML = `<!doctype html><html lang="it"><head><meta charset="utf-8" /><title>Benvenuti</title><meta name="description" content="" /><meta name="theme-color" content="#1c1917" /></head><body><div id="root"></div><script src="/a.js"></script></body></html>`;

test("l'HTML del build viene completato con meta, Open Graph, JSON-LD e contenuti leggibili", () => {
  const out = arricchisciHtml(HTML, "/servizi", "https://aura.test", d);
  assert.match(out, /<title>Servizi e listino prezzi · Estetica Aura<\/title>/);
  assert.equal((out.match(/<title>/g) || []).length, 1, "un solo title");
  assert.match(out, /<link rel="canonical" href="https:\/\/aura\.test\/servizi" \/>/);
  assert.match(out, /og:image" content="https:\/\/aura\.test\/cliente\/logo-esteso\.webp"/);
  assert.match(out, /<link rel="icon" href="\/cliente\/favicon\.png" \/>/);
  assert.match(out, /application\/ld\+json/);
  assert.match(out, /<div id="root"><header>.*<h1>Servizi e listino prezzi di Estetica Aura<\/h1>.*Pulizia viso — 30 min — € 30.*<\/footer><\/div>/s);
  assert.match(out, /P\.IVA 01234567890/);
  assert.match(out, /theme-color" content="#4A3A32"/);
  // una pagina legale non va indicizzata e non porta JSON-LD
  const leg = arricchisciHtml(HTML, "/privacy", "https://aura.test", d);
  assert.match(leg, /noindex, follow/);
  assert.doesNotMatch(leg, /ld\+json/);
});

test("sitemap: solo le pagine che esistono davvero, più gli eventi", () => {
  const xml = sitemap("https://aura.test", d);
  assert.match(xml, /<loc>https:\/\/aura\.test\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/aura\.test\/servizi<\/loc>/);
  assert.match(xml, /<loc>https:\/\/aura\.test\/evento\/e1<\/loc>/);
  assert.doesNotMatch(xml, /prodotti/, "catalogo non pubblicato");
  assert.doesNotMatch(xml, /privacy/);
  const senzaOnline = sitemap("https://aura.test", { ...d, prenota: false, eventi: [] });
  assert.doesNotMatch(senzaOnline, /prenota|eventi/);
});

test("riconosce le pagine del sito", () => {
  assert.equal(paginaDelSito("/"), "/");
  assert.equal(paginaDelSito("/servizi/"), "/servizi");
  assert.equal(paginaDelSito("/evento/e1"), "/eventi");
  assert.equal(paginaDelSito("/gestionale"), null);
  assert.equal(paginaDelSito("/qualcosa"), null);
});

// ---- il middleware vero, con database e pagina statica simulati ----
function db(config) {
  const az = { id: AID, denominazione: "Estetica Aura", attiva: 1, licenza_scadenza: "2099-01-01", moduli: JSON.stringify(["online", "opinf"]), demo: 0 };
  return { prepare(sql) { let a = []; const self = { bind(...x) { a = x; return self; }, async first() { if (sql.startsWith("SELECT * FROM aziende")) return az; if (sql.includes("FROM dati_app")) return a[1] === "config" ? { dati: JSON.stringify(config) } : a[1] === "eventi" ? { dati: "[]" } : null; return null; }, async all() { return { results: [] }; }, async run() { return {}; } }; return self; } };
}
const config = { branding: { name: "Estetica Aura", primary: "#4A3A32", phone: "0321 1", address: "Oleggio" }, sito: { descrizione: "Viso e corpo.", legale: { ragioneSociale: "Aura srl", piva: "1" } }, services: listino, staff: [], onlineBooking: {} };
async function passa(path, env) {
  return await middleware({
    request: new Request("https://aura.test" + path),
    env: env || { DB: db(config), MODALITA: "cliente" },
    next: async () => new Response(HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
  });
}
beforeEach(() => azzeraMemo());

test("middleware: in modalità cliente le pagine HTML escono arricchite, le altre richieste passano", async () => {
  const home = await passa("/");
  assert.match(await home.text(), /<title>Estetica Aura a Oleggio<\/title>[\s\S]*<h1>Estetica Aura<\/h1>/);
  const servizi = await passa("/servizi");
  assert.match(await servizi.text(), /Pulizia viso — 30 min/);
  const js = await passa("/assets/app.js");
  assert.equal(await js.text(), HTML, "gli asset non si toccano");
  const api = await passa("/api/sito");
  assert.equal(await api.text(), HTML);
  const robots = await passa("/robots.txt");
  assert.match(await robots.text(), /Sitemap: https:\/\/aura\.test\/sitemap\.xml/);
  const sm = await passa("/sitemap.xml");
  assert.equal(sm.headers.get("Content-Type"), "application/xml; charset=utf-8");
  assert.match(await sm.text(), /<loc>https:\/\/aura\.test\/servizi<\/loc>/);
});

test("middleware: sul portale non interviene", async () => {
  const r = await passa("/servizi", { DB: db(config) });
  assert.equal(await r.text(), HTML);
});

test("middleware: in manutenzione le pagine diventano noindex e la sitemap è vuota", async () => {
  const dbSospeso = db(config); const orig = dbSospeso.prepare;
  dbSospeso.prepare = (sql) => { const s = orig(sql); if (sql.startsWith("SELECT * FROM aziende")) s.first = async () => ({ id: AID, denominazione: "X", attiva: 0, moduli: "[]" }); return s; };
  const r = await passa("/", { DB: dbSospeso, MODALITA: "cliente" });
  assert.match(await r.text(), /noindex/);
  const sm = await passa("/sitemap.xml", { DB: dbSospeso, MODALITA: "cliente" });
  assert.doesNotMatch(await sm.text(), /<loc>/);
});
