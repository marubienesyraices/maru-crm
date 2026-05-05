-- Add client reschedule-link fields to visitas
ALTER TABLE "visitas" ADD COLUMN "reschedule_token"            TEXT;
ALTER TABLE "visitas" ADD COLUMN "reschedule_expires"          TIMESTAMP(3);
ALTER TABLE "visitas" ADD COLUMN "reschedule_propuesta_inicio" TIMESTAMP(3);
ALTER TABLE "visitas" ADD COLUMN "reschedule_propuesta_fin"    TIMESTAMP(3);
ALTER TABLE "visitas" ADD COLUMN "reschedule_notas"            TEXT;
ALTER TABLE "visitas" ADD COLUMN "reschedule_solicitado_at"    TIMESTAMP(3);

CREATE UNIQUE INDEX "visitas_reschedule_token_key" ON "visitas"("reschedule_token");
