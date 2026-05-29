import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditArchiveScheduler } from './audit-archive.scheduler';
import { StorageModule } from '../storage/storage.module';

@Global()
@Module({
  imports: [StorageModule],
  controllers: [AuditController],
  providers: [AuditService, AuditArchiveScheduler],
  exports: [AuditService],
})
export class AuditModule {}
