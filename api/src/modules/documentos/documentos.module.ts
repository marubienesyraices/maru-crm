import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { CartaComisionController } from './carta-comision.controller';
import { DocumentosScheduler } from './documentos.scheduler';

@Module({
  controllers: [DocumentosController, CartaComisionController],
  providers: [DocumentosScheduler],
})
export class DocumentosModule {}
