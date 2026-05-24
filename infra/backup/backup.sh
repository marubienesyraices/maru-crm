#!/bin/sh
# Backup diario de PostgreSQL → archivo local + upload opcional a R2
# Se ejecuta como cron dentro del contenedor backup de docker-compose.prod.yml

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/backups/gestprop_crm_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

echo "[$(date)] Iniciando backup: ${BACKUP_FILE}"

# Dump comprimido
pg_dump -h postgres -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_FILE}"

if [ $? -ne 0 ]; then
    echo "[$(date)] ERROR: pg_dump falló" >&2
    exit 1
fi

echo "[$(date)] Backup completado: $(du -sh ${BACKUP_FILE} | cut -f1)"

# Upload a R2 usando aws-cli si están configuradas las credenciales
if [ -n "${R2_BUCKET}" ] && [ -n "${R2_ACCESS_KEY_ID}" ]; then
    echo "[$(date)] Subiendo a R2: s3://${R2_BUCKET}/backups/"
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    aws s3 cp "${BACKUP_FILE}" \
        "s3://${R2_BUCKET}/backups/$(basename ${BACKUP_FILE})" \
        --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
        --no-progress 2>&1

    if [ $? -eq 0 ]; then
        echo "[$(date)] Upload a R2 exitoso"
    else
        echo "[$(date)] WARN: Upload a R2 falló — backup local disponible en ${BACKUP_FILE}"
    fi
fi

# Limpieza de archivos locales más antiguos que RETENTION_DAYS
find /backups -name "gestprop_crm_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date)] Backups retenidos (últimos ${RETENTION_DAYS} días):"
ls -lh /backups/*.sql.gz 2>/dev/null || echo "  (ninguno)"
