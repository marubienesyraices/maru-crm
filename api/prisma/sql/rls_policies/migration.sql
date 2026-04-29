-- ============================================================
-- Row-Level Security (RLS) Policies
-- CRM Maru Bienes y Raíces — Fase 1
-- ============================================================
-- Cada tabla con tenant_id recibe una política que filtra
-- automáticamente los datos por el tenant_id activo en la sesión.
-- El valor se inyecta con: SET app.tenant_id = '<uuid>';
-- ============================================================

-- 1. Crear un rol dedicado para la aplicación (no usar el superuser)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'maru_app') THEN
    CREATE ROLE maru_app LOGIN PASSWORD 'maru_app_2026';
  END IF;
END
$$;

-- Otorgar permisos básicos al rol de app
GRANT USAGE ON SCHEMA public TO maru_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO maru_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO maru_app;

-- ============================================================
-- 2. Habilitar RLS en las tablas con tenant_id
-- ============================================================

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_users ON users
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);

-- Sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_sessions ON sessions
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_sessions ON sessions
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);

-- Audit Logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit ON audit_logs
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_audit ON audit_logs
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);

-- Config Seguridad
ALTER TABLE config_seguridad ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_config ON config_seguridad
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
CREATE POLICY tenant_insert_config ON config_seguridad
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);

-- ============================================================
-- 3. Tabla tenants: solo SUPER_ADMIN puede listar todas.
--    RLS no aplica a esta tabla ya que no tiene tenant_id propio.
-- ============================================================

-- ============================================================
-- 4. Inmutabilidad de audit_logs: revocar UPDATE y DELETE
--    para el rol de la aplicación.
-- ============================================================
REVOKE UPDATE, DELETE ON audit_logs FROM maru_app;

-- ============================================================
-- 5. El owner del esquema (maru_admin, superuser de PG) bypasea
--    RLS automáticamente. Para forzar RLS incluso para el owner:
-- ============================================================
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE config_seguridad FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 6. Política para bypass: permitir operaciones sin tenant_id
--    cuando app.tenant_id no está seteado (ej. login, seed).
--    current_setting con true como segundo param devuelve NULL
--    si no existe, y la política evaluará false = sin acceso.
--    Para el SUPER_ADMIN que necesita ver cross-tenant,
--    se crea una política especial basada en un flag de sesión.
-- ============================================================
CREATE POLICY superadmin_bypass_users ON users
  USING (current_setting('app.bypass_rls', true)::text = 'true');
CREATE POLICY superadmin_bypass_sessions ON sessions
  USING (current_setting('app.bypass_rls', true)::text = 'true');
CREATE POLICY superadmin_bypass_audit ON audit_logs
  USING (current_setting('app.bypass_rls', true)::text = 'true');
CREATE POLICY superadmin_bypass_config ON config_seguridad
  USING (current_setting('app.bypass_rls', true)::text = 'true');
