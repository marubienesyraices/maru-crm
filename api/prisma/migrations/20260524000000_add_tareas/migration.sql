-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "PrioridadTarea" AS ENUM ('BAJA', 'MEDIA', 'ALTA');

-- CreateTable
CREATE TABLE "tareas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoTarea" NOT NULL DEFAULT 'PENDIENTE',
    "prioridad" "PrioridadTarea" NOT NULL DEFAULT 'MEDIA',
    "fecha_limite" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tareas_tenant_id_user_id_estado_idx" ON "tareas"("tenant_id", "user_id", "estado");

-- CreateIndex
CREATE INDEX "tareas_tenant_id_fecha_limite_idx" ON "tareas"("tenant_id", "fecha_limite");

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: tenant isolation
ALTER TABLE "tareas" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tareas_tenant_isolation" ON "tareas"
  USING (
    tenant_id = current_setting('app.tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );
