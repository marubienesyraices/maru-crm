import { Module } from '@nestjs/common';
import { PropiedadesService } from './propiedades.service';
import { PropiedadesController } from './propiedades.controller';
import { PropiedadesScheduler } from './propiedades.scheduler';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [NotificacionesModule, EmailModule],
  controllers: [PropiedadesController],
  providers: [PropiedadesService, PropiedadesScheduler],
  exports: [PropiedadesService],
})
export class PropiedadesModule {}
