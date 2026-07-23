import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SindicacionService } from './sindicacion.service';

// §16 CA-1 — Brecha 1.5: Periodic syndication scheduler based on sinc_frecuencia
@Injectable()
export class SindicacionScheduler {
  private readonly logger = new Logger(SindicacionScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sindicacion: SindicacionService,
  ) {}

  // Runs every hour — respects per-tenant sinc_frecuencia (hora | diario | manual)
  @Cron('0 * * * *') // every hour
  async sincronizarHorarios() {
    const configs = await this.prisma.configSeguridad.findMany({
      where: { sinc_frecuencia: 'hora' },
      select: { tenant_id: true },
    });

    for (const c of configs) {
      this.logger.log(
        `🔄 Sincronizando portales cada hora para tenant ${c.tenant_id}`,
      );
      await this.sindicacion
        .sincronizarPorFrecuencia(c.tenant_id)
        .catch(() => {});
    }
  }

  // Runs daily at 3am — for tenants configured with frequency 'diario'
  @Cron('0 3 * * *') // daily 3am
  async sincronizarDiario() {
    const configs = await this.prisma.configSeguridad.findMany({
      where: { sinc_frecuencia: 'diario' },
      select: { tenant_id: true },
    });

    for (const c of configs) {
      this.logger.log(
        `🔄 Sincronizando portales diariamente para tenant ${c.tenant_id}`,
      );
      await this.sindicacion
        .sincronizarPorFrecuencia(c.tenant_id)
        .catch(() => {});
    }
  }
}
