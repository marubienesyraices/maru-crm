-- ============================================================
-- Row-Level Security (RLS) Policies — v2
-- CRM Maru Bienes y Raíces — Fase 2 / Sprint 4-12
-- ============================================================
-- Aplica DESPUÉS de migration.sql (que cubre Fase 1).
-- Cubre todas las tablas agregadas en migraciones posteriores.
-- ============================================================

-- ============================================================
-- SECCIÓN A: Tablas con tenant_id directo
-- Patrón estándar: política USING + INSERT WITH CHECK + bypass
-- ============================================================

-- ── propietarios ────────────────────────────────────────────
ALTER TABLE propietarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_propietarios ON propietarios
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_propietarios ON propietarios
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_propietarios ON propietarios
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE propietarios FORCE ROW LEVEL SECURITY;

-- ── propiedades ─────────────────────────────────────────────
ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_propiedades ON propiedades
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_propiedades ON propiedades
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_propiedades ON propiedades
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE propiedades FORCE ROW LEVEL SECURITY;

-- ── clientes ────────────────────────────────────────────────
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_clientes ON clientes
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_clientes ON clientes
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_clientes ON clientes
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE clientes FORCE ROW LEVEL SECURITY;

-- ── notificaciones ──────────────────────────────────────────
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_notificaciones ON notificaciones
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_notificaciones ON notificaciones
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_notificaciones ON notificaciones
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE notificaciones FORCE ROW LEVEL SECURITY;

-- ── brochure_jobs ───────────────────────────────────────────
ALTER TABLE brochure_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_brochure_jobs ON brochure_jobs
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_brochure_jobs ON brochure_jobs
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_brochure_jobs ON brochure_jobs
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE brochure_jobs FORCE ROW LEVEL SECURITY;

-- ── brochure_descargas ──────────────────────────────────────
ALTER TABLE brochure_descargas ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_brochure_descargas ON brochure_descargas
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_brochure_descargas ON brochure_descargas
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_brochure_descargas ON brochure_descargas
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE brochure_descargas FORCE ROW LEVEL SECURITY;

-- ── email_plantillas ────────────────────────────────────────
ALTER TABLE email_plantillas ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_email_plantillas ON email_plantillas
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_email_plantillas ON email_plantillas
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_email_plantillas ON email_plantillas
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE email_plantillas FORCE ROW LEVEL SECURITY;

-- ── email_campanas ──────────────────────────────────────────
ALTER TABLE email_campanas ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_email_campanas ON email_campanas
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_email_campanas ON email_campanas
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_email_campanas ON email_campanas
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE email_campanas FORCE ROW LEVEL SECURITY;

-- ── email_eventos ───────────────────────────────────────────
ALTER TABLE email_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_email_eventos ON email_eventos
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_email_eventos ON email_eventos
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_email_eventos ON email_eventos
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE email_eventos FORCE ROW LEVEL SECURITY;

-- ── whatsapp_envios ─────────────────────────────────────────
ALTER TABLE whatsapp_envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_whatsapp_envios ON whatsapp_envios
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_whatsapp_envios ON whatsapp_envios
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_whatsapp_envios ON whatsapp_envios
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE whatsapp_envios FORCE ROW LEVEL SECURITY;

-- ── sindicacion_publicaciones ───────────────────────────────
ALTER TABLE sindicacion_publicaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_sindicacion ON sindicacion_publicaciones
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_sindicacion ON sindicacion_publicaciones
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_sindicacion ON sindicacion_publicaciones
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE sindicacion_publicaciones FORCE ROW LEVEL SECURITY;

-- ── firma_solicitudes ───────────────────────────────────────
ALTER TABLE firma_solicitudes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_firma_solicitudes ON firma_solicitudes
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_firma_solicitudes ON firma_solicitudes
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_firma_solicitudes ON firma_solicitudes
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE firma_solicitudes FORCE ROW LEVEL SECURITY;

-- ── meta_publicaciones ──────────────────────────────────────
ALTER TABLE meta_publicaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_meta_publicaciones ON meta_publicaciones
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_meta_publicaciones ON meta_publicaciones
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_meta_publicaciones ON meta_publicaciones
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE meta_publicaciones FORCE ROW LEVEL SECURITY;

-- ── config_integraciones ────────────────────────────────────
ALTER TABLE config_integraciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_config_integraciones ON config_integraciones
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_config_integraciones ON config_integraciones
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_config_integraciones ON config_integraciones
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE config_integraciones FORCE ROW LEVEL SECURITY;

-- ── config_portal ───────────────────────────────────────────
-- config_portal es leída también por rutas públicas (portal-config).
-- La política USING permite al portal leer sin tenant_id activo cuando
-- la búsqueda es por dominio (la consulta usa bypass_rls en ese caso).
ALTER TABLE config_portal ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_config_portal ON config_portal
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_config_portal ON config_portal
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY superadmin_bypass_config_portal ON config_portal
  USING (current_setting('app.bypass_rls', true)::text = 'true');
ALTER TABLE config_portal FORCE ROW LEVEL SECURITY;


