import { Module } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { PipelineController } from './pipeline.controller';
import { PipelineScheduler } from './pipeline.scheduler';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { EmailModule } from '../email/email.module';
import { ConfigPortalModule } from '../config-portal/config-portal.module';

@Module({
  imports: [NotificacionesModule, EmailModule, ConfigPortalModule],
  controllers: [PipelineController],
  providers: [PipelineService, PipelineScheduler],
  exports: [PipelineService],
})
export class PipelineModule {}
