#!/usr/bin/env bash
# Actualiza el ambiente de Producción: git pull + rebuild de contenedores + migraciones Prisma.
# Uso (ejecutar en el VPS de producción):
#   bash update-prod.sh [ruta-del-proyecto]
# Por defecto asume que el repo está clonado en /opt/gestprop.
#
# Pide confirmación explícita antes de tocar producción.

set -euo pipefail

PROJECT_DIR="${1:-/opt/gestprop}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

cd "$PROJECT_DIR"

echo "⚠️  Vas a actualizar PRODUCCIÓN en $PROJECT_DIR ($COMPOSE_FILE)"
read -r -p "Escribe SI para continuar: " CONFIRM
if [ "$CONFIRM" != "SI" ]; then
  echo "Cancelado."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: hay cambios locales sin commitear en $PROJECT_DIR."
  echo "Revisa con 'git status' antes de continuar (no se hace pull para no perder trabajo)."
  exit 1
fi

echo "==> git pull origin master"
git pull origin master

echo "==> Reconstruyendo y reiniciando contenedores (zero-downtime)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "==> Aplicando migraciones de Prisma"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm migrate

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

RECORDATORIOS MANUALES (no automatizados por este script):
1. Si la actualización agrega tablas nuevas con tenant_id, aplica las políticas RLS:
     docker cp api/prisma/sql/rls_policies/migration.sql gestprop-db:/tmp/
     docker cp api/prisma/sql/rls_policies/migration_v2.sql gestprop-db:/tmp/
     docker compose -f docker-compose.prod.yml exec postgres psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/migration.sql
     docker compose -f docker-compose.prod.yml exec postgres psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/migration_v2.sql
2. Verifica que exista un backup reciente antes de una migración riesgosa:
     docker compose -f docker-compose.prod.yml exec backup ls -lh /backups/
NOTE

echo "==> Listo."
