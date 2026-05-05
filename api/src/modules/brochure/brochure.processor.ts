import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { BrochureService } from './brochure.service';

export const BROCHURE_QUEUE = 'brochure';

export interface BrochureJobData {
  jobDbId: string;
  propiedadId: string;
  tenantId: string;
  userId: string;
}

@Processor(BROCHURE_QUEUE)
export class BrochureProcessor extends WorkerHost {
  private readonly logger = new Logger(BrochureProcessor.name);

  constructor(
    private readonly brochureService: BrochureService,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<BrochureJobData>): Promise<void> {
    const { jobDbId, propiedadId, tenantId } = job.data;
    this.logger.log(`Generating brochure for propiedad ${propiedadId} (job ${jobDbId})`);

    try {
      const { buffer, codigo } = await this.brochureService.generateBuffer(propiedadId, tenantId);
      const filename = `brochure-${codigo}-${jobDbId}.pdf`;
      const url = await this.storage.upload(buffer, filename, 'application/pdf');

      await this.prisma.brochureJob.update({
        where: { id: jobDbId },
        data: { status: 'LISTO', url },
      });

      this.logger.log(`Brochure ready: ${url}`);
    } catch (err: any) {
      this.logger.error(`Brochure job ${jobDbId} failed: ${err?.message}`);
      await this.prisma.brochureJob.update({
        where: { id: jobDbId },
        data: { status: 'ERROR', error: String(err?.message ?? err) },
      });
      throw err;
    }
  }
}
