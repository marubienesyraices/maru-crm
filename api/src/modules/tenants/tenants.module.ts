import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TenantsScheduler } from './tenants.scheduler';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantsScheduler],
  exports: [TenantsService],
})
export class TenantsModule {}
