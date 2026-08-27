import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { debt, tasks } from '../database/schema';

// Debt records a known limitation a task leaves for the tasks that depend
// on it — what's still wrong, as opposed to `decisions`, which records why
// a task was built the way it was.
@Injectable()
export class DebtService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  addDebt(taskId: string, note: string) {
    const task = this.db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!task) {
      throw new NotFoundException(`no such task: ${taskId}`);
    }

    const [entry] = this.db
      .insert(debt)
      .values({ taskId, note })
      .returning()
      .all();
    return entry;
  }

  listDebt(taskId?: string) {
    const query = this.db.select().from(debt);
    return taskId ? query.where(eq(debt.taskId, taskId)).all() : query.all();
  }
}
