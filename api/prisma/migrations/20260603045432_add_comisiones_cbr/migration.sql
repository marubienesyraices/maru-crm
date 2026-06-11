-- AlterTable
ALTER TABLE "cliente_propiedades" ADD COLUMN     "comision_sugerida_renta" DECIMAL(14,2),
ADD COLUMN     "comision_sugerida_venta" DECIMAL(14,2),
ADD COLUMN     "duracion_contrato_meses" INTEGER,
ADD COLUMN     "tipo_operacion_cierre" TEXT;

-- AlterTable
ALTER TABLE "config_seguridad" ADD COLUMN     "comision_pct_venta_default" DECIMAL(5,2) NOT NULL DEFAULT 5.60;
