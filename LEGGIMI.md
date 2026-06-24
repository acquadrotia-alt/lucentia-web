# Lucentia Web — istruzioni rapide

Questo pacchetto contiene la "metà server" per portare Lucentia online (Cloudflare Pages + D1),
lasciando login e licenze come sono ora (lato client, mono-salone).

## Contenuto
- package.json, vite.config.js, index.html
- src/main.jsx
- functions/api/[[path]].js   → l'API (rotte /api/...)
- schema.sql                  → tabelle del database D1
- (DA AGGIUNGERE TU) src/App.jsx → il tuo Lucentia.jsx, rinominato e con le 6 modifiche

## Passo 0 — prepara src/App.jsx
1. Copia il tuo Lucentia.jsx dentro la cartella src/ e rinominalo App.jsx
2. Applica le 6 modifiche allo strato dati (vedi chat): apiLoad/apiSave, i 5 useState,
   il caricamento dal server, i 4 salvataggi, saveConfig, logout.

## Passo 1 — GitHub (da zero)
1. Crea un account su github.com
2. New repository → nome "lucentia-web" → Private → Create
3. "uploading an existing file" → trascina TUTTO il contenuto della cartella lucentia-web
   (con package.json alla radice, non dentro una sottocartella) → Commit changes

## Passo 2 — Database D1 (Cloudflare)
1. Crea un account su dash.cloudflare.com
2. Storage & Databases → D1 SQL Database → Create → nome "lucentia-db"
3. Scheda Console → incolla il contenuto di schema.sql → esegui

## Passo 3 — Progetto Pages
1. Workers & Pages → Create application → scheda PAGES → Connect to Git
2. Scegli il repository lucentia-web → Begin setup
3. Build command: npm run build   —   Build output directory: dist
4. Save and Deploy → otterrai un indirizzo *.pages.dev

## Passo 4 — Collega il database
1. Progetto Pages → Settings → Functions → D1 database bindings → Add binding
2. Variable name: DB   —   D1 database: lucentia-db

## Passo 5 — Ripubblica e verifica
1. Deployments → ultimo deploy → ⋯ → Retry deployment
2. Apri https://TUO-SITO.pages.dev/api/health → deve dare {"ok":true,...}
3. Apri il sito: la prima volta carica i dati di esempio e li salva sul database

## (Opzionale) Protezione leggera dell'API
Settings → Environment variables → Production → API_SECRET = stringa lunga a caso.
Poi fai inviare l'header "x-api-key" da apiLoad/apiSave nel frontend.
Nota: ferma solo gli accessi casuali, non sostituisce un vero login.
