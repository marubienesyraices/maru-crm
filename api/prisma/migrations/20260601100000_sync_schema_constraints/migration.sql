-- Migration: 20260601100000_sync_schema_constraints
-- Aligns FK constraint names, index names, column defaults and nullability
-- to match Prisma's canonical schema. Generated from migrate diff after
-- applying 20260601000000_cerrar_brechas_13 on a clean database.

-- DropForeignKey (re-add with Prisma naming convention)
ALTER TABLE "busquedas_guardadas" DROP CONSTRAINT IF EXISTS "busquedas_guardadas_tenant_id_fkey";
ALTER TABLE "busquedas_guardadas" DROP CONSTRAINT IF EXISTS "busquedas_guardadas_cliente_id_fkey";
ALTER TABLE "email_triggers" DROP CONSTRAINT IF EXISTS "email_triggers_plantilla_id_fkey";
ALTER TABLE "email_triggers" DROP CONSTRAINT IF EXISTS "email_triggers_tenant_id_fkey";
ALTER TABLE "notificacion_preferencias" DROP CONSTRAINT IF EXISTS "notificacion_preferencias_tenant_id_fkey";
ALTER TABLE "notificacion_preferencias" DROP CONSTRAINT IF EXISTS "notificacion_preferencias_user_id_fkey";

-- DropIndex (re-add with Prisma naming convention)
DROP INDEX IF EXISTS "idx_audit_archivado";

-- AlterTable audit_logs
ALTER TABLE "audit_logs"
  ALTER COLUMN "archivado" SET NOT NULL,
  ALTER COLUMN "archivado_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable busquedas_guardadas
ALTER TABLE "busquedas_guardadas"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable config_seguridad
ALTER TABLE "config_seguridad"
  ALTER COLUMN "modo_asignacion_leads" SET NOT NULL,
  ALTER COLUMN "modo_asignacion_leads" SET DATA TYPE TEXT;

-- AlterTable email_plantillas
ALTER TABLE "email_plantillas"
  ALTER COLUMN "version" SET NOT NULL;

-- AlterTable email_triggers
ALTER TABLE "email_triggers"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "updated_at" DROP DEFAULT,
  ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable favoritos
ALTER TABLE "favoritos"
  ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable notificacion_preferencias
ALTER TABLE "notificacion_preferencias"
  ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable tenants
ALTER TABLE "tenants"
  ALTER COLUMN "color_primario" SET NOT NULL,
  ALTER COLUMN "color_primario" SET DATA TYPE TEXT,
  ALTER COLUMN "color_secundario" SET NOT NULL,
  ALTER COLUMN "color_secundario" SET DATA TYPE TEXT,
  ALTER COLUMN "color_acento" SET NOT NULL,
  ALTER COLUMN "color_acento" SET DATA TYPE TEXT;

-- AlterTable users
ALTER TABLE "users"
  ALTER COLUMN "password_expiry_warned" SET NOT NULL;

-- AddForeignKey (with Prisma naming convention + proper ON DELETE/UPDATE)
ALTER TABLE "busquedas_guardadas"
  ADD CONSTRAINT "busquedas_guardadas_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "busquedas_guardadas"
  ADD CONSTRAINT "busquedas_guardadas_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notificacion_preferencias"
  ADD CONSTRAINT "notificacion_preferencias_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notificacion_preferencias"
  ADD CONSTRAINT "notificacion_preferencias_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_triggers"
  ADD CONSTRAINT "email_triggers_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "email_triggers"
  ADD CONSTRAINT "email_triggers_plantilla_id_fkey"
  FOREIGN KEY ("plantilla_id") REFERENCES "email_plantillas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX IF EXISTS "idx_busquedas_guardadas_cliente" RENAME TO "busquedas_guardadas_tenant_id_cliente_id_idx";
ALTER INDEX IF EXISTS "idx_email_triggers_tenant" RENAME TO "email_triggers_tenant_id_idx";
ALTER INDEX IF EXISTS "idx_notif_prefs_user" RENAME TO "notificacion_preferencias_tenant_id_user_id_idx";
