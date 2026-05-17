-- AlterEnum
ALTER TYPE "Plan" ADD VALUE 'BASIC';

-- CreateTable
CREATE TABLE "catalogo_planes" (
    "plan" "Plan" NOT NULL,
    "limite_usuarios" INTEGER NOT NULL,
    "limite_propiedades" INTEGER NOT NULL,
    "tiene_correo" BOOLEAN NOT NULL DEFAULT false,
    "tiene_campanas" BOOLEAN NOT NULL DEFAULT false,
    "tiene_portal" BOOLEAN NOT NULL DEFAULT false,
    "tiene_sitio_propio" BOOLEAN NOT NULL DEFAULT false,
    "tiene_integraciones" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogo_planes_pkey" PRIMARY KEY ("plan")
);
