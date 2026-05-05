import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { CartaComisionController } from './carta-comision.controller';
import { DocumentosScheduler } from './documentos.scheduler';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [NotificacionesModule],
  controllers: [DocumentosController, CartaComisionController],
  providers: [DocumentosScheduler],
})
export class DocumentosModule {}
