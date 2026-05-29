-- F-14: Favoritos de propiedades
CREATE TABLE "favoritos" (
    "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenant_id"    TEXT NOT NULL,
    "cliente_id"   TEXT NOT NULL,
    "propiedad_id" TEXT NOT NULL,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoritos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "favoritos_cliente_id_propiedad_id_key" ON "favoritos"("cliente_id", "propiedad_id");
CREATE INDEX "favoritos_tenant_id_cliente_id_idx" ON "favoritos"("tenant_id", "cliente_id");

ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_cliente_id_fkey"
    FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_propiedad_id_fkey"
    FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "favoritos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "favoritos"
    USING (tenant_id = current_setting('app.tenant_id', true));

-- P-07: Carta de Comisión configurable
ALTER TABLE "config_integraciones"
    ADD COLUMN IF NOT EXISTS "carta_color_primario" TEXT,
    ADD COLUMN IF NOT EXISTS "carta_tagline" TEXT;
