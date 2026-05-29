import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const RETENTION_MONTHS = 12;
const BATCH_SIZE = 5000;

@Injectable()
export class AuditArchiveScheduler {
  private readonly logger = new Logger(AuditArchiveScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // Run on the 1st of each month at 2:00 AM
  @Cron('0 2 1 * *')
  async archiveOldLogs() {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);

    const logs = await this.prisma.auditLog.findMany({
      where: { created_at: { lt: cutoff }, archivado: false },
      take: BATCH_SIZE,
      orderBy: { created_at: 'asc' },
    });

    if (!logs.length) return;

    const month = cutoff.toISOString().slice(0, 7); // e.g. "2025-05"
    const filename = `audit-archive-${month}-${Date.now()}.json`;
    const buffer = Buffer.from(JSON.stringify(logs, null, 2));

    let archiveUrl: string | null = null;
    try {
      archiveUrl = await this.storage.upload(buffer, `audit/${filename}`, 'application/json');
    } catch (err) {
      this.logger.error(`Failed to upload audit archive: ${err}`);
      return;
    }

    const ids = logs.map((l) => l.id);
    await this.prisma.auditLog.updateMany({
      where: { id: { in: ids } },
      data: { archivado: true, archivado_url: archiveUrl, archivado_at: new Date() },
    });

    this.logger.log(`📦 Audit archive: ${logs.length} registros archivados → ${filename}`);
  }
}
