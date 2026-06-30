import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { CartaComisionController } from './carta-comision.controller';
import { DocumentosScheduler } from './documentos.scheduler';
import { PdfRenderService } from './pdf-render.service';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ConfigDocumentosModule } from '../config-documentos/config-documentos.module';

@Module({
  imports: [NotificacionesModule, ConfigDocumentosModule],
  controllers: [DocumentosController, CartaComisionController],
  providers: [DocumentosScheduler, PdfRenderService],
})
export class DocumentosModule {}
