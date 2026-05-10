-- CreateEnum
CREATE TYPE "MetaPlataforma" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'AMBAS');

-- CreateEnum
CREATE TYPE "MetaEstado" AS ENUM ('BORRADOR', 'PROGRAMADA', 'PUBLICADA', 'FALLIDA');

-- CreateTable
CREATE TABLE "meta_publicaciones" (
    "id"              TEXT NOT NULL,
    "tenant_id"       TEXT NOT NULL,
    "propiedad_id"    TEXT,
    "agente_id"       TEXT NOT NULL,
    "plataforma"      "MetaPlataforma" NOT NULL,
    "mensaje"         TEXT NOT NULL,
    "imagen_url"      TEXT,
    "estado"          "MetaEstado" NOT NULL DEFAULT 'BORRADOR',
    "programado_para" TIMESTAMP(3),
    "publicado_at"    TIMESTAMP(3),
    "fb_post_id"      TEXT,
    "ig_post_id"      TEXT,
    "error_msg"       TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_publicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meta_publicaciones_tenant_id_estado_idx" ON "meta_publicaciones"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "meta_publicaciones_tenant_id_created_at_idx" ON "meta_publicaciones"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "meta_publicaciones" ADD CONSTRAINT "meta_publicaciones_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_publicaciones" ADD CONSTRAINT "meta_publicaciones_propiedad_id_fkey"
    FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_publicaciones" ADD CONSTRAINT "meta_publicaciones_agente_id_fkey"
    FOREIGN KEY ("agente_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
