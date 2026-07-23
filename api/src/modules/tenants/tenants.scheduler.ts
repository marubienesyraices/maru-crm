import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantsScheduler {
  private readonly logger = new Logger(TenantsScheduler.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireTrials() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.tenant.updateMany({
      where: {
        estado: 'TRIAL',
        trial_hasta: { lte: today },
      },
      data: { estado: 'SUSPENDIDA' },
    });

    if (result.count > 0) {
      this.logger.warn(
        `⏰ Trial expirado: ${result.count} empresa(s) pasaron a SUSPENDIDA`,
      );
    }
  }
}
