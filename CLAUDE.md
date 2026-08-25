# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Lucentia is a SaaS management app ("gestionale") for hair salons and beauty studios, in Italian. It's a multi-tenant React SPA with a Cloudflare Pages Functions backend and a Cloudflare D1 (SQLite) database. The codebase, UI strings, comments, and docs are all in Italian — keep new user-facing text in Italian to match.

The product is sold through resellers ("rivenditori"): a salon ("azienda") is a tenant that only ever sees its own data; resellers create salons and manage their licenses; a single master reseller (the first one created) can also create sub-resellers and see billing.

## Commands

```bash
npm install        # install deps
npm run dev        # Vite dev server (frontend only — see note below)
npm run build      # production build to dist/
npm run preview    # preview the production build
npm test           # Node test runner over test/*.test.mjs
```

There is no linter or type checker configured. `npm test` runs Node's built-in runner over `test/*.test.mjs` (no dependencies); it currently covers the online-availability algorithms only. `npm run dev` serves only the React frontend; the `/api/*` routes are Cloudflare Pages Functions and do **not** run under plain Vite. To exercise the API + D1 locally you need the Cloudflare adapter (e.g. `wrangler pages dev`) with a D1 binding named `DB`; otherwise develop the frontend against the deployed API.

## Architecture

### Two halves
- **Frontend** — `src/`, a Vite + React 18 SPA styled with Tailwind (loaded via CDN in `index.html`, not a build dependency) and `lucide-react` icons.
- **Backend** — `functions/api/[[path]].js` (~530 lines), a single Cloudflare Pages Function catch-all that implements the entire REST API under `/api/*`. All backend logic lives in this one file. It binds to D1 as `env.DB` and reads `env.SETUP_TOKEN`.

### Roles and routing
`src/App.jsx` is the entry/router. On load it calls `GET /api/me`; the response's role decides which top-level component renders:
- `reseller` → `ResellerPanel.jsx` (the `master` flag unlocks the Rivenditori + Fatturazione tabs)
- `operatore` → `OperatorApp.jsx` (read-only, single-staff agenda view)
- `azienda` → `SalonApp.jsx` (the full salon app)

Unauthenticated users see the public site (`src/site/`) unless `#login` is in the URL. License/demo status gates access: expired/suspended salons get a `Blocked` screen, expired demos get a `DemoExpired` contact screen — both still authenticate but can't reach the app.

### Public site (`src/site/`)
The marketing site is three real pages, not one long scroll:

- `/` → `HomePage.jsx` — hero, cos'è, one app preview, a taste of features, why-Lucentia, plan summary, and the `#contatti` section (contacts live only here; the nav links to `/#contatti`).
- `/funzionalita` → `FunzionalitaPage.jsx` — the full feature list, the app previews and the deep-dive rows. **This page must never mention prices, canoni or the € figures** — it links to `/piani` instead.
- `/piani` → `PianiPage.jsx` — plan cards, the Basic/Smart/Pro comparison table, every module explained, the operator tiers, the prenotazioni-online add-on and the pricing FAQ.

Supporting files: `Site.jsx` (shell + History-API router + `<head>` updates), `ui.jsx` (shared `SiteCtx`, `Reveal`, `SiteLink`, header, footer, contacts, lead modal), `dati.js` (all copy: features, deep dives, plans, modules, comparison rows, FAQ) and `rotte.js` (the route table with per-page title/description/OG — the single source of truth shared with the build).

Plan and module content in `dati.js` must stay in sync with the reseller presets in `ResellerPanel.jsx` (`PRESETS`, `OPT`) and the module keys in the API (`MODULI`).

`npm run build` runs `scripts/prerender.mjs`, which renders each route in `rotte.js` to its own static file (`dist/index.html`, `dist/funzionalita/index.html`, `dist/piani/index.html`) with its own title, description, canonical and Open Graph tags, so crawlers and link previews see real per-page content. Because of that, `vite.config.js` uses `base: "/"` (absolute asset URLs) — do not switch it back to `"./"`, it would break the pages served from a subdirectory. New public pages need an entry in `rotte.js`, a component in `PAGINE` (`Site.jsx`) and a `<url>` in `public/sitemap.xml`.

### Auth & session model
Email + password login. Passwords are hashed with PBKDF2 (SHA-256, 100k iterations) via WebCrypto — see `hashPassword`/`verifyPassword`. Sessions are random tokens stored in the `sessioni` table and carried in an HttpOnly `sid` cookie (30-day expiry). Every API call past the public routes (`health`, `setup`, `login`, `logout`, `richiesta`, `demo`) requires a valid session resolved by `getSession`.

