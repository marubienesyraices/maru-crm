import { Module } from '@nestjs/common';
import { PropiedadesService } from './propiedades.service';
import { PropiedadesController } from './propiedades.controller';

@Module({
  controllers: [PropiedadesController],
  providers: [PropiedadesService],
  exports: [PropiedadesService],
})
export class PropiedadesModule {}
