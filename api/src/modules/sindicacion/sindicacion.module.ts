import { Module } from '@nestjs/common';
import { SindicacionService } from './sindicacion.service';
import { SindicacionController } from './sindicacion.controller';

@Module({
  controllers: [SindicacionController],
  providers: [SindicacionService],
})
export class SindicacionModule {}
