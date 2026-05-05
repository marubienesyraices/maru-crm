-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('DOCUMENTO_POR_VENCER', 'DOCUMENTO_VENCIDO', 'SISTEMA');

-- AlterTable
ALTER TABLE "propiedades" ADD COLUMN     "pais" TEXT DEFAULT 'Guatemala';

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "entidad" TEXT,
    "entidad_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificaciones_user_id_leida_idx" ON "notificaciones"("user_id", "leida");

-- CreateIndex
CREATE INDEX "notificaciones_tenant_id_created_at_idx" ON "notificaciones"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
