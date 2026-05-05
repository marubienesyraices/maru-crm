import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BrochureController } from './brochure.controller';
import { BrochureProcessor } from './brochure.processor';
import { BrochureService } from './brochure.service';
import { BROCHURE_QUEUE } from './brochure.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: BROCHURE_QUEUE }),
  ],
  controllers: [BrochureController],
  providers: [BrochureService, BrochureProcessor],
})
export class BrochureModule {}
