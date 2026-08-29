import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, cosineDistance, eq, isNotNull, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { decisions, tasks } from '../database/schema';
import { embedSafely } from '../embedding/embed-safely';
import { EMBEDDING_PROVIDER } from '../embedding/embedding.module';
import type { EmbeddingProvider } from '../embedding/embedding-provider.interface';
import type { DecisionConflict } from './dto/decision.dto';

// A decision is flagged as a conflict against an existing one on the same
// task when they're this semantically close - high enough that the two are
// very likely paraphrases or restatements of the same reasoning, not just
// on a related topic. Not tuned against production data yet (no
// OPENAI_API_KEY has been available to calibrate it against a real
// embedding model) - a reasonable starting point per common practice for
// near-duplicate detection, kept as one named constant so it's a single
// place to adjust once real usage data exists.
export const CONFLICT_SIMILARITY_THRESHOLD = 0.85;
const CONFLICT_CANDIDATE_LIMIT = 5;

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

    // A conflict is a warning, never a rejection - the same "enrichment,
    // not requirement" stance as the embedding itself. Rejecting outright
    // would block a legitimate correction ("we changed our mind, this
    // supersedes the old note") on nothing more than a similarity
    // heuristic; the caller (an agent or a human) is in a better position
    // than this service to decide whether it's a real duplicate.
    const conflicts = embedding
      ? await this.findConflicts(taskId, embedding)
      : [];

    const [decision] = await this.db
      .insert(decisions)
      .values({ taskId, note, embedding })
      .returning();
    return { ...decision, conflicts };
  }

  async listDecisions(taskId?: string) {
    const query = this.db.select().from(decisions);
    return taskId ? query.where(eq(decisions.taskId, taskId)) : query;
  }

  private async findConflicts(
    taskId: string,
    embedding: number[],
  ): Promise<DecisionConflict[]> {
    const distance = sql<number>`${cosineDistance(decisions.embedding, embedding)}`;

    const candidates = await this.db
      .select({ id: decisions.id, note: decisions.note, distance })
      .from(decisions)
      .where(and(eq(decisions.taskId, taskId), isNotNull(decisions.embedding)))
      .orderBy(asc(distance))
      .limit(CONFLICT_CANDIDATE_LIMIT);

    return candidates
      .map((row) => ({
        id: row.id,
        note: row.note,
        similarity: 1 - row.distance,
      }))
      .filter((row) => row.similarity >= CONFLICT_SIMILARITY_THRESHOLD);
  }
}
