import { Module } from '@nestjs/common';
import { ConfigSistemaService } from './config-sistema.service';
import { ConfigSistemaController } from './config-sistema.controller';

@Module({
  controllers: [ConfigSistemaController],
  providers: [ConfigSistemaService],
  exports: [ConfigSistemaService],
})
export class ConfigSistemaModule {}
