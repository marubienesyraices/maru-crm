-- Create enums for interaction tracking
CREATE TYPE "TipoInteraccion" AS ENUM ('LLAMADA', 'VISITA', 'MENSAJE', 'NOTA', 'WHATSAPP', 'EMAIL');
CREATE TYPE "ResultadoInteraccion" AS ENUM ('POSITIVO', 'NEUTRO', 'NEGATIVO', 'SIN_RESPUESTA');

-- Create interacciones table
CREATE TABLE "interacciones" (
  "id"           TEXT        NOT NULL,
  "interes_id"   TEXT        NOT NULL,
  "usuario_id"   TEXT        NOT NULL,
  "tipo"         "TipoInteraccion"      NOT NULL,
  "resultado"    "ResultadoInteraccion" NOT NULL DEFAULT 'NEUTRO',
  "notas"        TEXT,
  "duracion_min" INTEGER,
  "fecha"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interacciones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "interacciones_interes_id_fecha_idx" ON "interacciones"("interes_id", "fecha");

ALTER TABLE "interacciones"
  ADD CONSTRAINT "interacciones_interes_id_fkey"
    FOREIGN KEY ("interes_id") REFERENCES "cliente_propiedades"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "interacciones_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
