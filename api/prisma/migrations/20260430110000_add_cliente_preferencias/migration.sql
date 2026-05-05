-- AlterEnum
ALTER TYPE "TipoNotificacion" ADD VALUE 'MATCH_PROPIEDAD';

-- AlterTable: add preference fields to clientes
ALTER TABLE "clientes"
  ADD COLUMN "tipo_interes"     "TipoPropiedad",
  ADD COLUMN "gestion_interes"  "TipoGestion",
  ADD COLUMN "presupuesto_max"  DECIMAL(14,2),
  ADD COLUMN "zona_interes"     TEXT,
  ADD COLUMN "habitaciones_min" INTEGER;
