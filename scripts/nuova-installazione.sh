#!/usr/bin/env bash
# ============================================================================
# Prepara il repository di una nuova installazione cliente a partire dal ceppo
# Lucentia (questo repository) e stampa i passi Cloudflare rimanenti.
#
# Uso:
#   scripts/nuova-installazione.sh <nome-breve> <url-repository-github-vuoto> [dominio]
# Esempio:
#   scripts/nuova-installazione.sh salonebellezza https://github.com/mattia/lucentia-salonebellezza.git salonebellezza.it
#
# Cosa fa:
#   1. clona il ceppo in ../lucentia-<nome-breve>
#   2. rinomina il remote del ceppo in "upstream" e aggiunge "origin" = repository del cliente
#   3. fa il primo push
#   4. se trovi `wrangler` installato, stampa i comandi per progetto Pages, D1 e schema
# Non tocca Cloudflare da solo: i comandi vanno letti e lanciati a mano.
# ============================================================================
set -euo pipefail

NOME="${1:-}"; ORIGINE="${2:-}"; DOMINIO="${3:-}"
if [[ -z "$NOME" || -z "$ORIGINE" ]]; then
  echo "Uso: $0 <nome-breve> <url-repository-github-vuoto> [dominio]" >&2
  exit 1
fi
if [[ ! "$NOME" =~ ^[a-z0-9-]+$ ]]; then
  echo "Il nome breve può contenere solo lettere minuscole, numeri e trattini." >&2
  exit 1
fi

QUI="$(cd "$(dirname "$0")/.." && pwd)"
CEPPO_URL="$(git -C "$QUI" remote get-url origin)"
BRANCH="$(git -C "$QUI" symbolic-ref --short HEAD 2>/dev/null || echo main)"
DEST="$(dirname "$QUI")/lucentia-$NOME"

if [[ -e "$DEST" ]]; then echo "La cartella $DEST esiste già." >&2; exit 1; fi

echo "→ Clono il ceppo ($CEPPO_URL, branch $BRANCH) in $DEST"
git clone --branch "$BRANCH" "$CEPPO_URL" "$DEST"
cd "$DEST"
git remote rename origin upstream
git remote add origin "$ORIGINE"
echo "→ Primo push su $ORIGINE"
git push -u origin "$BRANCH"

cat <<EOF

Repository pronto: $DEST
  origin   → $ORIGINE          (il cliente)
  upstream → $CEPPO_URL        (il ceppo: aggiornamenti con 'git fetch upstream && git merge upstream/$BRANCH')

PASSI SUCCESSIVI SU CLOUDFLARE
1. Nel pannello Lucentia → Installazioni → Nuova installazione: copia le variabili
   MODALITA, HUB_URL, INSTALLAZIONE_ID, INSTALLAZIONE_CHIAVE.
2. Pages → nuovo progetto collegato a $ORIGINE
   (build: npm run build · output: dist).
3. D1 → nuovo database "lucentia-$NOME", binding "DB" nel progetto, poi schema e migrazioni:
EOF
if command -v wrangler >/dev/null 2>&1; then
  cat <<EOF
     wrangler d1 create lucentia-$NOME
     wrangler d1 execute lucentia-$NOME --remote --file=schema.sql
     for f in migrazione-*.sql; do wrangler d1 execute lucentia-$NOME --remote --file="\$f" || true; done
EOF
else
  echo "     (console D1: incolla schema.sql e poi ogni migrazione-*.sql; gli errori 'duplicate column' sono innocui)"
fi
cat <<EOF
4. Variabili d'ambiente del progetto (Production): le quattro del punto 1 + SETUP_TOKEN (segreto nuovo).
5. Custom domains: ${DOMINIO:-<dominio del cliente>} (DNS su Cloudflare: i record li crea lui).
6. Primo deploy, poi https://${DOMINIO:-<dominio>}/setup.html → crea il salone e l'accesso del titolare.
7. Il gestionale risponde su https://${DOMINIO:-<dominio>}/gestionale, il sito sulla radice.

Personalizzazioni del cliente: src/cliente/ (frontend) e server/cliente/ (API). Il ceppo non le tocca.
EOF
