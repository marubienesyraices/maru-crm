-- CreateEnum
CREATE TYPE "EstadoCampana" AS ENUM ('BORRADOR', 'ENVIANDO', 'ENVIADA', 'FALLIDA');

-- CreateTable
CREATE TABLE "email_plantillas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo_html" TEXT NOT NULL,
    "variables" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_plantillas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_campanas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "plantilla_id" TEXT NOT NULL,
    "filtro_rol" "Rol"[],
    "variables_data" JSONB NOT NULL DEFAULT '{}',
    "estado" "EstadoCampana" NOT NULL DEFAULT 'BORRADOR',
    "total_enviados" INTEGER NOT NULL DEFAULT 0,
    "enviada_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_campanas_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "email_eventos" ADD COLUMN "campana_id" TEXT;

-- CreateIndex
CREATE INDEX "email_plantillas_tenant_id_idx" ON "email_plantillas"("tenant_id");

-- CreateIndex
CREATE INDEX "email_campanas_tenant_id_created_at_idx" ON "email_campanas"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "email_eventos_campana_id_idx" ON "email_eventos"("campana_id");

-- AddForeignKey
ALTER TABLE "email_campanas" ADD CONSTRAINT "email_campanas_plantilla_id_fkey"
    FOREIGN KEY ("plantilla_id") REFERENCES "email_plantillas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_eventos" ADD CONSTRAINT "email_eventos_campana_id_fkey"
    FOREIGN KEY ("campana_id") REFERENCES "email_campanas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
