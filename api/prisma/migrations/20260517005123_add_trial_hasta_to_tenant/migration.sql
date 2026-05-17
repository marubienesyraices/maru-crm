-- AlterEnum
ALTER TYPE "EstadoTenant" ADD VALUE 'TRIAL';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "trial_hasta" TIMESTAMP(3);
