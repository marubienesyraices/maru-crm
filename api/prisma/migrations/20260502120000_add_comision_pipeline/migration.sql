-- Add commission calculation fields to ClientePropiedad
ALTER TABLE "cliente_propiedades"
ADD COLUMN "precio_cierre" DECIMAL(14,2),
ADD COLUMN "comision_calculada" DECIMAL(14,2);
