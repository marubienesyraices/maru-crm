#!/bin/sh
# Reconstruye .env.production a partir de las variables de entorno en runtime
# del contenedor gestprop-api (más el VITE_MAPBOX_TOKEN horneado en el bundle
# de gestprop-web). Correr en el servidor de producción, en la raíz del repo.
#
# Uso: sh infra/scripts/recover-env-production.sh
#
# Limitaciones: las variables VITE_* solo existen como build-args del
# contenedor `web`, no como env vars en runtime, así que NO son recuperables
# desde el contenedor `api`. VITE_MAPBOX_TOKEN se recupera por grep sobre el
# JS ya compilado (funciona porque ya estaba wireado). VITE_GOOGLE_MAPS_API_KEY
# no se puede recuperar de ningún lado: nunca llegó a compilarse en el bundle
# actual (ese era el bug). Hay que conseguir esa key de nuevo (Google Cloud
# Console → APIs & Services → Credentials) y completarla a mano.

set -eu

OUT=".env.production"
API_CONTAINER="gestprop-api"
WEB_CONTAINER="gestprop-web"

if ! docker ps --format '{{.Names}}' | grep -qx "$API_CONTAINER"; then
  echo "ERROR: el contenedor $API_CONTAINER no está corriendo. Abortando." >&2
  exit 1
fi

if [ -f "$OUT" ]; then
  cp "$OUT" "${OUT}.bak.$(date +%Y%m%d%H%M%S)"
  echo "Aviso: ya existía $OUT, se respaldó antes de sobrescribir."
fi

ENV_DUMP="$(docker exec "$API_CONTAINER" printenv)"

get() {
  echo "$ENV_DUMP" | sed -n "s/^$1=//p"
}

DATABASE_URL="$(get DATABASE_URL)"
DATABASE_APP_URL="$(get DATABASE_APP_URL)"
REDIS_URL="$(get REDIS_URL)"

# postgresql://USER:PASS@postgres:5432/NAME?schema=public
DB_USER="$(echo "$DATABASE_URL" | sed -E 's#^postgresql://([^:]+):.*#\1#')"
DB_PASSWORD="$(echo "$DATABASE_URL" | sed -E 's#^postgresql://[^:]+:([^@]+)@.*#\1#')"
DB_NAME="$(echo "$DATABASE_URL" | sed -E 's#.*/([^/?]+)\?.*#\1#')"

DB_APP_USER="$(echo "$DATABASE_APP_URL" | sed -E 's#^postgresql://([^:]+):.*#\1#')"
DB_APP_PASSWORD="$(echo "$DATABASE_APP_URL" | sed -E 's#^postgresql://[^:]+:([^@]+)@.*#\1#')"

# redis://:PASS@redis:6379
REDIS_PASSWORD="$(echo "$REDIS_URL" | sed -E 's#^redis://:([^@]+)@.*#\1#')"

MASTER_ENCRYPTION_KEY="$(get MASTER_ENCRYPTION_KEY)"
JWT_ACCESS_SECRET="$(get JWT_ACCESS_SECRET)"
JWT_REFRESH_SECRET="$(get JWT_REFRESH_SECRET)"
FRONTEND_URL="$(get FRONTEND_URL)"
APP_URL="$(get APP_URL)"
R2_ACCOUNT_ID="$(get R2_ACCOUNT_ID)"
R2_ACCESS_KEY_ID="$(get R2_ACCESS_KEY_ID)"
R2_SECRET_ACCESS_KEY="$(get R2_SECRET_ACCESS_KEY)"
R2_BUCKET="$(get R2_BUCKET)"
R2_PUBLIC_URL="$(get R2_PUBLIC_URL)"
RESEND_API_KEY="$(get RESEND_API_KEY)"
EMAIL_FROM="$(get EMAIL_FROM)"
MAPBOX_TOKEN="$(get MAPBOX_TOKEN)"
PORTAL_TENANT_ID="$(get PORTAL_TENANT_ID)"
SENTRY_DSN_API="$(get SENTRY_DSN)"

VITE_MAPBOX_TOKEN=""
if docker ps --format '{{.Names}}' | grep -qx "$WEB_CONTAINER"; then
  VITE_MAPBOX_TOKEN="$(docker exec "$WEB_CONTAINER" sh -c "grep -horE 'pk\.[A-Za-z0-9_.-]+' /usr/share/nginx/html/assets/*.js 2>/dev/null | head -1" || true)"
fi

MISSING=""
[ -z "$DB_USER" ] && MISSING="$MISSING DB_USER"
[ -z "$MASTER_ENCRYPTION_KEY" ] && MISSING="$MISSING MASTER_ENCRYPTION_KEY"
[ -z "$JWT_ACCESS_SECRET" ] && MISSING="$MISSING JWT_ACCESS_SECRET"
[ -z "$VITE_MAPBOX_TOKEN" ] && MISSING="$MISSING VITE_MAPBOX_TOKEN(revisar_manual)"

cat > "$OUT" <<EOF
# ── Producción — reconstruido desde el contenedor $API_CONTAINER en $(date -u +%FT%TZ) ──
# ADVERTENCIA: revisa cada valor antes de usar. VITE_GOOGLE_MAPS_API_KEY NO
# se pudo recuperar (nunca se compiló en el bundle actual) — complétala a mano.

# ── Base de datos ──────────────────────────────────────────────────────────
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
DB_APP_USER=${DB_APP_USER}
DB_APP_PASSWORD=${DB_APP_PASSWORD}

# ── Redis ───────────────────────────────────────────────────────────────────
REDIS_PASSWORD=${REDIS_PASSWORD}

# ── JWT ─────────────────────────────────────────────────────────────────────
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# ── URLs públicas ────────────────────────────────────────────────────────────
APP_URL=${APP_URL}
FRONTEND_URL=${FRONTEND_URL}
PORTAL_URL=

# ── Cloudflare R2 ────────────────────────────────────────────────────────────
R2_ACCOUNT_ID=${R2_ACCOUNT_ID}
R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
R2_BUCKET=${R2_BUCKET}
R2_PUBLIC_URL=${R2_PUBLIC_URL}

# ── Email / Resend ───────────────────────────────────────────────────────────
RESEND_API_KEY=${RESEND_API_KEY}
EMAIL_FROM=${EMAIL_FROM}

# ── Encryption ────────────────────────────────────────────────────────────
MASTER_ENCRYPTION_KEY=${MASTER_ENCRYPTION_KEY}

# ── Mapbox ───────────────────────────────────────────────────────────────────
VITE_MAPBOX_TOKEN=${VITE_MAPBOX_TOKEN}
MAPBOX_TOKEN=${MAPBOX_TOKEN}

# ── Google Maps — NO recuperable, completar manualmente ──────────────────────
VITE_GOOGLE_MAPS_API_KEY=

# ── Portal público ───────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=
PORTAL_TENANT_ID=${PORTAL_TENANT_ID}

# ── Sentry (opcional) ─────────────────────────────────────────────────────
SENTRY_DSN_API=${SENTRY_DSN_API}
SENTRY_DSN_WEB=
EOF

chmod 600 "$OUT"

echo "Listo: $OUT generado."
if [ -n "$MISSING" ]; then
  echo "Revisa/completa manualmente:$MISSING"
fi
echo "Compara contra .env.production.example por si falta alguna variable adicional (WhatsApp, Meta, Zoom, DocuSign, etc.) que no vive en el contenedor api."
