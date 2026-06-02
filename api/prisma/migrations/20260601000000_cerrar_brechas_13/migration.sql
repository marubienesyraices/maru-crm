-- Migration: 20260601000000_cerrar_brechas_13
-- Closes 13 remaining requirement gaps identified in faltantes.md
-- Note: all PK/FK columns use TEXT (Prisma stores UUIDs as text in this project)

-- ─── Brecha 2.7: superficie_min_m2 en preferencias del cliente ─────────────
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS superficie_min_m2 DECIMAL(10,2);

-- ─── Brecha 1.1: oferta competitiva en pipeline ───────────────────────────
ALTER TABLE cliente_propiedades ADD COLUMN IF NOT EXISTS es_oferta_competitiva BOOLEAN NOT NULL DEFAULT false;

-- ─── Brecha 2.4: valor SISTEMA en TipoInteraccion (auto-timeline) ─────────
DO $$ BEGIN
  ALTER TYPE "TipoInteraccion" ADD VALUE 'SISTEMA';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Brecha 1.5: frecuencia de sincronización configurable por portal ──────
ALTER TABLE config_seguridad ADD COLUMN IF NOT EXISTS sinc_frecuencia TEXT NOT NULL DEFAULT 'manual';

-- ─── Brecha 2.6: búsquedas guardadas del cliente ──────────────────────────
CREATE TABLE IF NOT EXISTS busquedas_guardadas (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT        NOT NULL REFERENCES tenants(id),
  cliente_id  TEXT        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre      TEXT        NOT NULL,
  filtros     JSONB       NOT NULL DEFAULT '{}',
  alertas     BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_busquedas_guardadas_cliente ON busquedas_guardadas(tenant_id, cliente_id);

ALTER TABLE busquedas_guardadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE busquedas_guardadas FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY busquedas_guardadas_tenant_isolation ON busquedas_guardadas
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Brecha 1.3: preferencias de notificación por usuario y canal ──────────
CREATE TABLE IF NOT EXISTS notificacion_preferencias (
  id          TEXT    PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT    NOT NULL REFERENCES tenants(id),
  user_id     TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo        TEXT    NOT NULL,
  canal_inapp BOOLEAN NOT NULL DEFAULT true,
  canal_email BOOLEAN NOT NULL DEFAULT true,
  canal_push  BOOLEAN NOT NULL DEFAULT true,
  activa      BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (tenant_id, user_id, tipo)
);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notificacion_preferencias(tenant_id, user_id);

ALTER TABLE notificacion_preferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacion_preferencias FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY notif_prefs_tenant_isolation ON notificacion_preferencias
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Brecha 1.2: triggers de email configurables ─────────────────────────
CREATE TABLE IF NOT EXISTS email_triggers (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id    TEXT        NOT NULL REFERENCES tenants(id),
  evento       TEXT        NOT NULL,
  activo       BOOLEAN     NOT NULL DEFAULT true,
  plantilla_id TEXT        REFERENCES email_plantillas(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, evento)
);
CREATE INDEX IF NOT EXISTS idx_email_triggers_tenant ON email_triggers(tenant_id);

ALTER TABLE email_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_triggers FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY email_triggers_tenant_isolation ON email_triggers
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Brecha 1.4: ZILLOW en enum PortalExterno ─────────────────────────────
DO $$ BEGIN
  ALTER TYPE "PortalExterno" ADD VALUE 'ZILLOW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
