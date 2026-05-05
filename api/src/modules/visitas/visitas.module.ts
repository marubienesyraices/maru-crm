import { Module } from '@nestjs/common';
import { VisitasService } from './visitas.service';
import { VisitasController } from './visitas.controller';
import { VisitasPublicController } from './visitas-public.controller';
import { VisitasScheduler } from './visitas.scheduler';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [NotificacionesModule, EmailModule],
  controllers: [VisitasController, VisitasPublicController],
  providers: [VisitasService, VisitasScheduler],
})
export class VisitasModule {}
