#!/usr/bin/env bash
# Actualiza el ambiente de QA: git pull + rebuild de contenedores + migraciones Prisma.
# Uso (ejecutar en la VM de QA):
#   bash update-qa.sh [ruta-del-proyecto]
# Por defecto asume que el repo está clonado en ~/gestprop.

set -euo pipefail

PROJECT_DIR="${1:-$HOME/gestprop}"
COMPOSE_FILE="docker-compose.qa.yml"
ENV_FILE=".env.qa"

cd "$PROJECT_DIR"

echo "==> Repositorio: $PROJECT_DIR"

if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: hay cambios locales sin commitear en $PROJECT_DIR."
  echo "Revisa con 'git status' antes de continuar (no se hace pull para no perder trabajo)."
  exit 1
fi

echo "==> git pull origin master"
PULL_OUTPUT="$(git pull origin master)"
echo "$PULL_OUTPUT"

if echo "$PULL_OUTPUT" | grep -q "Already up to date"; then
  echo ""
  echo "No hay cambios nuevos en el repositorio."
  read -r -p "¿Continuar de todas formas con rebuild + migraciones? (s/N): " CONTINUAR
  case "$CONTINUAR" in
    [sS]|[sS][iI]) ;;
    *) echo "Detenido a solicitud del usuario."; exit 0 ;;
  esac
fi

echo "==> Reconstruyendo y reiniciando contenedores"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "==> Aplicando migraciones de Prisma"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm migrate

echo "==> Reiniciando nginx para refrescar las IPs de los contenedores"
docker compose -f "$COMPOSE_FILE" restart nginx

echo "==> Estado de los contenedores"
docker compose -f "$COMPOSE_FILE" ps

echo "==> Health check de la API"
sleep 5
if curl -fsS http://localhost:3000/api/health >/dev/null; then
  echo "API OK"
else
  echo "ADVERTENCIA: la API no respondió en /api/health. Revisa los logs:"
  echo "  docker compose -f $COMPOSE_FILE logs --tail=100 api"
fi

cat <<'NOTE'

RECORDATORIO MANUAL (no automatizado por este script):
Si la actualización agrega tablas nuevas con tenant_id, aplica las políticas RLS:
  docker cp api/prisma/sql/rls_policies/migration.sql gestprop-db-qa:/tmp/
  docker cp api/prisma/sql/rls_policies/migration_v2.sql gestprop-db-qa:/tmp/
  docker compose -f docker-compose.qa.yml exec postgres psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/migration.sql
  docker compose -f docker-compose.qa.yml exec postgres psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/migration_v2.sql
NOTE

echo "==> Listo."
