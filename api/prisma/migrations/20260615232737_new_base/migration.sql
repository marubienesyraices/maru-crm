-- CreateTable
CREATE TABLE "config_sistema" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "resend_api_key" TEXT,
    "email_from" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "config_sistema_pkey" PRIMARY KEY ("id")
);
