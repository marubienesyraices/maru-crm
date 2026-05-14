-- AlterTable: add color_fondo_alterno to tenants
ALTER TABLE "tenants" ADD COLUMN "color_fondo_alterno" TEXT NOT NULL DEFAULT '#111827';
