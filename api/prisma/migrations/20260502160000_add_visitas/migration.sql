-- Add VISITA_AGENDADA to TipoNotificacion enum
ALTER TYPE "TipoNotificacion" ADD VALUE 'VISITA_AGENDADA';

-- Create EstadoVisita enum
CREATE TYPE "EstadoVisita" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'REALIZADA');

-- Create visitas table
CREATE TABLE "visitas" (
    "id"           TEXT         NOT NULL,
    "interes_id"   TEXT         NOT NULL,
    "agente_id"    TEXT         NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin"    TIMESTAMP(3) NOT NULL,
    "ubicacion"    TEXT,
    "notas"        TEXT,
    "estado"       "EstadoVisita" NOT NULL DEFAULT 'PENDIENTE',
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitas_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_interes_id_fkey"
    FOREIGN KEY ("interes_id") REFERENCES "cliente_propiedades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "visitas" ADD CONSTRAINT "visitas_agente_id_fkey"
    FOREIGN KEY ("agente_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "visitas_agente_id_fecha_inicio_idx" ON "visitas"("agente_id", "fecha_inicio");
CREATE INDEX "visitas_interes_id_idx" ON "visitas"("interes_id");
