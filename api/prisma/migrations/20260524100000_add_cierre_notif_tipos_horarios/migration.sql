-- F-15: Add CIERRE to EstadoInteres enum
ALTER TYPE "EstadoInteres" ADD VALUE IF NOT EXISTS 'CIERRE';

-- F-17 + F-23: Add new notification types
ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'NEGOCIACION_TIMEOUT';
ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'PROPIEDAD_ESTANCADA';

-- F-20: Horarios laborales del agente
CREATE TABLE "horarios_laborales" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenant_id"   TEXT NOT NULL,
    "user_id"     TEXT NOT NULL,
    "dia_semana"  INTEGER NOT NULL,
    "hora_inicio" TEXT NOT NULL,
    "hora_fin"    TEXT NOT NULL,
    "activo"      BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "horarios_laborales_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "horarios_laborales_tenant_id_user_id_dia_semana_key"
        UNIQUE ("tenant_id", "user_id", "dia_semana"),
    CONSTRAINT "horarios_laborales_tenant_id_fkey"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "horarios_laborales_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "horarios_laborales_tenant_id_user_id_idx"
    ON "horarios_laborales"("tenant_id", "user_id");

-- RLS para horarios_laborales
ALTER TABLE "horarios_laborales" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "horarios_laborales_tenant_isolation" ON "horarios_laborales"
  USING (
    tenant_id = current_setting('app.tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );
