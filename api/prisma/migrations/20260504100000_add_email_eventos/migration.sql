-- CreateTable: email_eventos (open/click tracking for notification emails)
CREATE TABLE "email_eventos" (
  "id"              TEXT NOT NULL,
  "tenant_id"       TEXT NOT NULL,
  "notificacion_id" TEXT,
  "destinatario"    TEXT NOT NULL,
  "tipo"            "TipoNotificacion" NOT NULL,
  "enviado_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "abierto_at"      TIMESTAMP(3),
  "primer_clic_at"  TIMESTAMP(3),
  CONSTRAINT "email_eventos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_eventos_tenant_id_enviado_at_idx" ON "email_eventos"("tenant_id", "enviado_at");
