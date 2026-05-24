-- Migration: Unify Propietario into Cliente
-- A contact (Cliente) can now be an owner, a buyer/renter, or both.

-- 1. Add new columns to clientes
ALTER TABLE "clientes" ADD COLUMN "nit" TEXT;
ALTER TABLE "clientes" ADD COLUMN "direccion" TEXT;
ALTER TABLE "clientes" ADD COLUMN "es_propietario" BOOLEAN NOT NULL DEFAULT false;

-- 2. Create index for the new column
CREATE INDEX "clientes_tenant_id_es_propietario_idx" ON "clientes"("tenant_id", "es_propietario");

-- 3. Migrate propietarios → clientes
--    Case A: propietario has an email that already exists in clientes (same tenant)
--            → mark that cliente as es_propietario, do NOT insert duplicate
UPDATE "clientes" c
SET es_propietario = true,
    nit = COALESCE(c.nit, p.nit),
    direccion = COALESCE(c.direccion, p.direccion)
FROM "propietarios" p
WHERE c.tenant_id = p.tenant_id
  AND p.email IS NOT NULL
  AND c.email = p.email;

--    Case B: propietario has no matching email in clientes
--            → insert as new cliente record, reusing the same UUID so FK in propiedades still works
INSERT INTO "clientes" (
  id, tenant_id, nombre, telefono, email, dpi, nit, direccion,
  notas, es_propietario, portal_verificado, origen,
  created_at, updated_at
)
SELECT
  p.id,
  p.tenant_id,
  p.nombre,
  p.telefono,
  p.email,
  p.dpi,
  p.nit,
  p.direccion,
  p.notas,
  true,   -- es_propietario
  false,  -- portal_verificado
  'OTRO', -- origen default
  p.created_at,
  p.updated_at
FROM "propietarios" p
WHERE NOT EXISTS (
  SELECT 1 FROM "clientes" c
  WHERE c.tenant_id = p.tenant_id
    AND p.email IS NOT NULL
    AND c.email = p.email
)
  AND NOT EXISTS (
  SELECT 1 FROM "clientes" c WHERE c.id = p.id
);

-- 4. Fix propiedades.propietario_id for Case A propietarios
--    (their UUID is different from the existing cliente record, so we need to remap)
UPDATE "propiedades" pr
SET propietario_id = c.id
FROM "propietarios" p
JOIN "clientes" c
  ON c.tenant_id = p.tenant_id
  AND c.email = p.email
  AND c.id != p.id
WHERE pr.propietario_id = p.id;

-- 5. Drop the old FK from propiedades → propietarios
ALTER TABLE "propiedades" DROP CONSTRAINT IF EXISTS "propiedades_propietario_id_fkey";

-- 6. Add new FK from propiedades → clientes
ALTER TABLE "propiedades"
  ADD CONSTRAINT "propiedades_propietario_id_fkey"
  FOREIGN KEY ("propietario_id")
  REFERENCES "clientes"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- 7. Drop propietarios table (data fully migrated)
DROP TABLE "propietarios";
