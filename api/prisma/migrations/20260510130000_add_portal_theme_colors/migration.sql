-- AlterTable: add color_fondo_principal and color_texto to tenants
ALTER TABLE "tenants" ADD COLUMN "color_fondo_principal" TEXT NOT NULL DEFAULT '#0a0e1a';
ALTER TABLE "tenants" ADD COLUMN "color_texto" TEXT NOT NULL DEFAULT '#f1f5f9';