### Multi-tenancy & authorization (critical)
Tenant isolation is enforced **server-side**, never trust the client:
- Salon data is scoped by `azienda_id` on every query.
- Resellers can only touch their own salons (`reseller_id === sess.uid`); `isMaster(sess)` bypasses this. When changing any `/api/aziende`, `/api/rivenditori`, or `/api/fatturazione` handler, preserve these ownership checks.
- `operatore` users are restricted server-side to GET-only, and `bookings` are filtered to their own `staff_id`.
- Deleting a salon cascades to its `utenti`, `sessioni`, and `dati_app`; deleting a reseller reassigns its salons to the master (`reseller_id = NULL`).
- `POST /api/aziende/:id/svuota` ("Svuota dati" in `ResellerPanel.jsx`) resets a salon to an empty licence: it overwrites all seven `dati_app` collections with the blanks from `saloneVuoto()`, drops `prenotazioni_online`, the `operatore` users and every open session for that salon, and leaves the licence, the salon login and `licenze_eventi` untouched. It must **write** empty blobs rather than delete the rows — `SalonApp` re-seeds sample data when `config`/`bookings`/`clients`/`sales` all come back `null`.

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
Each salon has a `moduli` JSON array on its `aziende` row controlling which features are on: `fidelity`, `vendite`, `statistiche`, `marketing`, `allergeni`, `pacchetti`, `online` (client self-booking add-on, €4/mo — not part of any plan, requires a non-Basic tier so `cleanModuli` strips it when there's no `op3`/`opinf`), plus operator-limit flags `op3` (≤3) / `opinf` (unlimited; default 1). A `null` moduli column means "legacy salon, everything on" (`parseModuli`). The limit is enforced both server-side (`maxOperatoriOf` blocks the `/api/operatori` create) and client-side (`has()` / `maxOperatori` in `SalonApp.jsx` near line 634 hides tabs). Old module keys are remapped via `OLD_MAP`. Pricing fields (`prezzo_imponibile`, `prezzo_finale`) are reseller-only commercial notes, never sent to the salon.

### Billing
License create/renew events are logged to `licenze_eventi` (`logEvento`). `/api/fatturazione` aggregates these per month/reseller for the master's billing tab; each reseller has a `sconto` (discount %, default 50) applied to amounts owed.

## Database & deployment

- `schema.sql` is the full, idempotent (`CREATE TABLE IF NOT EXISTS`) schema — safe to re-run, and it must stay a superset of every `migrazione-*.sql` so a fresh database needs nothing else. Never name a migration-added column in a query without a fallback: a live database that skipped the migration then fails the whole request (this is what silently killed online availability — `prenotazioni_online.impegni` in `onlineBookingsOf`), so reads use `SELECT *` and writes go through `senzaColonnaImpegni`. The `migrazione-*.sql` files are incremental `ALTER TABLE` migrations added over time; re-running them throws harmless "duplicate column" errors. `LEGGIMI.md` (Italian) is the operator runbook for updating the live site and running these.
- Deployment is via Cloudflare Pages auto-building from GitHub. To redeploy, push a real commit — do **not** use "Retry deployment" (it replays the old commit). Required env var: `SETUP_TOKEN` (Production).
- `public/setup.html` is a one-time bootstrap page to create the first (master) reseller, gated by `SETUP_TOKEN`. It refuses to run once a reseller exists; the runbook says to delete it after first use.

## Conventions

- Keep the backend as the single `functions/api/[[path]].js` file with the flat `if (segs[0] === ...)` routing style already in use.
- `SalonApp.jsx` is a large (~2500 line) single file containing all salon views (Agenda, Clienti, Buoni, Cassa/Shop, Statistiche, Marketing, Impostazioni) as components in one module — follow that structure rather than splitting unprompted.
- `AgendaView` has two day layouts, switched by the Elenco/Studio toggle: the card list, and `VistaStudio`, a grid where **the columns are the resources and the rows the hours**. That distinction matters because with phased services a salon can have six clients at once on three operators — some in posa, some alone in a cabin — which a list cannot show. Inside Studio a second toggle picks which columns to show: Operatori, Cabine or Entrambi. An appointment appears in **every** column it occupies, so a phased service shows up as two blocks with the posa as the empty space between them; overlapping blocks in one column are packed into side-by-side lanes, which is also how the units of a cabin with `quantita > 1` are drawn (the header shows `×N`). The operator dropdown restricts the operator columns to that one person. Studio is day-only; switching to 3 giorni/Settimana falls back to the list.
- `DettaglioAppuntamento` is the timeline shown when an appointment is opened (both `ApptActions` and `OnlineApptModal`): one bar per resource involved, the minutes in which nobody is engaged spelled out ("In posa o in attesa"), then each service with its phases, times, durations and who is doing them. It reads the booking's saved `impegni` for the assignment and `impegniServizio()` for what the service prescribes, matching the two by interval — so a booking made before the resource model still renders as one block.
- `SettingsView` is split into six sections driven by its `SEZIONI` array (Attività, Servizi, Operatori e cabine, Prenotazioni online, Dati e backup, Licenza), picked from a side menu — a left column from `lg` up, a horizontally scrollable strip below it. A new settings card belongs inside one of those sections; a section gated by a module (like `online`) is left out of `SEZIONI` entirely so no empty page can be opened.
- Italian naming throughout (`aziende`, `rivenditori`, `licenza`, `moduli`). New identifiers and UI copy should stay Italian.
