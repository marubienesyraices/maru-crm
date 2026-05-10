-- Add post-visit report fields to visitas
ALTER TABLE "visitas" ADD COLUMN IF NOT EXISTS "reporte_notas"          TEXT;
ALTER TABLE "visitas" ADD COLUMN IF NOT EXISTS "reporte_nivel_interes"  TEXT;
ALTER TABLE "visitas" ADD COLUMN IF NOT EXISTS "reporte_reaccion"       TEXT;
ALTER TABLE "visitas" ADD COLUMN IF NOT EXISTS "reporte_siguiente_paso" TEXT;
ALTER TABLE "visitas" ADD COLUMN IF NOT EXISTS "reporte_fecha"          TIMESTAMP(3);
