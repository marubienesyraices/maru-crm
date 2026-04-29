-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "EstadoTenant" AS ENUM ('ACTIVA', 'SUSPENDIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('PENDIENTE', 'ACTIVO', 'SUSPENDIDO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SENIOR', 'JUNIOR');

-- CreateEnum
CREATE TYPE "AccionAudit" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "logo_url" TEXT,
    "color_primario" TEXT NOT NULL DEFAULT '#3b82f6',
    "color_secundario" TEXT NOT NULL DEFAULT '#1e293b',
    "color_acento" TEXT NOT NULL DEFAULT '#8b5cf6',
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "moneda" TEXT NOT NULL DEFAULT 'GTQ',
    "zona_horaria" TEXT NOT NULL DEFAULT 'America/Guatemala',
    "limite_usuarios" INTEGER NOT NULL DEFAULT 10,
    "limite_propiedades" INTEGER NOT NULL DEFAULT 100,
    "estado" "EstadoTenant" NOT NULL DEFAULT 'ACTIVA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'PENDIENTE',
    "id_supervisor" TEXT,
    "totp_secret" TEXT,
    "totp_habilitado" BOOLEAN NOT NULL DEFAULT false,
    "intentos_login" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMP(3),
    "ultimo_login" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3),
    "password_history" JSONB,
    "activation_token" TEXT,
    "activation_expires" TIMESTAMP(3),
    "reset_token" TEXT,
    "reset_token_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nombre_usuario" TEXT NOT NULL,
    "accion" "AccionAudit" NOT NULL,
    "modulo" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "payload_cambio" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_seguridad" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "geo_paises" JSONB,
    "ips_permitidas" JSONB,
    "dias_inactividad_lead" INTEGER NOT NULL DEFAULT 21,
    "senior_puede_ver_upline" BOOLEAN NOT NULL DEFAULT false,
    "buffer_entre_citas_min" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_seguridad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_activation_token_key" ON "users"("activation_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_reset_token_key" ON "users"("reset_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_modulo_idx" ON "audit_logs"("tenant_id", "modulo");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_user_id_idx" ON "audit_logs"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "config_seguridad_tenant_id_key" ON "config_seguridad"("tenant_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_id_supervisor_fkey" FOREIGN KEY ("id_supervisor") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_seguridad" ADD CONSTRAINT "config_seguridad_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
