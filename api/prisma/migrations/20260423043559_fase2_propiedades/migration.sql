-- CreateEnum
CREATE TYPE "TipoPropiedad" AS ENUM ('CASA', 'APARTAMENTO', 'TERRENO', 'LOCAL_COMERCIAL', 'OFICINA', 'BODEGA', 'FINCA', 'EDIFICIO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoGestion" AS ENUM ('VENTA', 'RENTA', 'AMBAS');

-- CreateEnum
CREATE TYPE "EstadoPropiedad" AS ENUM ('BORRADOR', 'DISPONIBLE', 'RESERVADA', 'EN_NEGOCIACION', 'VENDIDA', 'RENTADA', 'SUSPENDIDA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('ESCRITURA', 'PLANO', 'IUSI', 'BOLETO_COMPRAVENTA', 'CONTRATO_ARRENDAMIENTO', 'DPI_PROPIETARIO', 'OTRO');

-- CreateTable
CREATE TABLE "propietarios" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "dpi" TEXT,
    "nit" TEXT,
    "direccion" TEXT,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propietarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propiedades" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoPropiedad" NOT NULL,
    "gestion" "TipoGestion" NOT NULL,
    "estado" "EstadoPropiedad" NOT NULL DEFAULT 'BORRADOR',
    "precio_venta" DECIMAL(14,2),
    "precio_renta" DECIMAL(14,2),
    "moneda" TEXT NOT NULL DEFAULT 'GTQ',
    "comision_porcentaje" DECIMAL(5,2),
    "departamento" TEXT,
    "municipio" TEXT,
    "zona" TEXT,
    "direccion" TEXT,
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "area_terreno_m2" DECIMAL(12,2),
    "area_construccion_m2" DECIMAL(12,2),
    "habitaciones" INTEGER,
    "banos" INTEGER,
    "parqueos" INTEGER,
    "niveles" INTEGER,
    "ano_construccion" INTEGER,
    "amenidades" JSONB,
    "propietario_id" TEXT,
    "agente_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propiedades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propiedad_imagenes" (
    "id" TEXT NOT NULL,
    "propiedad_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nombre" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'galeria',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "tamano_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propiedad_imagenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propiedad_documentos" (
    "id" TEXT NOT NULL,
    "propiedad_id" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fecha_emision" TIMESTAMP(3),
    "fecha_vencimiento" TIMESTAMP(3),
    "notas" TEXT,
    "tamano_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propiedad_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "propietarios_tenant_id_idx" ON "propietarios"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "propietarios_tenant_id_dpi_key" ON "propietarios"("tenant_id", "dpi");

-- CreateIndex
CREATE INDEX "propiedades_tenant_id_estado_idx" ON "propiedades"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "propiedades_tenant_id_tipo_idx" ON "propiedades"("tenant_id", "tipo");

-- CreateIndex
CREATE INDEX "propiedades_tenant_id_gestion_idx" ON "propiedades"("tenant_id", "gestion");

-- CreateIndex
CREATE INDEX "propiedades_tenant_id_departamento_municipio_idx" ON "propiedades"("tenant_id", "departamento", "municipio");

-- CreateIndex
CREATE UNIQUE INDEX "propiedades_tenant_id_codigo_key" ON "propiedades"("tenant_id", "codigo");

-- CreateIndex
CREATE INDEX "propiedad_imagenes_propiedad_id_orden_idx" ON "propiedad_imagenes"("propiedad_id", "orden");

-- CreateIndex
CREATE INDEX "propiedad_documentos_propiedad_id_idx" ON "propiedad_documentos"("propiedad_id");

-- AddForeignKey
ALTER TABLE "propietarios" ADD CONSTRAINT "propietarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propiedades" ADD CONSTRAINT "propiedades_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propiedades" ADD CONSTRAINT "propiedades_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "propietarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propiedades" ADD CONSTRAINT "propiedades_agente_id_fkey" FOREIGN KEY ("agente_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propiedad_imagenes" ADD CONSTRAINT "propiedad_imagenes_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propiedad_documentos" ADD CONSTRAINT "propiedad_documentos_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
