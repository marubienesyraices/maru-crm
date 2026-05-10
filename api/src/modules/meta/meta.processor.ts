import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MetaService } from './meta.service';
import { META_QUEUE, MetaJobData } from './meta.constants';

export { META_QUEUE };
export type { MetaJobData };

@Processor(META_QUEUE)
export class MetaProcessor extends WorkerHost {
  private readonly logger = new Logger(MetaProcessor.name);

  constructor(private readonly meta: MetaService) {
    super();
  }

  async process(job: Job<MetaJobData>): Promise<void> {
    const { publicacionId, tenantId } = job.data;
    this.logger.log(`Publishing scheduled Meta post ${publicacionId}`);
    await this.meta.ejecutarPublicacion(publicacionId, tenantId);
  }
}
