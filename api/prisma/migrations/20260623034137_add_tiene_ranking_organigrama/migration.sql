-- AlterTable
ALTER TABLE "catalogo_planes" ADD COLUMN     "tiene_organigrama" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tiene_ranking" BOOLEAN NOT NULL DEFAULT false;
