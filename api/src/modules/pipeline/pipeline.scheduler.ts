import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EstadoInteres, Rol } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

const DEDUP_WINDOW_DAYS = 7;
const ACTIVE_STATES: EstadoInteres[] = [
  'NUEVO',
  'CONTACTADO',
  'INTERESADO',
  'EN_NEGOCIACION',
  'CIERRE',
];
const NEGOCIACION_TIMEOUT_DAYS = 30;

@Injectable()
export class PipelineScheduler {
  private readonly logger = new Logger(PipelineScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkLeadInactivity() {
    const now = new Date();

    // 1. All active pipeline entries with latest activity signals
    const entries = await this.prisma.clientePropiedad.findMany({
      where: { estado: { in: ACTIVE_STATES } },
      select: {
        id: true,
        estado: true,
        updated_at: true,
        cliente: {
          select: { id: true, nombre: true, agente_id: true, tenant_id: true },
        },
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
    });

    if (!entries.length) return;

    // 2. Resolve inactivity thresholds per tenant (default 21 days)
    const tenantIds = [...new Set(entries.map((e) => e.cliente.tenant_id))];
    const configs = await this.prisma.configSeguridad.findMany({
      where: { tenant_id: { in: tenantIds } },
      select: { tenant_id: true, dias_inactividad_lead: true },
    });
    const thresholdMap: Record<string, number> = {};
    for (const c of configs)
      thresholdMap[c.tenant_id] = c.dias_inactividad_lead;

    // 3. Determine which entries are inactive
    const inactive: typeof entries = [];
    for (const entry of entries) {
      const threshold = thresholdMap[entry.cliente.tenant_id] ?? 21;
      const cutoff = new Date(now.getTime() - threshold * 86_400_000);

      const lastActivity = [
        entry.interacciones[0]?.fecha,
        entry.visitas[0]?.fecha_inicio,
        entry.updated_at,
      ]
        .filter((d): d is Date => d instanceof Date)
        .reduce<Date | null>(
          (max, d) => (max === null || d > max ? d : max),
          null,
        );

      if (lastActivity && lastActivity < cutoff) {
        inactive.push(entry);
      }
    }

    if (!inactive.length) return;

    // 4. Batch-check dedup: skip if already notified in last 7 days
    const dedupCutoff = new Date(
      now.getTime() - DEDUP_WINDOW_DAYS * 86_400_000,
    );
    const recentNotifs = await this.prisma.notificacion.findMany({
      where: {
        tipo: 'LEAD_INACTIVO',
        entidad_id: { in: inactive.map((e) => e.id) },
        created_at: { gte: dedupCutoff },
      },
      select: { entidad_id: true },
    });
    const alreadyNotified = new Set(recentNotifs.map((n) => n.entidad_id));

    // 5. Send notifications
    let sent = 0;
    for (const entry of inactive) {
      if (alreadyNotified.has(entry.id)) continue;
      if (!entry.cliente.agente_id) continue;

      const threshold = thresholdMap[entry.cliente.tenant_id] ?? 21;

      const lastActivity = [
        entry.interacciones[0]?.fecha,
        entry.visitas[0]?.fecha_inicio,
        entry.updated_at,
      ]
        .filter((d): d is Date => d instanceof Date)
        .reduce<Date | null>(
          (max, d) => (max === null || d > max ? d : max),
          null,
        )!;

      const daysSince = Math.floor(
        (now.getTime() - lastActivity.getTime()) / 86_400_000,
      );

      await this.notificaciones.create({
        tenantId: entry.cliente.tenant_id,
        userId: entry.cliente.agente_id,
        tipo: 'LEAD_INACTIVO',
        titulo: `Lead inactivo: ${entry.cliente.nombre}`,
        mensaje: `${entry.cliente.nombre} lleva ${daysSince} días sin actividad (umbral: ${threshold} d). Estado actual: ${entry.estado}.`,
        entidad: 'clientePropiedad',
        entidadId: entry.id,
      });

      sent++;
    }

    if (sent > 0) {
      this.logger.warn(
        `🔔 Lead inactivity: ${sent} notificación(es) enviada(s)`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkNegociacionTimeout() {
    const now = new Date();
    const cutoff = new Date(
      now.getTime() - NEGOCIACION_TIMEOUT_DAYS * 86_400_000,
    );
    const dedupCutoff = new Date(
      now.getTime() - DEDUP_WINDOW_DAYS * 86_400_000,
    );

    // Find EN_NEGOCIACION or CIERRE items that entered that state 30+ days ago
    const entries = await this.prisma.clientePropiedad.findMany({
      where: {
        estado: { in: ['EN_NEGOCIACION', 'CIERRE'] as EstadoInteres[] },
        updated_at: { lte: cutoff },
      },
      select: {
        id: true,
        estado: true,
        updated_at: true,
        cliente: {
          select: { id: true, nombre: true, agente_id: true, tenant_id: true },
        },
        propiedad: { select: { id: true, titulo: true, codigo: true } },
      },
    });

    if (!entries.length) return;

    // Dedup check
    const recentNotifs = await this.prisma.notificacion.findMany({
      where: {
        tipo: 'NEGOCIACION_TIMEOUT',
        entidad_id: { in: entries.map((e) => e.id) },
        created_at: { gte: dedupCutoff },
      },
      select: { entidad_id: true },
    });
    const alreadyNotified = new Set(recentNotifs.map((n) => n.entidad_id));

    // Collect admin users per tenant
    const tenantIds = [...new Set(entries.map((e) => e.cliente.tenant_id))];
    const admins = await this.prisma.user.findMany({
      where: {
        tenant_id: { in: tenantIds },
        rol: { in: ['ADMIN', 'SUPER_ADMIN'] as Rol[] },
      },
      select: { id: true, tenant_id: true },
    });
    const adminsByTenant: Record<string, string[]> = {};
    for (const a of admins) {
      (adminsByTenant[a.tenant_id] ??= []).push(a.id);
    }

    let sent = 0;
    for (const entry of entries) {
      if (alreadyNotified.has(entry.id)) continue;

      const days = Math.floor(
        (now.getTime() - entry.updated_at.getTime()) / 86_400_000,
      );
      const propLabel = entry.propiedad ? ` (${entry.propiedad.codigo})` : '';
      const titulo = `Negociación sin avance: ${entry.cliente.nombre}`;
      const mensaje = `El trámite de ${entry.cliente.nombre}${propLabel} lleva ${days} días en estado ${entry.estado} sin cambios.`;

      const recipients = new Set<string>();
      if (entry.cliente.agente_id) recipients.add(entry.cliente.agente_id);
      for (const adminId of adminsByTenant[entry.cliente.tenant_id] ?? [])
        recipients.add(adminId);

      for (const userId of recipients) {
        await this.notificaciones.create({
          tenantId: entry.cliente.tenant_id,
          userId,
          tipo: 'NEGOCIACION_TIMEOUT',
          titulo,
          mensaje,
          entidad: 'clientePropiedad',
          entidadId: entry.id,
        });
      }
      sent++;
    }

    if (sent > 0) {
      this.logger.warn(
        `⏰ Negociación timeout: ${sent} trámite(s) notificado(s)`,
      );
    }
  }
}
