-- CreateEnum
CREATE TYPE "OrigenCliente" AS ENUM ('PORTAL_WEB', 'REFERIDO', 'LLAMADA', 'WHATSAPP', 'REDES_SOCIALES', 'FERIA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoInteres" AS ENUM ('NUEVO', 'CONTACTADO', 'INTERESADO', 'EN_NEGOCIACION', 'GANADO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "NivelInteres" AS ENUM ('BAJO', 'MEDIO', 'ALTO', 'MUY_ALTO');

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "dpi" TEXT,
    "origen" "OrigenCliente" NOT NULL DEFAULT 'OTRO',
    "notas" TEXT,
    "agente_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_propiedades" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "propiedad_id" TEXT NOT NULL,
    "estado" "EstadoInteres" NOT NULL DEFAULT 'NUEVO',
    "nivel_interes" "NivelInteres" NOT NULL DEFAULT 'MEDIO',
    "presupuesto" DECIMAL(14,2),
    "notas" TEXT,
    "motivo_perdida" TEXT,
    "fecha_contacto" TIMESTAMP(3),
    "fecha_cierre" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_propiedades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clientes_tenant_id_idx" ON "clientes"("tenant_id");

-- CreateIndex
CREATE INDEX "clientes_tenant_id_origen_idx" ON "clientes"("tenant_id", "origen");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_tenant_id_email_key" ON "clientes"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "cliente_propiedades_propiedad_id_estado_idx" ON "cliente_propiedades"("propiedad_id", "estado");

-- CreateIndex
CREATE INDEX "cliente_propiedades_estado_idx" ON "cliente_propiedades"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_propiedades_cliente_id_propiedad_id_key" ON "cliente_propiedades"("cliente_id", "propiedad_id");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_agente_id_fkey" FOREIGN KEY ("agente_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_propiedades" ADD CONSTRAINT "cliente_propiedades_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_propiedades" ADD CONSTRAINT "cliente_propiedades_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
