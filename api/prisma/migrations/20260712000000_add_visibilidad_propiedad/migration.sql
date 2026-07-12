ALTER TABLE "propiedades"
  ADD COLUMN IF NOT EXISTS "mostrar_en_mapa_crm" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "mostrar_en_portal"   BOOLEAN NOT NULL DEFAULT true;
