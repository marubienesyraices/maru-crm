import { Module } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionPreferenciasService } from './notificacion-preferencias.service';
import { NotificacionPreferenciasController } from './notificacion-preferencias.controller';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [EmailModule, PrismaModule],
  controllers: [NotificacionesController, NotificacionPreferenciasController],
  providers: [NotificacionesService, NotificacionPreferenciasService],
  exports: [NotificacionesService, NotificacionPreferenciasService],
})
export class NotificacionesModule {}
