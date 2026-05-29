-- P-12: Modo de asignación de leads del chatbot
ALTER TABLE config_seguridad ADD COLUMN IF NOT EXISTS modo_asignacion_leads VARCHAR(20) DEFAULT 'Manual';
