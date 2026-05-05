-- Add portal self-registration fields to clientes
ALTER TABLE "clientes" ADD COLUMN "portal_verificado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clientes" ADD COLUMN "activation_token" TEXT;
ALTER TABLE "clientes" ADD COLUMN "activation_expires" TIMESTAMP(3);

CREATE UNIQUE INDEX "clientes_activation_token_key" ON "clientes"("activation_token");
