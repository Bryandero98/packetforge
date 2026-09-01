import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { debt, decisions, tasks } from '../database/schema';

@Injectable()
export class GraphService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async listTasks() {
    return this.db.select().from(tasks);
  }

  async createTask(id: string, title: string) {
    const [task] = await this.db
      .insert(tasks)
      .values({ id, title })
      .returning();
    return task;
  }

  // Resolves a task with every decision and debt note already attached, in
  // one round trip - the same reason GET /graph/search already returns its
  // parent task inline instead of making the caller chain requests.
  async getTaskDetail(id: string) {
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) {
      throw new NotFoundException(`no such task: ${id}`);
    }

    const [taskDecisions, taskDebt] = await Promise.all([
      this.db.select().from(decisions).where(eq(decisions.taskId, id)),
      this.db.select().from(debt).where(eq(debt.taskId, id)),
    ]);

    return { ...task, decisions: taskDecisions, debt: taskDebt };
  }

  async updateTaskStatus(id: string, status: string) {
    const [task] = await this.db
      .update(tasks)
      .set({ status })
      .where(eq(tasks.id, id))
      .returning();
    if (!task) {
      throw new NotFoundException(`no such task: ${id}`);
    }
    return task;
  }

  // Decisions and debt cascade-delete with their task (see the `onDelete:
  // "cascade"` foreign keys in schema.ts) - a task's whole subgraph goes
  // with it, deliberately, rather than leaving orphaned notes an agent
  // could still read but that no longer point anywhere meaningful.
  async deleteTask(id: string) {
    const [task] = await this.db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning();
    if (!task) {
      throw new NotFoundException(`no such task: ${id}`);
    }
  }
}
