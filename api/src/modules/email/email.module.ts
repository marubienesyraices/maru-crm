import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailTrackingController } from './email.tracking.controller';
import { ConfigIntegracionesModule } from '../config-integraciones/config-integraciones.module';
import { ConfigSistemaModule } from '../config-sistema/config-sistema.module';

@Module({
  imports: [ConfigIntegracionesModule, ConfigSistemaModule],
  controllers: [EmailTrackingController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
