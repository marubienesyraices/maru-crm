import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class DocumentosScheduler {
  private readonly logger = new Logger(DocumentosScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkDocumentExpiry() {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    const [expiring, expired] = await Promise.all([
      this.prisma.propiedadDocumento.findMany({
        where: { fecha_vencimiento: { gte: today, lte: in30Days } },
        include: {
          propiedad: {
            select: {
              id: true,
              codigo: true,
              titulo: true,
              tenant_id: true,
              agente_id: true,
            },
          },
        },
        orderBy: { fecha_vencimiento: 'asc' },
      }),
      this.prisma.propiedadDocumento.findMany({
        where: { fecha_vencimiento: { lt: today } },
        include: {
          propiedad: {
            select: {
              id: true,
              codigo: true,
              titulo: true,
              tenant_id: true,
              agente_id: true,
            },
          },
        },
      }),
    ]);

    // Resolve target users per tenant: agente + all admins of that tenant
    const tenantAdmins = await this.resolveTenantAdmins([
      ...expiring,
      ...expired,
    ]);

    for (const doc of expiring) {
      const daysLeft = Math.ceil(
        (doc.fecha_vencimiento!.getTime() - today.getTime()) / 86400000,
      );
      const titulo = `Documento por vencer: ${doc.tipo.replace('_', ' ')}`;
      const mensaje = `"${doc.nombre}" de la propiedad ${doc.propiedad.codigo} vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}.`;

      this.logger.warn(`⚠️ ${titulo} — ${doc.propiedad.codigo}`);

      const targets = this.resolveTargets(doc.propiedad, tenantAdmins);
      await this.createForTargets(
        targets,
        doc.propiedad.tenant_id,
        'DOCUMENTO_POR_VENCER',
        titulo,
        mensaje,
        'PropiedadDocumento',
        doc.id,
      );
    }

    for (const doc of expired) {
      const titulo = `Documento vencido: ${doc.tipo.replace('_', ' ')}`;
      const mensaje = `"${doc.nombre}" de la propiedad ${doc.propiedad.codigo} está vencido.`;

      this.logger.error(`🚨 ${titulo} — ${doc.propiedad.codigo}`);

      const targets = this.resolveTargets(doc.propiedad, tenantAdmins);
      await this.createForTargets(
        targets,
        doc.propiedad.tenant_id,
        'DOCUMENTO_VENCIDO',
        titulo,
        mensaje,
        'PropiedadDocumento',
        doc.id,
      );
    }

    if (expiring.length > 0 || expired.length > 0) {
      this.logger.log(
        `📬 Notificaciones enviadas: ${expiring.length} por vencer, ${expired.length} vencidos`,
      );
    }
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async resolveTenantAdmins(
    docs: { propiedad: { tenant_id: string } }[],
  ) {
    const tenantIds = [...new Set(docs.map((d) => d.propiedad.tenant_id))];
    const admins = await this.prisma.user.findMany({
      where: {
        tenant_id: { in: tenantIds },
        rol: { in: ['ADMIN', 'SUPER_ADMIN'] },
        estado: 'ACTIVO',
      },
      select: { id: true, tenant_id: true },
    });
    // Map: tenantId → adminIds[]
    const map: Record<string, string[]> = {};
    for (const admin of admins) {
      (map[admin.tenant_id] ??= []).push(admin.id);
    }
    return map;
  }

  private resolveTargets(
    propiedad: { tenant_id: string; agente_id: string | null },
    tenantAdmins: Record<string, string[]>,
  ): string[] {
    const ids = new Set<string>(tenantAdmins[propiedad.tenant_id] ?? []);
    if (propiedad.agente_id) ids.add(propiedad.agente_id);
    return [...ids];
  }

  private async createForTargets(
    userIds: string[],
    tenantId: string,
    tipo: 'DOCUMENTO_POR_VENCER' | 'DOCUMENTO_VENCIDO',
    titulo: string,
    mensaje: string,
    entidad: string,
    entidadId: string,
  ) {
    // Avoid duplicate notifications for the same document + user on the same day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const userId of userIds) {
      const alreadyExists = await this.prisma.notificacion.findFirst({
        where: {
          user_id: userId,
          entidad_id: entidadId,
          tipo,
          created_at: { gte: todayStart },
        },
      });

      if (!alreadyExists) {
        await this.notificaciones.create({
          tenantId,
          userId,
          tipo,
          titulo,
          mensaje,
          entidad,
          entidadId,
        });
      }
    }
  }
}
