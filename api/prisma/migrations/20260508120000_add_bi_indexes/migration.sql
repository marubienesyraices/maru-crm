-- BI performance indexes
-- Covers: getResumen (estado+fecha_cierre filter), getAgentes (same)
CREATE INDEX IF NOT EXISTS "cliente_propiedades_estado_fecha_cierre_idx"
  ON "cliente_propiedades" ("estado", "fecha_cierre");

-- Covers: getProductividad / getAgentes interaccion count by agent+date
CREATE INDEX IF NOT EXISTS "interacciones_usuario_id_fecha_idx"
  ON "interacciones" ("usuario_id", "fecha");
