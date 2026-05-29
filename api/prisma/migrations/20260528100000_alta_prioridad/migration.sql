-- P-15: Paleta de colores y logo por empresa en UI del CRM
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS color_primario   VARCHAR(7)  DEFAULT '#1E3A5F';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS color_secundario VARCHAR(7)  DEFAULT '#F5A623';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS color_acento     VARCHAR(7)  DEFAULT '#10B981';

-- F-16: Documentos requeridos al pasar a estado CIERRE
ALTER TABLE cliente_propiedades ADD COLUMN IF NOT EXISTS cierre_documentos JSONB DEFAULT '[]'::jsonb;

-- P-07: Campo adicional en config_integraciones para logo y cláusulas personalizadas de carta de comisión
ALTER TABLE config_integraciones ADD COLUMN IF NOT EXISTS carta_logo_url        TEXT;
ALTER TABLE config_integraciones ADD COLUMN IF NOT EXISTS carta_clausulas_custom TEXT;

-- P-01: Índice para encontrar rápidamente cuentas bloqueadas por Admin
CREATE INDEX IF NOT EXISTS idx_users_bloqueado_hasta ON users(bloqueado_hasta) WHERE bloqueado_hasta IS NOT NULL;
