import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Packet } from '../adapter/adapter.interface';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { debt, decisions, tasks } from '../database/schema';

@Injectable()
export class GraphService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async listTasks(projectId?: string) {
    const query = this.db.select().from(tasks);
    return projectId ? query.where(eq(tasks.projectId, projectId)) : query;
  }

  // projectId is optional - omitting it lets the column's own DB-level
  // default ('default') apply, so a caller that predates project scoping
  // (an older MCP client, a script) keeps working exactly as before.
  async createTask(id: string, title: string, projectId?: string) {
    const [task] = await this.db
      .insert(tasks)
      .values({ id, title, ...(projectId ? { projectId } : {}) })
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

  // Same source of truth as getTaskDetail, reshaped into the Packet an
  // adapter actually formats - strips id/taskId/embedding, none of which
  // any adapter's consumer (a human, an AI tool's context window) has a
  // use for.
  async getPacket(id: string): Promise<Packet> {
    const detail = await this.getTaskDetail(id);
    return {
      task: {
        id: detail.id,
        projectId: detail.projectId,
        title: detail.title,
        status: detail.status,
      },
      decisions: detail.decisions.map((entry) => ({
        note: entry.note,
        loggedAt: entry.loggedAt.toISOString(),
      })),
      debt: detail.debt.map((entry) => ({
        note: entry.note,
        loggedAt: entry.loggedAt.toISOString(),
      })),
    };
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
