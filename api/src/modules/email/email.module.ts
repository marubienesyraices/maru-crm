import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailTrackingController } from './email.tracking.controller';

@Module({
  controllers: [EmailTrackingController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
