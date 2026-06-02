import { Module } from '@nestjs/common';
import { BusquedasService } from './busquedas.service';
import { BusquedasController } from './busquedas.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BusquedasController],
  providers: [BusquedasService],
  exports: [BusquedasService],
})
export class BusquedasModule {}
