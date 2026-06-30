-- AlterTable: agregar porcentaje_iva a config_seguridad
-- Default 0.12 = 12% (Guatemala). Ajustar por tenant según país.
ALTER TABLE "config_seguridad"
  ADD COLUMN IF NOT EXISTS "porcentaje_iva" DECIMAL(5,4) NOT NULL DEFAULT 0.12;
