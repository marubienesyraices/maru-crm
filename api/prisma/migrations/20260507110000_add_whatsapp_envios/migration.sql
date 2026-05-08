-- Distribución multicanal WhatsApp (HU-05.04)
-- Tracking de envíos de brochures vía WhatsApp Cloud API o wa.me link

CREATE TABLE "whatsapp_envios" (
    "id"               TEXT NOT NULL,
    "tenant_id"        TEXT NOT NULL,
    "propiedad_id"     TEXT NOT NULL,
    "user_id"          TEXT NOT NULL,
    "telefono_destino" TEXT NOT NULL,
    "mensaje"          TEXT,
    "status"           TEXT NOT NULL DEFAULT 'ENVIADO',
    "waba_message_id"  TEXT,
    "error"            TEXT,
    "enviado_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_envios_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_whatsapp_envios_propiedad" ON "whatsapp_envios"("tenant_id", "propiedad_id");
CREATE INDEX "idx_whatsapp_envios_fecha"     ON "whatsapp_envios"("tenant_id", "enviado_at" DESC);
