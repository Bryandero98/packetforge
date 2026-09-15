import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { AuditLogService } from '../audit-log/audit-log.service';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { debt, tasks } from '../database/schema';
import { embedSafely } from '../embedding/embed-safely';
import { EMBEDDING_PROVIDER } from '../embedding/embedding.module';
import type { EmbeddingProvider } from '../embedding/embedding-provider.interface';

// Debt records a known limitation a task leaves for the tasks that depend
// on it — what's still wrong, as opposed to `decisions`, which records why
// a task was built the way it was.
@Injectable()
export class DebtService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(EMBEDDING_PROVIDER)
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly auditLogService: AuditLogService,
  ) {}

  async addDebt(taskId: string, note: string) {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    if (!task) {
      throw new NotFoundException(`no such task: ${taskId}`);
    }

    const embedding = await embedSafely(this.embeddingProvider, note);

    const [entry] = await this.db
      .insert(debt)
      .values({ taskId, note, embedding })
      .returning();
    await this.auditLogService.record(
      'debt',
      String(entry.id),
      'created',
      task.projectId,
    );
    return entry;
  }

  async listDebt(taskId?: string) {
    const query = this.db.select().from(debt);
    return taskId ? query.where(eq(debt.taskId, taskId)) : query;
  }

  // Corrects an existing debt note in place - re-embeds it, same rationale
  // as DecisionService.updateDecision: the old embedding described the old
  // text, so it goes stale the moment the note itself changes.
  async updateDebt(id: number, note: string) {
    const [existing] = await this.db.select().from(debt).where(eq(debt.id, id));
    if (!existing) {
      throw new NotFoundException(`no such debt: ${id}`);
    }
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, existing.taskId));

    const embedding = await embedSafely(this.embeddingProvider, note);
    const [entry] = await this.db
      .update(debt)
      .set({ note, embedding })
      .where(eq(debt.id, id))
      .returning();
    await this.auditLogService.record(
      'debt',
      String(entry.id),
      'updated',
      task.projectId,
    );
    return entry;
  }

  async deleteDebt(id: number): Promise<void> {
    const [entry] = await this.db
      .delete(debt)
      .where(eq(debt.id, id))
      .returning();
    if (!entry) {
      throw new NotFoundException(`no such debt: ${id}`);
    }
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, entry.taskId));
    await this.auditLogService.record(
      'debt',
      String(entry.id),
      'deleted',
      task?.projectId,
    );
  }
}
