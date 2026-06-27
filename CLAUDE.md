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
```

There are no tests, linter, or type checker configured. `npm run dev` serves only the React frontend; the `/api/*` routes are Cloudflare Pages Functions and do **not** run under plain Vite. To exercise the API + D1 locally you need the Cloudflare adapter (e.g. `wrangler pages dev`) with a D1 binding named `DB`; otherwise develop the frontend against the deployed API.

## Architecture

### Two halves
- **Frontend** — `src/`, a Vite + React 18 SPA styled with Tailwind (loaded via CDN in `index.html`, not a build dependency) and `lucide-react` icons.
- **Backend** — `functions/api/[[path]].js` (~530 lines), a single Cloudflare Pages Function catch-all that implements the entire REST API under `/api/*`. All backend logic lives in this one file. It binds to D1 as `env.DB` and reads `env.SETUP_TOKEN`.

### Roles and routing
`src/App.jsx` is the entry/router. On load it calls `GET /api/me`; the response's role decides which top-level component renders:
- `reseller` → `ResellerPanel.jsx` (the `master` flag unlocks the Rivenditori + Fatturazione tabs)
- `operatore` → `OperatorApp.jsx` (read-only, single-staff agenda view)
- `azienda` → `SalonApp.jsx` (the full salon app)

Unauthenticated users see `Landing.jsx` (public marketing cover with demo-request + contact forms) unless `#login` is in the URL. License/demo status gates access: expired/suspended salons get a `Blocked` screen, expired demos get a `DemoExpired` contact screen — both still authenticate but can't reach the app.

### Auth & session model
Email + password login. Passwords are hashed with PBKDF2 (SHA-256, 100k iterations) via WebCrypto — see `hashPassword`/`verifyPassword`. Sessions are random tokens stored in the `sessioni` table and carried in an HttpOnly `sid` cookie (30-day expiry). Every API call past the public routes (`health`, `setup`, `login`, `logout`, `richiesta`, `demo`) requires a valid session resolved by `getSession`.

### Multi-tenancy & authorization (critical)
Tenant isolation is enforced **server-side**, never trust the client:
- Salon data is scoped by `azienda_id` on every query.
- Resellers can only touch their own salons (`reseller_id === sess.uid`); `isMaster(sess)` bypasses this. When changing any `/api/aziende`, `/api/rivenditori`, or `/api/fatturazione` handler, preserve these ownership checks.
- `operatore` users are restricted server-side to GET-only, and `bookings` are filtered to their own `staff_id`.
- Deleting a salon cascades to its `utenti`, `sessioni`, and `dati_app`; deleting a reseller reassigns its salons to the master (`reseller_id = NULL`).

### Salon data storage (the `dati_app` pattern)
The salon app does **not** have a normalized schema. All salon content is six JSON blobs ("collezioni") stored as rows in `dati_app`, keyed `${azienda_id}:${collezione}`:

`config`, `bookings`, `clients`, `catalog`, `sales`, `vouchers` (see `COLLEZIONI` in the API).

`SalonApp.jsx` holds each as React state, loads them via `GET /api/data/:coll` on mount, and persists changes with a debounced `PUT /api/data/:coll` (`apiSaveDebounced`, 800ms). The server rejects writes when the license is inactive. **Demo tenants are read-only**: saving is skipped client-side (`demoRef`) and the demo is seeded server-side by `demoSeed()`.

### Feature gating ("moduli" / operators)
Each salon has a `moduli` JSON array on its `aziende` row controlling which features are on: `fidelity`, `vendite`, `statistiche`, `marketing`, `allergeni`, `pacchetti`, `online` (client self-booking add-on, €4/mo — not part of any plan, requires a non-Basic tier so `cleanModuli` strips it when there's no `op3`/`opinf`), plus operator-limit flags `op3` (≤3) / `opinf` (unlimited; default 1). A `null` moduli column means "legacy salon, everything on" (`parseModuli`). The limit is enforced both server-side (`maxOperatoriOf` blocks the `/api/operatori` create) and client-side (`has()` / `maxOperatori` in `SalonApp.jsx` near line 634 hides tabs). Old module keys are remapped via `OLD_MAP`. Pricing fields (`prezzo_imponibile`, `prezzo_finale`) are reseller-only commercial notes, never sent to the salon.

### Billing
License create/renew events are logged to `licenze_eventi` (`logEvento`). `/api/fatturazione` aggregates these per month/reseller for the master's billing tab; each reseller has a `sconto` (discount %, default 50) applied to amounts owed.

## Database & deployment

- `schema.sql` is the full, idempotent (`CREATE TABLE IF NOT EXISTS`) schema — safe to re-run. The `migrazione-*.sql` files are incremental `ALTER TABLE` migrations added over time; re-running them throws harmless "duplicate column" errors. `LEGGIMI.md` (Italian) is the operator runbook for updating the live site and running these.
- Deployment is via Cloudflare Pages auto-building from GitHub. To redeploy, push a real commit — do **not** use "Retry deployment" (it replays the old commit). Required env var: `SETUP_TOKEN` (Production).
- `public/setup.html` is a one-time bootstrap page to create the first (master) reseller, gated by `SETUP_TOKEN`. It refuses to run once a reseller exists; the runbook says to delete it after first use.

## Conventions

- Keep the backend as the single `functions/api/[[path]].js` file with the flat `if (segs[0] === ...)` routing style already in use.
- `SalonApp.jsx` is a large (~2500 line) single file containing all salon views (Agenda, Clienti, Buoni, Cassa/Shop, Statistiche, Marketing, Impostazioni) as components in one module — follow that structure rather than splitting unprompted.
- Italian naming throughout (`aziende`, `rivenditori`, `licenza`, `moduli`). New identifiers and UI copy should stay Italian.
