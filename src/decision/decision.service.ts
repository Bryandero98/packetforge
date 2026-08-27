import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { decisions, tasks } from '../database/schema';

// A decision records *why* a task was built the way it was — a pattern, a
// library, a trade-off — so a task that depends on it can inherit that
// reasoning instead of re-deriving it from a diff. Contrast with `debt`,
// which records what's still wrong with a task rather than why it's built
// the way it is.
@Injectable()
export class DecisionService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  addDecision(taskId: string, note: string) {
    const task = this.db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!task) {
      throw new NotFoundException(`no such task: ${taskId}`);
    }

    const [decision] = this.db
      .insert(decisions)
      .values({ taskId, note })
      .returning()
      .all();
    return decision;
  }

  listDecisions(taskId?: string) {
    const query = this.db.select().from(decisions);
    return taskId
      ? query.where(eq(decisions.taskId, taskId)).all()
      : query.all();
  }
}
