import { Module } from '@nestjs/common';
import { ConfigIntegracionesService } from './config-integraciones.service';
import { ConfigIntegracionesController } from './config-integraciones.controller';

@Module({
  controllers: [ConfigIntegracionesController],
  providers:   [ConfigIntegracionesService],
  exports:     [ConfigIntegracionesService],
})
export class ConfigIntegracionesModule {}
