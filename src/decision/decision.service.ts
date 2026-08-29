import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { decisions, tasks } from '../database/schema';
import { embedSafely } from '../embedding/embed-safely';
import { EMBEDDING_PROVIDER } from '../embedding/embedding.module';
import type { EmbeddingProvider } from '../embedding/embedding-provider.interface';

// A decision records *why* a task was built the way it was — a pattern, a
// library, a trade-off — so a task that depends on it can inherit that
// reasoning instead of re-deriving it from a diff. Contrast with `debt`,
// which records what's still wrong with a task rather than why it's built
// the way it is.
@Injectable()
export class DecisionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(EMBEDDING_PROVIDER)
    private readonly embeddingProvider: EmbeddingProvider,
  ) {}

  async addDecision(taskId: string, note: string) {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    if (!task) {
      throw new NotFoundException(`no such task: ${taskId}`);
    }

    const embedding = await embedSafely(this.embeddingProvider, note);

    const [decision] = await this.db
      .insert(decisions)
      .values({ taskId, note, embedding })
      .returning();
    return decision;
  }

  async listDecisions(taskId?: string) {
    const query = this.db.select().from(decisions);
    return taskId ? query.where(eq(decisions.taskId, taskId)) : query;
  }
}
