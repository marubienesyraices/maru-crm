import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * DocumentosScheduler
 * 
 * Cron job that runs daily at 8am to check for legal documents
 * that are expiring within the next 30 days.
 * 
 * Currently logs warnings. In the future, this will trigger
 * in-app notifications and email alerts (Sprint 5 - HU-13.01).
 */
@Injectable()
export class DocumentosScheduler {
  private readonly logger = new Logger(DocumentosScheduler.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkDocumentExpiry() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const today = new Date();

    // Documents expiring within 30 days
    const expiring = await this.prisma.propiedadDocumento.findMany({
      where: {
        fecha_vencimiento: {
          gte: today,
          lte: thirtyDaysFromNow,
        },
      },
      include: {
        propiedad: {
          select: {
            id: true,
            codigo: true,
            titulo: true,
            tenant_id: true,
            agente: { select: { id: true, nombre: true, email: true } },
          },
        },
      },
      orderBy: { fecha_vencimiento: 'asc' },
    });

    if (expiring.length === 0) return;

    this.logger.warn(`⚠️ ${expiring.length} documento(s) por vencer en los próximos 30 días:`);

    for (const doc of expiring) {
      const daysLeft = Math.ceil((doc.fecha_vencimiento!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      this.logger.warn(
        `  📄 ${doc.tipo} — "${doc.nombre}" (${doc.propiedad.codigo}) — vence en ${daysLeft} días` +
        (doc.propiedad.agente ? ` — Agente: ${doc.propiedad.agente.nombre}` : ''),
      );

      // TODO: Sprint 5 — Send in-app notification (HU-13.01)
      // TODO: Sprint 5 — Send email alert to agente
    }

    // Also check already expired
    const expired = await this.prisma.propiedadDocumento.findMany({
      where: {
        fecha_vencimiento: { lt: today },
      },
      include: {
        propiedad: { select: { codigo: true, titulo: true } },
      },
    });

    if (expired.length > 0) {
      this.logger.error(`🚨 ${expired.length} documento(s) VENCIDO(S):`);
      for (const doc of expired) {
        this.logger.error(`  ❌ ${doc.tipo} — "${doc.nombre}" (${doc.propiedad.codigo})`);
      }
    }
  }
}