-- ============================================================
-- SECCIÓN B: Tablas sin tenant_id (defensa en profundidad)
-- Se protegen mediante subquery al padre que sí tiene tenant_id.
-- El bypass de SUPER_ADMIN se aplica solo a las políticas USING
-- ya que INSERT/UPDATE dependen de que el padre sea accesible.
-- ============================================================

-- ── propiedad_imagenes ──────────────────────────────────────
-- Padre: propiedades (tiene tenant_id)
ALTER TABLE propiedad_imagenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_propiedad_imagenes ON propiedad_imagenes
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades
      WHERE tenant_id = current_setting('app.tenant_id', true)::text
    )
    OR current_setting('app.bypass_rls', true)::text = 'true'
  );
CREATE POLICY tenant_insert_propiedad_imagenes ON propiedad_imagenes
  FOR INSERT WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades
      WHERE tenant_id = current_setting('app.tenant_id', true)::text
    )
  );
ALTER TABLE propiedad_imagenes FORCE ROW LEVEL SECURITY;

-- ── propiedad_documentos ────────────────────────────────────
-- Padre: propiedades (tiene tenant_id)
ALTER TABLE propiedad_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_propiedad_documentos ON propiedad_documentos
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades
      WHERE tenant_id = current_setting('app.tenant_id', true)::text
    )
    OR current_setting('app.bypass_rls', true)::text = 'true'
  );
CREATE POLICY tenant_insert_propiedad_documentos ON propiedad_documentos
  FOR INSERT WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades
      WHERE tenant_id = current_setting('app.tenant_id', true)::text
    )
  );
ALTER TABLE propiedad_documentos FORCE ROW LEVEL SECURITY;

-- ── cliente_propiedades ─────────────────────────────────────
-- Padre: clientes (tiene tenant_id)
ALTER TABLE cliente_propiedades ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_cliente_propiedades ON cliente_propiedades
  USING (
    cliente_id IN (
      SELECT id FROM clientes
      WHERE tenant_id = current_setting('app.tenant_id', true)::text
    )
    OR current_setting('app.bypass_rls', true)::text = 'true'
  );
CREATE POLICY tenant_insert_cliente_propiedades ON cliente_propiedades
  FOR INSERT WITH CHECK (
    cliente_id IN (
      SELECT id FROM clientes
      WHERE tenant_id = current_setting('app.tenant_id', true)::text
    )
  );
ALTER TABLE cliente_propiedades FORCE ROW LEVEL SECURITY;

-- ── interacciones ───────────────────────────────────────────
-- Cadena: cliente_propiedades → clientes (tiene tenant_id)
ALTER TABLE interacciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_interacciones ON interacciones
  USING (
    interes_id IN (
      SELECT cp.id FROM cliente_propiedades cp
      JOIN clientes c ON c.id = cp.cliente_id
      WHERE c.tenant_id = current_setting('app.tenant_id', true)::text
    )
    OR current_setting('app.bypass_rls', true)::text = 'true'
  );
CREATE POLICY tenant_insert_interacciones ON interacciones
  FOR INSERT WITH CHECK (
    interes_id IN (
      SELECT cp.id FROM cliente_propiedades cp
      JOIN clientes c ON c.id = cp.cliente_id
      WHERE c.tenant_id = current_setting('app.tenant_id', true)::text
    )
  );
ALTER TABLE interacciones FORCE ROW LEVEL SECURITY;

-- ── visitas ─────────────────────────────────────────────────
-- Cadena: cliente_propiedades → clientes (tiene tenant_id)
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_visitas ON visitas
  USING (
    interes_id IN (
      SELECT cp.id FROM cliente_propiedades cp
      JOIN clientes c ON c.id = cp.cliente_id
      WHERE c.tenant_id = current_setting('app.tenant_id', true)::text
    )
    OR current_setting('app.bypass_rls', true)::text = 'true'
  );
CREATE POLICY tenant_insert_visitas ON visitas
  FOR INSERT WITH CHECK (
    interes_id IN (
      SELECT cp.id FROM cliente_propiedades cp
      JOIN clientes c ON c.id = cp.cliente_id
      WHERE c.tenant_id = current_setting('app.tenant_id', true)::text
    )
  );
ALTER TABLE visitas FORCE ROW LEVEL SECURITY;


-- ============================================================
-- SECCIÓN C: Permisos para el rol maru_app
-- Las tablas nuevas heredan permisos si se usaron DEFAULT
-- PRIVILEGES, pero se listan explícitamente para seguridad.
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON
  propietarios,
  propiedades,
  propiedad_imagenes,
  propiedad_documentos,
  clientes,
  cliente_propiedades,
  interacciones,
  visitas,
  notificaciones,
  brochure_jobs,
  brochure_descargas,
  email_plantillas,
  email_campanas,
  email_eventos,
  whatsapp_envios,
  sindicacion_publicaciones,
  firma_solicitudes,
  meta_publicaciones,
  config_integraciones,
  config_portal
TO maru_app;
