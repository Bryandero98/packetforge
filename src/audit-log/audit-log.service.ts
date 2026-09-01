import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { auditLog } from '../database/schema';

export type AuditEntityType = 'task' | 'decision' | 'debt' | 'project';
export type AuditAction = 'created' | 'updated' | 'deleted';

export const DEFAULT_AUDIT_LOG_LIMIT = 50;
export const MAX_AUDIT_LOG_LIMIT = 200;

// Deliberately fire-and-forget from the caller's perspective in spirit
// (though every call site awaits it, same as any other write) - an audit
// entry records that a write happened, it never gates whether one is
// allowed to. There's no way to call record() and have it reject the
// underlying write.
@Injectable()
export class AuditLogService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async record(
    entityType: AuditEntityType,
    entityId: string,
    action: AuditAction,
    projectId?: string,
  ): Promise<void> {
    await this.db
      .insert(auditLog)
      .values({ entityType, entityId, action, projectId });
  }

  async list(projectId?: string, limit = DEFAULT_AUDIT_LOG_LIMIT) {
    const boundedLimit = Math.min(Math.max(limit, 1), MAX_AUDIT_LOG_LIMIT);
    const query = this.db.select().from(auditLog);
    const filtered = projectId
      ? query.where(eq(auditLog.projectId, projectId))
      : query;
    return filtered.orderBy(desc(auditLog.occurredAt)).limit(boundedLimit);
  }
}
