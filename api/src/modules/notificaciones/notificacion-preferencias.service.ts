import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

// All notification types that can be configured
const TIPOS_NOTIFICACION = [
  'NUEVA_ASIGNACION',
  'LEAD',
  'CITA',
  'TAREA',
  'TRAMITE',
  'SISTEMA',
  'MENCION',
  'MATCH_PROPIEDAD',
  'LEAD_INACTIVO',
  'NEGOCIACION_TIMEOUT',
  'PROPIEDAD_ESTANCADA',
  'DOCUMENTO_POR_VENCER',
  'DOCUMENTO_VENCIDO',
] as const;

@Injectable()
export class NotificacionPreferenciasService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferencias(tenantId: string, userId: string) {
    const existing = await this.prisma.notificacionPreferencia.findMany({
      where: { tenant_id: tenantId, user_id: userId },
    });

    return TIPOS_NOTIFICACION.map((tipo) => {
      const found = existing.find((p) => p.tipo === tipo);
      return (
        found ?? {
          id: null,
          tenant_id: tenantId,
          user_id: userId,
          tipo,
          canal_inapp: true,
          canal_email: true,
          canal_push: true,
          activa: true,
        }
      );
    });
  }

  async upsertPreferencia(
    tenantId: string,
    userId: string,
    tipo: string,
    canales: {
      canal_inapp?: boolean;
      canal_email?: boolean;
      canal_push?: boolean;
      activa?: boolean;
    },
  ) {
    return this.prisma.notificacionPreferencia.upsert({
      where: {
        tenant_id_user_id_tipo: { tenant_id: tenantId, user_id: userId, tipo },
      },
      create: {
        id: randomUUID(),
        tenant_id: tenantId,
        user_id: userId,
        tipo,
        canal_inapp: canales.canal_inapp ?? true,
        canal_email: canales.canal_email ?? true,
        canal_push: canales.canal_push ?? true,
        activa: canales.activa ?? true,
      },
      update: {
        canal_inapp: canales.canal_inapp,
        canal_email: canales.canal_email,
        canal_push: canales.canal_push,
        activa: canales.activa,
      },
    });
  }
}
