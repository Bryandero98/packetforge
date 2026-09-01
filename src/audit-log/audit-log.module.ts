import { Global, Module } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';

// Global, same as DatabaseModule/EmbeddingModule - every service that
// writes (graph, decision, debt, projects) needs this, and none of them
// have a reason to import it explicitly one by one.
@Global()
@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
