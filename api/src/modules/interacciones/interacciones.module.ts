import { Module } from '@nestjs/common';
import { InteraccionesService } from './interacciones.service';
import { InteraccionesController } from './interacciones.controller';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [NotificacionesModule],
  controllers: [InteraccionesController],
  providers: [InteraccionesService],
})
export class InteraccionesModule {}
