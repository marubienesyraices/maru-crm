import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { EmailService } from '../email/email.service';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function fmtFecha(d: Date): string {
  return d.toLocaleString('es-GT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Guatemala',
  });
}

@Injectable()
export class VisitasScheduler {
  private readonly logger = new Logger(VisitasScheduler.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly email: EmailService,
    config: ConfigService,
  ) {
    this.frontendUrl = (
      config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'
    ).replace(/\/$/, '');
  }

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

  // Runs at 8am daily — sends 24h reminder emails to clients with visits tomorrow
  @Cron('0 8 * * *')
  async checkRecordatorios24h() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayStart = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      0,
      0,
      0,
    );
    const dayEnd = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      23,
      59,
      59,
    );

    const visitas = await this.prisma.visita.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
        fecha_inicio: { gte: dayStart, lte: dayEnd },
      },
      include: {
        interes: {
          include: {
            cliente: { select: { nombre: true, email: true } },
            propiedad: {
              select: { id: true, titulo: true, codigo: true, tenant_id: true },
            },
          },
        },
        agente: { select: { nombre: true } },
      },
    });

    for (const visita of visitas) {
      const clienteEmail = visita.interes.cliente.email;
      if (!clienteEmail) continue;

      const tenantId = visita.interes.propiedad.tenant_id;
      const fechaStr = fmtFecha(visita.fecha_inicio);
      const propTitulo = visita.interes.propiedad.titulo;
      const propCodigo = visita.interes.propiedad.codigo;
      const rescheduleUrl = `${this.frontendUrl}/portal/reprogramar/${visita.reschedule_token}`;

      this.email
        .sendClientEmail({
          to: clienteEmail,
          subject: `Recordatorio: Tu visita mañana — ${propTitulo}`,
          heading: `⏰ Recordatorio de visita`,
          body: `Tienes una visita programada para mañana:<br/><br/>
               🏠 <strong>${propTitulo}</strong> (${propCodigo})<br/>
               📅 ${fechaStr}<br/>
               👤 Agente: ${visita.agente.nombre}`,
          cta: { label: 'Confirmar o reprogramar', url: rescheduleUrl },
          tenantId,
        })
        .catch((err) =>
          this.logger.warn(`Reminder email failed visita ${visita.id}: ${err}`),
        );

      this.logger.log(
        `📅 Recordatorio 24h enviado a ${clienteEmail} (visita ${visita.id})`,
      );
    }
  }
}
