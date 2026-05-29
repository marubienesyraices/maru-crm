-- DropForeignKey
ALTER TABLE "firma_solicitudes" DROP CONSTRAINT "firma_solicitudes_propiedad_id_fkey";

-- DropForeignKey
ALTER TABLE "sindicacion_publicaciones" DROP CONSTRAINT "sindicacion_publicaciones_propiedad_id_fkey";

-- AlterTable
ALTER TABLE "brochure_jobs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "config_integraciones" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "config_portal" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "firma_solicitudes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "interacciones" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sindicacion_publicaciones" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "sindicacion_publicaciones" ADD CONSTRAINT "sindicacion_publicaciones_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firma_solicitudes" ADD CONSTRAINT "firma_solicitudes_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_whatsapp_envios_fecha" RENAME TO "whatsapp_envios_tenant_id_enviado_at_idx";

-- RenameIndex
ALTER INDEX "idx_whatsapp_envios_propiedad" RENAME TO "whatsapp_envios_tenant_id_propiedad_id_idx";
