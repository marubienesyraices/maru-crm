import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

const UMBRALES = [30, 45, 60]; // días sin actividad → sugerencia escalada
const DEDUP_WINDOW_DAYS = 7;

const SUGERENCIA_POR_UMBRAL: Record<number, string> = {
  30: 'Considera reducir el precio de la propiedad o mejorar las fotografías para aumentar la visibilidad.',
  45: 'La propiedad lleva más de 45 días sin actividad. Evalúa actualizar la descripción, añadir un recorrido virtual o compartirla en redes sociales.',
  60: 'Han transcurrido 60 días sin interacción. Considera pausar la publicación temporalmente o ajustar la estrategia de comercialización.',
};

@Injectable()
export class PropiedadesScheduler {
  private readonly logger = new Logger(PropiedadesScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkPropiedadesEstancadas() {
    const now = new Date();

    // Properties in active states that may be stale
    const propiedades = await this.prisma.propiedad.findMany({
      where: { estado: { in: ['DISPONIBLE', 'RESERVADA'] as any[] } },
      select: {
        id: true,
        titulo: true,
        codigo: true,
        tenant_id: true,
        agente_id: true,
        updated_at: true,
        interesados: {
          select: {
            updated_at: true,
            interacciones: {
              orderBy: { fecha: 'desc' },
              take: 1,
              select: { fecha: true },
            },
            visitas: {
              orderBy: { fecha_inicio: 'desc' },
              take: 1,
              select: { fecha_inicio: true },
            },
          },
        },
      },
    });

    if (!propiedades.length) return;

    const dedupCutoff = new Date(now.getTime() - DEDUP_WINDOW_DAYS * 86_400_000);
    const recentNotifs = await this.prisma.notificacion.findMany({
      where: {
        tipo: 'PROPIEDAD_ESTANCADA',
        entidad_id: { in: propiedades.map((p) => p.id) },
        created_at: { gte: dedupCutoff },
      },
      select: { entidad_id: true },
    });
    const alreadyNotified = new Set(recentNotifs.map((n) => n.entidad_id));

    let sent = 0;
    for (const prop of propiedades) {
      if (alreadyNotified.has(prop.id)) continue;
      if (!prop.agente_id) continue;

      // Find the most recent activity date
      const activityDates: Date[] = [prop.updated_at];
      for (const interes of prop.interesados) {
        activityDates.push(interes.updated_at);
        if (interes.interacciones[0]?.fecha) activityDates.push(interes.interacciones[0].fecha);
        if (interes.visitas[0]?.fecha_inicio) activityDates.push(interes.visitas[0].fecha_inicio);
      }
      const lastActivity = activityDates.reduce((max, d) => (d > max ? d : max));
      const daysSince = Math.floor((now.getTime() - lastActivity.getTime()) / 86_400_000);

      // Find the highest applicable threshold
      const umbral = [...UMBRALES].reverse().find((u) => daysSince >= u);
      if (!umbral) continue;

      const sugerencia = SUGERENCIA_POR_UMBRAL[umbral];
      await this.notificaciones.create({
        tenantId: prop.tenant_id,
        userId: prop.agente_id,
        tipo: 'PROPIEDAD_ESTANCADA',
        titulo: `Propiedad sin actividad: ${prop.titulo}`,
        mensaje: `${prop.titulo} (${prop.codigo}) lleva ${daysSince} días sin actividad. ${sugerencia}`,
        entidad: 'propiedad',
        entidadId: prop.id,
      });
      sent++;
    }

    if (sent > 0) {
      this.logger.warn(`📊 Propiedades estancadas: ${sent} alerta(s) enviada(s)`);
    }
  }
}
