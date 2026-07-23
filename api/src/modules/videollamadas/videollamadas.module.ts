import { Module } from '@nestjs/common';
import { VideollamadasService } from './videollamadas.service';
import { VideollamadasController } from './videollamadas.controller';
import { ConfigIntegracionesModule } from '../config-integraciones/config-integraciones.module';

@Module({
  imports: [ConfigIntegracionesModule],
  controllers: [VideollamadasController],
  providers: [VideollamadasService],
})
export class VideollamadasModule {}
