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

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
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
    this.logger.log(
      `Generating brochure for propiedad ${propiedadId} (job ${jobDbId})`,
    );

    try {
      const { buffer, codigo } = await this.brochureService.generateBuffer(
        propiedadId,
        tenantId,
      );
      const filename = `brochure-${codigo}-${jobDbId}.pdf`;
      const url = await this.storage.upload(
        buffer,
        filename,
        'application/pdf',
      );

      await this.prisma.brochureJob.update({
        where: { id: jobDbId },
        data: { status: 'LISTO', url },
      });

      // Register in Expediente Legal automatically
      await this.prisma.propiedadDocumento.create({
        data: {
          propiedad_id: propiedadId,
          tipo: 'OTRO',
          nombre: `Brochure PDF - ${codigo}`,
          url,
          tamano_bytes: buffer.length,
          notas: `Generado automáticamente`,
        },
      });

      this.logger.log(`Brochure ready: ${url}`);
    } catch (err) {
      const message = toErrorMessage(err);
      this.logger.error(`Brochure job ${jobDbId} failed: ${message}`);
      await this.prisma.brochureJob.update({
        where: { id: jobDbId },
        data: { status: 'ERROR', error: message },
      });
      throw err;
    }
  }
}
