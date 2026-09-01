import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, asc, cosineDistance, eq, isNotNull, sql } from 'drizzle-orm';
import { unionAll } from 'drizzle-orm/pg-core';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { debt, decisions, tasks } from '../database/schema';
import { EMBEDDING_PROVIDER } from '../embedding/embedding.module';
import type { EmbeddingProvider } from '../embedding/embedding-provider.interface';

export const DEFAULT_SEARCH_LIMIT = 10;
export const MAX_SEARCH_LIMIT = 50;

export interface SearchResult {
  task: { id: string; projectId: string; title: string; status: string };
  match: { kind: 'decision' | 'debt'; note: string; similarity: number };
}

@Injectable()
export class SearchService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(EMBEDDING_PROVIDER)
    private readonly embeddingProvider: EmbeddingProvider,
  ) {}

  async search(
    query: string,
    limit = DEFAULT_SEARCH_LIMIT,
    projectId?: string,
  ): Promise<SearchResult[]> {
    const boundedLimit = Math.min(Math.max(limit, 1), MAX_SEARCH_LIMIT);

    // Unlike write-time embedding (embedSafely - a missing vector there just
    // means one note isn't searchable yet), a query the server can't embed
    // has nothing to search with: there's no fallback here, so it's a clear
    // 503 rather than either silently returning no results or a bare 500.
    let queryEmbedding: number[];
    try {
      queryEmbedding = await this.embeddingProvider.embed(query);
    } catch (error) {
      throw new ServiceUnavailableException(
        `semantic search is unavailable right now: ${String(error)}`,
      );
    }

    const decisionMatches = this.db
      .select({
        taskId: tasks.id,
        taskProjectId: tasks.projectId,
        taskTitle: tasks.title,
        taskStatus: tasks.status,
        kind: sql<'decision' | 'debt'>`'decision'`.as('kind'),
        note: decisions.note,
        distance:
          sql<number>`${cosineDistance(decisions.embedding, queryEmbedding)}`.as(
            'distance',
          ),
      })
      .from(decisions)
      .innerJoin(tasks, eq(decisions.taskId, tasks.id))
      .where(
        projectId
          ? and(isNotNull(decisions.embedding), eq(tasks.projectId, projectId))
          : isNotNull(decisions.embedding),
      );

    const debtMatches = this.db
      .select({
        taskId: tasks.id,
        taskProjectId: tasks.projectId,
        taskTitle: tasks.title,
        taskStatus: tasks.status,
        kind: sql<'decision' | 'debt'>`'debt'`.as('kind'),
        note: debt.note,
        distance:
          sql<number>`${cosineDistance(debt.embedding, queryEmbedding)}`.as(
            'distance',
          ),
      })
      .from(debt)
      .innerJoin(tasks, eq(debt.taskId, tasks.id))
      .where(
        projectId
          ? and(isNotNull(debt.embedding), eq(tasks.projectId, projectId))
          : isNotNull(debt.embedding),
      );

    const rows = await unionAll(decisionMatches, debtMatches)
      .orderBy(asc(sql.identifier('distance')))
      .limit(boundedLimit);

    return rows.map((row) => ({
      task: {
        id: row.taskId,
        projectId: row.taskProjectId,
        title: row.taskTitle,
        status: row.taskStatus,
      },
      match: {
        kind: row.kind,
        note: row.note,
        // pgvector's <=> operator returns cosine *distance* (0 = identical,
        // 2 = opposite); flipped to a similarity score (1 = identical) since
        // that's the more natural number for an API consumer ranking
        // results, not implementing the metric itself.
        similarity: 1 - row.distance,
      },
    }));
  }
}
