import { Module } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { PipelineController } from './pipeline.controller';
import { PipelineScheduler } from './pipeline.scheduler';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [NotificacionesModule],
  controllers: [PipelineController],
  providers: [PipelineService, PipelineScheduler],
  exports: [PipelineService],
})
export class PipelineModule {}
