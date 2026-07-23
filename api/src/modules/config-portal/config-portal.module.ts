import { Module } from '@nestjs/common';
import { ConfigPortalService } from './config-portal.service';
import {
  ConfigPortalController,
  PortalConfigPublicController,
} from './config-portal.controller';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [ConfigPortalController, PortalConfigPublicController],
  providers: [ConfigPortalService],
  exports: [ConfigPortalService],
})
export class ConfigPortalModule {}
