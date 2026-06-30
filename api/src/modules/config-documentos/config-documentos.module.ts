import { Module } from '@nestjs/common';
import { ConfigDocumentosController } from './config-documentos.controller';
import { ConfigDocumentosService } from './config-documentos.service';

@Module({
  controllers: [ConfigDocumentosController],
  providers: [ConfigDocumentosService],
  exports: [ConfigDocumentosService],
})
export class ConfigDocumentosModule {}
