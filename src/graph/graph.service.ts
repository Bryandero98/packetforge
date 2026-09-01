import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { unionAll } from 'drizzle-orm/pg-core';
import type { Packet } from '../adapter/adapter.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { debt, decisions, tasks } from '../database/schema';

export const DEFAULT_TIMELINE_LIMIT = 50;
export const MAX_TIMELINE_LIMIT = 200;

@Injectable()
export class GraphService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly auditLogService: AuditLogService,
  ) {}

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
    await this.auditLogService.record(
      'task',
      task.id,
      'created',
      task.projectId,
    );
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

  // Every decision and debt note (embedded or not - unlike search, this
  // never filters on embedding presence) in chronological order, newest
  // first, each with its parent task inline - a git-log-style view of
  // "what got recorded, and when" that GET /graph/search's similarity
  // ranking can't answer (it only surfaces what's relevant to a query,
  // never "show me everything in order").
  async getTimeline(projectId?: string, limit = DEFAULT_TIMELINE_LIMIT) {
    const boundedLimit = Math.min(Math.max(limit, 1), MAX_TIMELINE_LIMIT);

    const decisionRows = this.db
      .select({
        taskId: tasks.id,
        taskProjectId: tasks.projectId,
        taskTitle: tasks.title,
        taskStatus: tasks.status,
        kind: sql<'decision' | 'debt'>`'decision'`.as('kind'),
        note: decisions.note,
        occurredAt: sql<Date>`${decisions.loggedAt}`.as('occurredAt'),
      })
      .from(decisions)
      .innerJoin(tasks, eq(decisions.taskId, tasks.id));
    const decisionEntries = projectId
      ? decisionRows.where(eq(tasks.projectId, projectId))
      : decisionRows;

    const debtRows = this.db
      .select({
        taskId: tasks.id,
        taskProjectId: tasks.projectId,
        taskTitle: tasks.title,
        taskStatus: tasks.status,
        kind: sql<'decision' | 'debt'>`'debt'`.as('kind'),
        note: debt.note,
        occurredAt: sql<Date>`${debt.loggedAt}`.as('occurredAt'),
      })
      .from(debt)
      .innerJoin(tasks, eq(debt.taskId, tasks.id));
    const debtEntries = projectId
      ? debtRows.where(eq(tasks.projectId, projectId))
      : debtRows;

    const rows = await unionAll(decisionEntries, debtEntries)
      .orderBy(desc(sql.identifier('occurredAt')))
      .limit(boundedLimit);

    return rows.map((row) => ({
      task: {
        id: row.taskId,
        projectId: row.taskProjectId,
        title: row.taskTitle,
        status: row.taskStatus,
      },
      kind: row.kind,
      note: row.note,
      // Unlike a plain typed column select, a raw sql<> fragment (needed
      // here for the .as('occurredAt') alias the union/orderBy requires)
      // doesn't go through drizzle's own date deserializer - confirmed
      // live this arrives as a string, not a Date, so new Date(...) first
      // is required, not defensive-for-no-reason.
      occurredAt: new Date(row.occurredAt).toISOString(),
    }));
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
    await this.auditLogService.record(
      'task',
      task.id,
      'updated',
      task.projectId,
    );
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
    await this.auditLogService.record(
      'task',
      task.id,
      'deleted',
      task.projectId,
    );
  }
}
