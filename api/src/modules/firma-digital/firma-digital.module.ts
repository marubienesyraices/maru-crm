import { Module } from '@nestjs/common';
import { FirmaDigitalService } from './firma-digital.service';
import { FirmaDigitalController } from './firma-digital.controller';
import { ConfigIntegracionesModule } from '../config-integraciones/config-integraciones.module';

@Module({
  imports: [ConfigIntegracionesModule],
  controllers: [FirmaDigitalController],
  providers: [FirmaDigitalService],
})
export class FirmaDigitalModule {}
