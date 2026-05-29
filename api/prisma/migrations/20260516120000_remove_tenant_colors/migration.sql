ALTER TABLE "tenants"
  DROP COLUMN IF EXISTS "color_primario",
  DROP COLUMN IF EXISTS "color_secundario",
  DROP COLUMN IF EXISTS "color_acento",
  DROP COLUMN IF EXISTS "color_fondo_alterno",
  DROP COLUMN IF EXISTS "color_fondo_principal",
  DROP COLUMN IF EXISTS "color_texto";
