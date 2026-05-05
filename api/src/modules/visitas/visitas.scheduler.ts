import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class VisitasScheduler {
  private readonly logger = new Logger(VisitasScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
  ) {}

  // Runs every 30 minutes — finds completed visits with no report filed
  @Cron('*/30 * * * *')
  async checkVisitasPostReporte() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - TWO_HOURS_MS);

    const visitas = await this.prisma.visita.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
        fecha_fin: { lt: cutoff },
        reporte_fecha: null,
      },
      include: {
        interes: {
          include: {
            cliente: { select: { nombre: true } },
            propiedad: { select: { codigo: true, tenant_id: true } },
          },
        },
        agente: { select: { id: true } },
      },
    });

    for (const visita of visitas) {
      const tenantId = visita.interes.propiedad.tenant_id;
      const userId = visita.agente.id;

      const alreadyNotified = await this.prisma.notificacion.findFirst({
        where: {
          user_id: userId,
          entidad_id: visita.id,
          tipo: 'SISTEMA',
          created_at: { gte: new Date(now.getTime() - TWO_HOURS_MS * 12) },
        },
      });

      if (alreadyNotified) continue;

      await this.notificaciones.create({
        tenantId,
        userId,
        tipo: 'SISTEMA',
        titulo: 'Reporte de visita pendiente',
        mensaje: `La visita con ${visita.interes.cliente.nombre} (${visita.interes.propiedad.codigo}) finalizó. Completa el reporte de visita.`,
        entidad: 'visita',
        entidadId: visita.id,
      });

      this.logger.log(`📋 Reporte pendiente notificado: visita ${visita.id}`);
    }
  }
}
