import { useCallback, useEffect, useState } from "react";
import { SiteCtx, SiteHeader, SiteFooter, LeadModal } from "./ui.jsx";
import { normalizePath, rottaDi, SITO } from "./rotte.js";
import HomePage from "./HomePage.jsx";
import FunzionalitaPage from "./FunzionalitaPage.jsx";
import PianiPage from "./PianiPage.jsx";

const PAGINE = { "/": HomePage, "/funzionalita": FunzionalitaPage, "/piani": PianiPage };

// Scorre fino all'ancora richiesta, riprovando finché la nuova pagina non
// ha finito di montare l'elemento.
function scrollAdAncora(id, tries = 0) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (tries < 12) setTimeout(() => scrollAdAncora(id, tries + 1), 50);
}

// Aggiorna titolo, meta description e canonical quando si cambia pagina:
// l'HTML statico li ha già corretti, questo serve alla navigazione client.
function applicaMeta(path) {
  if (typeof document === "undefined") return;
  const r = rottaDi(path);
  document.title = r.title;
  const setMeta = (sel, attr, val) => { const el = document.head.querySelector(sel); if (el) el.setAttribute(attr, val); };
  setMeta('meta[name="description"]', "content", r.description);
  setMeta('link[rel="canonical"]', "href", SITO + (r.path === "/" ? "/" : r.path));
  setMeta('meta[property="og:url"]', "content", SITO + (r.path === "/" ? "/" : r.path));
  setMeta('meta[property="og:title"]', "content", r.ogTitle);
  setMeta('meta[property="og:description"]', "content", r.ogDescription);
  setMeta('meta[name="twitter:title"]', "content", r.ogTitle);
  setMeta('meta[name="twitter:description"]', "content", r.ogDescription);
}

// Sito pubblico (visitatori non autenticati): home, funzionalità e piani sono
// tre pagine reali con URL proprio, servite come HTML statico dal build e
// navigate senza ricaricare grazie alla History API.
export default function Site({ onLogin, initialPath }) {
  const [path, setPath] = useState(() => normalizePath(initialPath != null ? initialPath : (typeof window !== "undefined" ? window.location.pathname : "/")));
  const [lead, setLead] = useState(null);

  const go = useCallback((to) => {
    const raw = String(to || "/");
    const hash = raw.includes("#") ? raw.slice(raw.indexOf("#") + 1) : "";
    const dest = normalizePath(raw);
    if (typeof window !== "undefined") {
      const url = dest + (hash ? "#" + hash : "");
      if (window.location.pathname + window.location.hash !== url) window.history.pushState(null, "", url);
    }
    setPath((prev) => {
      if (prev !== dest) applicaMeta(dest);
      return dest;
    });
    if (hash) scrollAdAncora(hash);
    else if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  // Pulsanti avanti/indietro del browser.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const dest = normalizePath(window.location.pathname);
      setPath(dest);
      applicaMeta(dest);
      const h = (window.location.hash || "").replace("#", "");
      if (h && h !== "login" && h !== "accedi") scrollAdAncora(h);
      else window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // All'apertura diretta di un URL con ancora (es. /#contatti).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = (window.location.hash || "").replace("#", "");
    if (h && h !== "login" && h !== "accedi") scrollAdAncora(h);
  }, []);

  const Pagina = PAGINE[path] || HomePage;
  const ctx = { path, go, onLogin, openLead: setLead };

  return (
    <SiteCtx.Provider value={ctx}>
      <div className="min-h-screen bg-white text-stone-800">
        <SiteHeader />
        <main>
          <Pagina />
        </main>
        <SiteFooter />
        {lead ? <LeadModal kind={lead.kind} piano={lead.piano} onClose={() => setLead(null)} onLogin={onLogin} /> : null}
      </div>
    </SiteCtx.Provider>
  );
}

