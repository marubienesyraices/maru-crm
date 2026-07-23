import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';
import { MetaProcessor, META_QUEUE } from './meta.processor';
import { ConfigIntegracionesModule } from '../config-integraciones/config-integraciones.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: META_QUEUE }),
    ConfigIntegracionesModule,
  ],
  controllers: [MetaController],
  providers: [MetaService, MetaProcessor],
})
export class MetaModule {}
