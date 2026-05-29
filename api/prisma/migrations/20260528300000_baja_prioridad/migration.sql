-- F-21: Fotografías en reporte de visita
ALTER TABLE visitas ADD COLUMN IF NOT EXISTS fotos_visita JSONB DEFAULT '[]'::jsonb;

-- F-18: @Menciones en notas de interacciones
ALTER TABLE interacciones ADD COLUMN IF NOT EXISTS menciones JSONB DEFAULT '[]'::jsonb;

-- P-05 + P-06: Thumbnail separado y original en imágenes de propiedad
ALTER TABLE propiedad_imagenes ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE propiedad_imagenes ADD COLUMN IF NOT EXISTS original_url  TEXT;

-- P-11: Versioning de plantillas de email
ALTER TABLE email_plantillas ADD COLUMN IF NOT EXISTS version   INTEGER DEFAULT 1;
ALTER TABLE email_plantillas ADD COLUMN IF NOT EXISTS historial JSONB   DEFAULT '[]'::jsonb;

-- F-05: Archivado de audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS archivado        BOOLEAN DEFAULT false;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS archivado_url    TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS archivado_at     TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_audit_archivado ON audit_logs(archivado, created_at);

-- P-02: Rastrear aviso de expiración de contraseña
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_expiry_warned BOOLEAN DEFAULT false;
