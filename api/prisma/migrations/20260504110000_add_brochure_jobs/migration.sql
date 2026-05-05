-- CreateEnum
CREATE TYPE "BrochureJobStatus" AS ENUM ('PROCESANDO', 'LISTO', 'ERROR');

-- CreateTable: brochure_jobs (one record per async PDF generation job)
CREATE TABLE "brochure_jobs" (
  "id"           TEXT NOT NULL,
  "propiedad_id" TEXT NOT NULL,
  "tenant_id"    TEXT NOT NULL,
  "user_id"      TEXT NOT NULL,
  "status"       "BrochureJobStatus" NOT NULL DEFAULT 'PROCESANDO',
  "url"          TEXT,
  "error"        TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "brochure_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: brochure_descargas (download tracking per job)
CREATE TABLE "brochure_descargas" (
  "id"            TEXT NOT NULL,
  "job_id"        TEXT NOT NULL,
  "tenant_id"     TEXT NOT NULL,
  "user_id"       TEXT NOT NULL,
  "ip"            TEXT,
  "downloaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "brochure_descargas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "brochure_jobs_propiedad_id_tenant_id_idx" ON "brochure_jobs"("propiedad_id", "tenant_id");
CREATE INDEX "brochure_descargas_job_id_idx"             ON "brochure_descargas"("job_id");
CREATE INDEX "brochure_descargas_tenant_id_downloaded_at_idx" ON "brochure_descargas"("tenant_id", "downloaded_at");

ALTER TABLE "brochure_descargas" ADD CONSTRAINT "brochure_descargas_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "brochure_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
