import { Module } from '@nestjs/common';
import { InteraccionesService } from './interacciones.service';
import { InteraccionesController } from './interacciones.controller';

@Module({
  controllers: [InteraccionesController],
  providers: [InteraccionesService],
})
export class InteraccionesModule {}
