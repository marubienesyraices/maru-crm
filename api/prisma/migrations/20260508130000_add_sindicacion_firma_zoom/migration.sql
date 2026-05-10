-- HU-12.01: Sindicación portales externos
CREATE TYPE "PortalExterno" AS ENUM ('ENCUENTRA24', 'MERCADOLIBRE');
CREATE TYPE "EstadoSindicacion" AS ENUM ('PENDIENTE', 'PUBLICADO', 'ERROR', 'RETIRADO');

CREATE TABLE "sindicacion_publicaciones" (
  "id"           TEXT NOT NULL,
  "tenant_id"    TEXT NOT NULL,
  "propiedad_id" TEXT NOT NULL,
  "portal"       "PortalExterno" NOT NULL,
  "estado"       "EstadoSindicacion" NOT NULL DEFAULT 'PENDIENTE',
  "external_id"  TEXT,
  "external_url" TEXT,
  "error_msg"    TEXT,
  "publicado_at" TIMESTAMP(3),
  "retirado_at"  TIMESTAMP(3),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sindicacion_publicaciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sindicacion_publicaciones_propiedad_id_portal_key"
  ON "sindicacion_publicaciones" ("propiedad_id", "portal");
CREATE INDEX "sindicacion_publicaciones_tenant_id_portal_idx"
  ON "sindicacion_publicaciones" ("tenant_id", "portal");

ALTER TABLE "sindicacion_publicaciones"
  ADD CONSTRAINT "sindicacion_publicaciones_propiedad_id_fkey"
  FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE;

-- HU-12.02: Firma digital
CREATE TYPE "EstadoFirma" AS ENUM ('PENDIENTE', 'ENVIADO', 'COMPLETADO', 'DECLINADO', 'VENCIDO');

CREATE TABLE "firma_solicitudes" (
  "id"              TEXT NOT NULL,
  "tenant_id"       TEXT NOT NULL,
  "propiedad_id"    TEXT NOT NULL,
  "agente_id"       TEXT NOT NULL,
  "firmante_nombre" TEXT NOT NULL,
  "firmante_email"  TEXT NOT NULL,
  "estado"          "EstadoFirma" NOT NULL DEFAULT 'PENDIENTE',
  "envelope_id"     TEXT,
  "signing_url"     TEXT,
  "completado_at"   TIMESTAMP(3),
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "firma_solicitudes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "firma_solicitudes_tenant_id_estado_idx" ON "firma_solicitudes" ("tenant_id", "estado");
CREATE INDEX "firma_solicitudes_propiedad_id_idx"     ON "firma_solicitudes" ("propiedad_id");

ALTER TABLE "firma_solicitudes"
  ADD CONSTRAINT "firma_solicitudes_propiedad_id_fkey"
  FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE;

-- HU-12.02: Videollamadas Zoom en visitas
ALTER TABLE "visitas" ADD COLUMN IF NOT EXISTS "zoom_meeting_id" TEXT;
ALTER TABLE "visitas" ADD COLUMN IF NOT EXISTS "zoom_join_url"   TEXT;
