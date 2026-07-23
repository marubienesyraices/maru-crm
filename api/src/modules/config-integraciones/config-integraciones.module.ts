import { Module } from '@nestjs/common';
import { ConfigIntegracionesService } from './config-integraciones.service';
import {
  ConfigIntegracionesController,
  CartaConfigController,
} from './config-integraciones.controller';

@Module({
  controllers: [ConfigIntegracionesController, CartaConfigController],
  providers: [ConfigIntegracionesService],
  exports: [ConfigIntegracionesService],
})
export class ConfigIntegracionesModule {}
