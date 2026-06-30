-- Add carta_plantilla_html to config_integraciones
ALTER TABLE "config_integraciones" ADD COLUMN IF NOT EXISTS "carta_plantilla_html" TEXT;

-- Create config_brochure table
CREATE TABLE IF NOT EXISTS "config_brochure" (
  "id"              TEXT NOT NULL,
  "tenant_id"       TEXT NOT NULL,
  "secciones"       JSONB NOT NULL DEFAULT '[]',
  "footer_texto"    TEXT,
  "watermark_texto" TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "config_brochure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "config_brochure_tenant_id_key" ON "config_brochure"("tenant_id");

ALTER TABLE "config_brochure"
  ADD CONSTRAINT "config_brochure_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
