import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';
import { MetaProcessor, META_QUEUE } from './meta.processor';

@Module({
  imports: [BullModule.registerQueue({ name: META_QUEUE })],
  controllers: [MetaController],
  providers: [MetaService, MetaProcessor],
})
export class MetaModule {}
