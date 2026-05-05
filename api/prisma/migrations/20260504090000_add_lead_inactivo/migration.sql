-- Add LEAD_INACTIVO to TipoNotificacion enum
ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'LEAD_INACTIVO';
