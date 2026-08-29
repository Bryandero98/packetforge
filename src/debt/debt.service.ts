import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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
    return entry;
  }

  async listDebt(taskId?: string) {
    const query = this.db.select().from(debt);
    return taskId ? query.where(eq(debt.taskId, taskId)) : query;
  }
}
