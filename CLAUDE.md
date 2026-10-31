# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Lucentia is a management app ("gestionale") for hair salons and beauty studios, in Italian. The codebase, UI strings, comments, and docs are all in Italian — keep new user-facing text in Italian to match.

**One codebase, two modes**, selected by the `MODALITA` environment variable of the Cloudflare Pages project (`modalita(env)` in `server/core/util.js`, `__MODALITA__` define at build time):

- **`hub`** (default, lucentia-app.com): the product's marketing site (`src/site/`), the public 10-day demo, and the admin panel (`src/hub/PannelloHub.jsx`) where the single administrator manages **installazioni** (real customers), requests/demos and "saloni di prova" hosted on the portal itself.
- **`cliente`** (one deployment per customer, on the customer's own domain, own D1): the salon's public website (`src/core/sito/SitoSalone.jsx`, content from `GET /api/sito`) as separate pages `/`, `/servizi`, `/team`, `/eventi`, `/prodotti`, `/contatti`, `/privacy`, `/cookie`, `/note-legali` (route table `PAGINE_SITO` in `src/core/sito/contenuti.js`, pure JS shared with the server), the gestionale on **`/gestionale`**, online booking on `/prenota` (`?servizio=ID` preselects), event pages on `/evento/:id`. The licence and the active modules come from the hub (see "Installation licence" below). When the licence is not active, the whole domain shows the `Manutenzione` page with the salon's logo and colours.

This repository is the **ceppo** (upstream). Every customer has its own GitHub repository cloned from it (`scripts/nuova-installazione.sh`) and merges core updates with `git merge upstream/main`. Customer-specific code lives **only** in `src/cliente/` (frontend: `moduli.js`, `index.jsx` → `ESTENSIONI`) and `server/cliente/rotte.js` (API under `/api/cliente/*`); the ceppo never edits those files. Anything useful to more than one customer belongs in the core behind a module flag. There are no resellers any more; billing is handled outside the software (only the expiry date is recorded).

## Commands

```bash
npm install        # install deps
npm run dev        # Vite dev server (frontend only — see note below)
npm run build      # production build to dist/
npm run preview    # preview the production build
npm test           # Node test runner over test/*.test.mjs
```

There is no linter or type checker configured. `npm test` runs Node's built-in runner over `test/*.test.mjs` (no dependencies): the online-availability algorithms, the resource model, the public booking API, the hub's installations API and the client-mode licence sync (`test/installazioni.test.mjs`, `test/licenza-cliente.test.mjs`, both with an in-memory fake D1 that matches SQL prefixes — keep the SQL text of core queries stable or update the fakes). `npm run dev` serves only the React frontend; the `/api/*` routes are Cloudflare Pages Functions and do **not** run under plain Vite. To exercise the API + D1 locally you need the Cloudflare adapter (e.g. `wrangler pages dev`) with a D1 binding named `DB`; otherwise develop the frontend against the deployed API.

## Architecture

### Two halves
- **Frontend** — `src/`, a Vite + React 18 SPA styled with Tailwind (PostCSS) and `lucide-react` icons. `src/App.jsx` is the entry: it calls `GET /api/installazione` (public: which mode, salon brand, licence state) and `GET /api/me` in parallel, then renders the portal flow or `AppCliente` (path-based: `/gestionale*`, `/prenota`, `/evento/:id`, else the salon site).
- **Backend** — Cloudflare Pages Functions. `functions/api/[[path]].js` is a two-line entry that re-exports `onRequest` from `server/router.js` (files inside `functions/` become routes, so the code lives outside). `server/core/*` is shared by both modes (util, sessione, pubbliche = prenota/evento, salone = me/online-bookings/operatori/data, disponibilita = the three online modes, demo), `server/hub/*` is portal-only (installazioni + `/api/licenze/verifica`, saloni, richieste/demo, setup), `server/cliente/*` is installation-only (licenza, installazione = `/api/installazione` + `/api/sito` + setup, rotte = custom hook). Keep the flat `if (segs[0] === ...)` style inside each module. It binds to D1 as `env.DB` and reads `env.SETUP_TOKEN`.

### Roles and routing
The `GET /api/me` response's role decides what renders:
- `reseller` → the administrator (the DB role name is kept for compatibility; `isAdmin(sess)`) → `PannelloHub.jsx` (hub only)
- `operatore` → `OperatorApp.jsx` (read-only, single-staff agenda view)
- `azienda` → `SalonApp.jsx` (the full salon app; `modalita` prop = `hub` | `cliente`)

Unauthenticated users see the public site (hub: `src/site/`; cliente: `SitoSalone`) unless they are on `#login` (hub) or `/gestionale` (cliente). Licence status gates access: expired/suspended salons get `Blocked`, expired demos `DemoExpired`, a client installation with a non-active licence gets `Manutenzione` on every path.

### Installation licence (cliente mode) — `server/cliente/licenza.js`
Env vars of a customer deployment: `MODALITA=cliente`, `HUB_URL`, `INSTALLAZIONE_ID`, `INSTALLAZIONE_CHIAVE`, `SETUP_TOKEN`. On each request `aggiornaLicenza()` (memoised 10 min per isolate, cached 6 h in the `licenza_locale` table) POSTs id+key, version, hostname and the custom modules declared in `src/cliente/moduli.js` to `HUB_URL/api/licenze/verifica`; the response (stato, scadenza, moduli) is **written into the salon's `aziende` row**, so `licStatus(az)` / `parseModuli(az.moduli)` keep working unchanged everywhere. Hub unreachable → last good answer is valid for 7 days, then `non_verificata`; hub answers 401/404 → `rifiutata` immediately. `statoDi(az)` in the router abstracts this: core routes (`prenota`, `evento`, `me`, `data`) must call it instead of `licStatus` directly. Without `HUB_URL` the local row is authoritative (dev/emergency). The hub stores only the SHA-256 of the key (`installazioni.chiave_hash`); the key is shown once on creation/regeneration in the panel.

Module keys for an installation are the core `MODULI` plus whatever that installation declared (`moduli_disponibili`); `cleanModuliInstallazione` enforces that. In the salon app `useMods().has(key)` reads any key; `ESTENSIONI.viste`/`impostazioni` entries can carry `modulo` to be gated.

### Salon website SEO and legal (cliente mode)
`functions/_middleware.js` runs on every request; on the hub it only calls `next()`. On an installation, for GET requests to a site page it loads brand/sito/listino/staff/eventi from D1 (`datiSeo` in `server/cliente/seo.js`) and rewrites the static `index.html` with string replacements (no HTMLRewriter, so it is unit-testable): `<title>`, description, robots, canonical, Open Graph, `theme-color`, favicon, a schema.org `BeautySalon` JSON-LD (home, servizi, contatti) and a plain-HTML summary of the page inside `#root` that React replaces on hydration. It also serves `/sitemap.xml` and `/robots.txt` from the database and marks everything `noindex` when the licence is not active. Never import JSX/React into `server/` — the worker bundle must stay free of React (`contenuti.js` is the shared pure module: `metaPagina`, `datiStrutturati`, `gruppiServizi`, legal texts).

Legal: online booking requires `privacy: true` in `POST /api/prenota` (400 otherwise; the fakes in tests send it). The Privacy/Cookie/Note legali pages are generated from `config.sito.legale` (ragioneSociale, piva, codiceFiscale, sede, emailPrivacy, pec, rea — edited in Impostazioni → Sito e prenotazioni → Dati legali); missing fields render a visible "da inserire" placeholder. `config.sito` also holds `logoEsteso`, `favicon` (always ask the customer for one), `fotoChiSiamo`, `titoloHome`, `ogImage`. Fonts load from fonts.bunny.net (GDPR-friendly), never from Google.

`ESTENSIONI.tema` (`src/cliente/index.jsx`) supports `primary`, `accento`, `secondario`, `sfondoAlternato`, `fontTitoli`, `fontTesto`; services may carry `categoria`, which groups the listino on the site and in the booking page.

### Public site (`src/site/`)
The marketing site is three real pages, not one long scroll:

- `/` → `HomePage.jsx` — hero, cos'è, one app preview, a taste of features, why-Lucentia, plan summary, and the `#contatti` section (contacts live only here; the nav links to `/#contatti`).
- `/funzionalita` → `FunzionalitaPage.jsx` — the full feature list, the app previews and the deep-dive rows.
- `/come-funziona` → the path from demo to the customer's own domain.
- `/licenza` → what the annual licence includes, the modules, the FAQ. **No prices anywhere on the site**: the offer is "su preventivo" (annual all-inclusive licence: domain, Cloudflare hosting, site, gestionale, updates, support). `/piani` is a legacy alias normalised to `/licenza`.

Supporting files: `Site.jsx` (shell + History-API router + `<head>` updates), `ui.jsx` (shared `SiteCtx`, `Reveal`, `SiteLink`, header, footer, contacts, lead modal), `dati.js` (all copy: features, deep dives, plans, modules, comparison rows, FAQ) and `rotte.js` (the route table with per-page title/description/OG — the single source of truth shared with the build).

Module content in `dati.js` must stay in sync with the module toggles in `PannelloHub.jsx` (`OPT`, `OPER`) and the module keys in the API (`MODULI`).

`npm run build` runs `scripts/prerender.mjs`, which in hub mode renders each route in `rotte.js` to its own static file (`dist/index.html`, `dist/funzionalita/index.html`, …) and in cliente mode (`MODALITA=cliente` at build) only writes neutral shell pages for `/`, `/gestionale` and `/prenota` (salon content lives in D1) with its own title, description, canonical and Open Graph tags, so crawlers and link previews see real per-page content. Because of that, `vite.config.js` uses `base: "/"` (absolute asset URLs) — do not switch it back to `"./"`, it would break the pages served from a subdirectory. New public pages need an entry in `rotte.js`, a component in `PAGINE` (`Site.jsx`) and a `<url>` in `public/sitemap.xml`.

### Auth & session model
Email + password login. Passwords are hashed with PBKDF2 (SHA-256, 100k iterations) via WebCrypto — see `hashPassword`/`verifyPassword` in `server/core/util.js`. Sessions are random tokens stored in the `sessioni` table and carried in an HttpOnly `sid` cookie (30-day expiry). Every API call past the public routes (`health`, `installazione`, `setup`, `login`, `logout`, `prenota`, `evento`; hub: `richiesta`, `demo`, `licenze/verifica`; cliente: `sito`) requires a valid session resolved by `getSession`. `/api/cliente/*` (custom routes) receives the session, possibly null, and decides by itself.

### Multi-tenancy & authorization (critical)
Tenant isolation is enforced **server-side**, never trust the client:
- Salon data is scoped by `azienda_id` on every query.
- `/api/installazioni`, `/api/aziende` and `/api/richieste` are admin-only (`isAdmin(sess)`), hub mode only.
- `operatore` users are restricted server-side to GET-only, and `bookings` are filtered to their own `staff_id`.
- Deleting a salon cascades to its `utenti`, `sessioni`, and `dati_app`; deleting a reseller reassigns its salons to the master (`reseller_id = NULL`).
- `POST /api/aziende/:id/svuota` ("Svuota dati" in `PannelloHub.jsx`, saloni di prova) resets a salon to an empty licence: it overwrites all seven `dati_app` collections with the blanks from `saloneVuoto()`, drops `prenotazioni_online`, the `operatore` users and every open session for that salon, and leaves the licence, the salon login and `licenze_eventi` untouched. It must **write** empty blobs rather than delete the rows — `SalonApp` re-seeds sample data when `config`/`bookings`/`clients`/`sales` all come back `null`.

### Salon data storage (the `dati_app` pattern)
The salon app does **not** have a normalized schema. All salon content is seven JSON blobs ("collezioni") stored as rows in `dati_app`, keyed `${azienda_id}:${collezione}`:

`config`, `bookings`, `clients`, `catalog`, `sales`, `vouchers`, `eventi` (see `COLLEZIONI` in the API).

`eventi` are salon events (courses, open days…) that occupy one or more operators (their time slots become unavailable, both in-app and for online booking). Each event has a public shareable page at `/?evento=<azienda_id>:<evento_id>` (`EventoPage.jsx`, public API `/api/evento/:aid/:eid`). The booking link `/?prenota=<azienda_id>` is a mini-site (`BookingPage.jsx`) with booking, upcoming events and custom content configured in `config.sito` (Impostazioni → "Il tuo mini-sito").

#### Resource model (`src/orari.js`)
A service is no longer "a duration on one operator": it is a **sequence of resource commitments** (`service.impegni`), which is how colour processing time, multi-operator services and cabins are all expressed:

```
Colore    { tipo:"operatore", posto:1, da:0,   durata:10 }   // applicazione
          { tipo:"operatore", posto:1, da:50,  durata:40 }   // fra i due l'operatore è libero
Lampada   { tipo:"cabina", cabinaId:"cab-lampada", da:0, durata:60 }   // nessun operatore
Spa       posto 1 0→60, posto 2 170→180, cabina spa 0→180
```

`posto` is an operator slot: same number = same person, different numbers = **different** people (assignment is always automatic, first eligible in `config.staff` order, with role swapping when the first combination doesn't fit).

**Who may perform what is declared by the service, not by the operator.** An operator carries only their working hours (plus name, role, photo, default cabin). Eligibility resolves in this order, in `operatoriAbilitati()`: the phase's own `operatori` list → the service's `operatori` list → the legacy `staff.serviceIds` link. That last step is what keeps already-configured salons working untouched; the moment a service declares its own list, that list wins. A mixed service can therefore give each phase a different set of operators (the first 40 minutes to whoever can cut, the last 30 to whoever can colour), which `posto` alone could not express. Cabins live in `config.cabine` (own `availability`/`off`, empty availability = follows the salon, `quantita` = how many rooms of that type exist, default 1) and are not gated by a module. With `quantita > 1` availability is decided by the **peak** of overlapping commitments, not by "busy or free" (`capacitaRisorsa` / `puntaOccupazione` in `src/orari.js`): the second sunbed is still bookable while the first is in use, and only what saturates every unit counts as occupied — including in the `ottimizzata` free-gap scan (`intervalliSaturi`). A cabin segment without `cabinaId` inherits the assigned operator's `staff.cabinaId`. In `ImpegniEditor` the summary bar draws operator rows in the brand colour and cabin rows in stone (same code as the agenda), the phase rows can be reordered (arrows, plus an "Ordina per orario" shortcut that leaves a full-span cabin last), and restricting a phase or the service to operators who all share the same `staff.cabinaId` drops that cabin into the sequence when it has none — a simple service without `impegni` only gets the offer, since accepting it turns the service into a sequence that now needs a free room.

**Backwards compatibility is load-bearing**: a service without `impegni` means one operator for the whole `durationMin`, and a booking without `impegni` means `staffId` busy from `startMin` to `endMin`. Nothing needs migrating. Bookings keep `staffId` (the `posto 1` operator) and `startMin`/`endMin` (the overall span) as the primary view — ~110 places still read them — while the new `impegni` array is what conflict detection and availability use. Read it via `impegniBooking(b)`, never `b.staffId` alone, whenever you mean "what does this appointment occupy".

`src/orari.js` is imported by **both** `SalonApp.jsx` and the API — the slot logic used to be duplicated (`computeSlots` vs `computeStarts`) and with multiple resources the two would inevitably drift. `orariPossibili()` is the single entry point; `assegnaRisorse()` resolves operators and cabins for one candidate time. Manual booking, rescheduling and all three online modes go through it.

#### Online availability (three modes)
`config.onlineBooking.mode` picks how free slots are offered, and only affects online booking — manual bookings from the salon app are never filtered. All three live in `functions/api/[[path]].js` behind `computeStarts(config, bookingsAll, date, serviceId, leadMin, mode, staffFilter, opts)`:
- `antivuoto` (default) → `gapFreeStarts`: only the left edge of each free segment.
- `griglia` → `gridStarts`: every free 15-minute start.
- `ottimizzata` → `optimizedStarts`: candidates are the `griglia` ones **plus the edges of every resource's free gaps** (`modo: "ottimizzata"`) — without them a gap starting at 10:40 could never be filled exactly, since the fixed grid only offers 10:30 and 10:45. It goes through `orariPossibili`, where all the hard rules live — closures, working hours, staff holidays, lead time, overlaps), simulates each insertion and keeps only "clean" placements (`slotPulito`: flush against something on at least one side and leaving no gap shorter than the shortest online-bookable service). `valutaSlot` scores slots to rank fallbacks and to pick the best operator on a tied time. With several resources busy the verdict is that of the worst-placed one — a dead gap in a cabin counts as much as one in the diary. If a free segment has no clean placement its best-scoring ones are kept anyway, so no bookable space ever disappears.

Manual (in-salon) booking never goes through any of this: `NewBookingForm` in `SalonApp.jsx` calls `orariPossibili` directly, and its `sovrapponi` option (the "Consenti sovrapposizione" checkbox) also offers times that are already taken, so the front desk can deliberately double-book one operator. Such bookings are flagged `sovrapposto: true`. Online booking has no such escape hatch.

`opts` is only read by `ottimizzata`; `opts.servizionline` carries the online-bookable services and `opts.confirm` skips the quality filter. **The two write paths (create + move) must pass `confirm: true`**: the final check exists to prevent double-booking, and filtering there would reject bookings that are genuinely free.

`SalonApp.jsx` holds each as React state, loads them via `GET /api/data/:coll` on mount, and persists changes with a debounced `PUT /api/data/:coll` (`apiSaveDebounced`, 800ms). The server rejects writes when the license is inactive. **Demo tenants are read-only**: saving is skipped client-side (`demoRef`) and the demo is seeded server-side by `demoSeed()`.

### Feature gating ("moduli" / operators)
Each salon has a `moduli` JSON array on its `aziende` row controlling which features are on: `fidelity`, `vendite`, `statistiche`, `marketing`, `allergeni`, `pacchetti`, `online` (client self-booking; on portal salons `cleanModuli` strips it when there's no `op3`/`opinf`, on installations it is free), plus operator-limit flags `op3` (≤3) / `opinf` (unlimited; default 1), plus any custom key declared by the installation (`src/cliente/moduli.js`). A `null` moduli column means "legacy salon, everything on" (`parseModuli`). The limit is enforced both server-side (`maxOperatoriOf` blocks the `/api/operatori` create) and client-side (`has()` / `maxOperatori` in `SalonApp.jsx` near line 634 hides tabs). Old module keys are remapped via `OLD_MAP`. The legacy `prezzo_*`, `rivenditori` and `licenze_eventi` columns/tables are no longer used by the code (kept in `schema.sql` for existing databases).

## Database & deployment

- `schema.sql` is the full, idempotent (`CREATE TABLE IF NOT EXISTS`) schema — safe to re-run, and it must stay a superset of every `migrazione-*.sql` so a fresh database needs nothing else. The same schema is used by the hub and by every installation (`installazioni` is only filled on the hub, `licenza_locale` only on installations). Never name a migration-added column in a query without a fallback: a live database that skipped the migration then fails the whole request (this is what silently killed online availability — `prenotazioni_online.impegni` in `onlineBookingsOf`), so reads use `SELECT *` and writes go through `senzaColonnaImpegni`. The `migrazione-*.sql` files are incremental `ALTER TABLE` migrations added over time; re-running them throws harmless "duplicate column" errors. `LEGGIMI.md` (Italian) is the operator runbook for updating the live site and running these.
- Deployment is via Cloudflare Pages auto-building from GitHub (one project per installation). To redeploy, push a real commit — do **not** use "Retry deployment" (it replays the old commit). Env vars: hub `SETUP_TOKEN`; installation `MODALITA`, `HUB_URL`, `INSTALLAZIONE_ID`, `INSTALLAZIONE_CHIAVE`, `SETUP_TOKEN`.
- `public/setup.html` is the one-time bootstrap page gated by `SETUP_TOKEN`: on the hub it creates the administrator (refuses once one exists), on an installation it creates the salon (id = `INSTALLAZIONE_ID`) and the owner's login (refuses once a salon exists). `LEGGIMI.md` (Italian) is the operator runbook: portal setup, creating/updating/personalising an installation.

## Conventions

- Backend modules live in `server/` (see "Two halves"); each keeps the flat `if (segs[0] === ...)` routing style. Core queries' SQL text is matched by prefix in the test fakes.
- The salon app is split one file per view under `src/core/salone/`: `SalonApp.jsx` (shell + nav), `agenda.jsx`, `clienti.jsx`, `buoni.jsx`, `cassa.jsx`, `statistiche.jsx`, `marketing.jsx`, `impostazioni.jsx`, plus `comuni.jsx` (constants, helpers, defaults, `useMods`), `stampa.jsx` (receipts, PDF, cards, vouchers) and `backup.js`. Customer hooks (`ESTENSIONI` from `src/cliente/index.jsx`) are read in `SalonApp.jsx` (extra `viste`), `impostazioni.jsx` (extra sections; the "Sito e prenotazioni" section always exists in cliente mode), `clienti.jsx` (`schedaCliente`) and `agenda.jsx` (`dettaglioAppuntamento`). Never put customer-specific code in the core.
- `AgendaView` has two day layouts, switched by the Elenco/Studio toggle: the card list, and `VistaStudio`, a grid where **the columns are the resources and the rows the hours**. That distinction matters because with phased services a salon can have six clients at once on three operators — some in posa, some alone in a cabin — which a list cannot show. Inside Studio a second toggle picks which columns to show: Operatori, Cabine or Entrambi. An appointment appears in **every** column it occupies, so a phased service shows up as two blocks with the posa as the empty space between them; overlapping blocks in one column are packed into side-by-side lanes, which is also how the units of a cabin with `quantita > 1` are drawn (the header shows `×N`). The operator dropdown restricts the operator columns to that one person. Studio is day-only; switching to 3 giorni/Settimana falls back to the list.
- `DettaglioAppuntamento` is the timeline shown when an appointment is opened (both `ApptActions` and `OnlineApptModal`): one bar per resource involved, the minutes in which nobody is engaged spelled out ("In posa o in attesa"), then each service with its phases, times, durations and who is doing them. It reads the booking's saved `impegni` for the assignment and `impegniServizio()` for what the service prescribes, matching the two by interval — so a booking made before the resource model still renders as one block.
- `SettingsView` is split into sections driven by its `SEZIONI` array (Attività, Servizi, Operatori e cabine, Prenotazioni online / "Sito e prenotazioni" in cliente mode, customer extra sections, Dati e backup, Licenza), picked from a side menu — a left column from `lg` up, a horizontally scrollable strip below it. A new settings card belongs inside one of those sections; a section gated by a module (like `online` on the hub) is left out of `SEZIONI` entirely so no empty page can be opened. In cliente mode the Licenza section shows `LicenzaClienteCard` (hub-verified state, active modules, "Verifica ora").
- Italian naming throughout (`aziende`, `rivenditori`, `licenza`, `moduli`). New identifiers and UI copy should stay Italian.
