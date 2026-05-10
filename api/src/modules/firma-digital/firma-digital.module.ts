import { Module } from '@nestjs/common';
import { FirmaDigitalService } from './firma-digital.service';
import { FirmaDigitalController } from './firma-digital.controller';

@Module({
  controllers: [FirmaDigitalController],
  providers: [FirmaDigitalService],
})
export class FirmaDigitalModule {}
