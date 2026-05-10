import { Module } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { PipelineController } from './pipeline.controller';
import { PipelineScheduler } from './pipeline.scheduler';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [NotificacionesModule, EmailModule],
  controllers: [PipelineController],
  providers: [PipelineService, PipelineScheduler],
  exports: [PipelineService],
})
export class PipelineModule {}
