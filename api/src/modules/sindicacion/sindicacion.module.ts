import { Module } from '@nestjs/common';
import { SindicacionService } from './sindicacion.service';
import { SindicacionController } from './sindicacion.controller';
import { SindicacionScheduler } from './sindicacion.scheduler';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SindicacionController],
  providers: [SindicacionService, SindicacionScheduler],
  exports: [SindicacionService],
})
export class SindicacionModule {}
