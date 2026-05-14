import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailTrackingController } from './email.tracking.controller';
import { ConfigIntegracionesModule } from '../config-integraciones/config-integraciones.module';

@Module({
  imports:     [ConfigIntegracionesModule],
  controllers: [EmailTrackingController],
  providers:   [EmailService],
  exports:     [EmailService],
})
export class EmailModule {}
