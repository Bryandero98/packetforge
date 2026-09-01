import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { debt, decisions, tasks } from '../database/schema';

export interface GraphExport {
  readonly exportedAt: string;
  readonly tasks: (typeof tasks.$inferSelect)[];
  readonly decisions: (typeof decisions.$inferSelect)[];
  readonly debt: (typeof debt.$inferSelect)[];
}

// The whole graph is nowhere except this database - unlike code, it isn't
// backed up just by being in git. Embeddings are included, not stripped
// the way getPacket() strips them for an adapter: a real restore
// shouldn't have to re-spend OPENAI_API_KEY calls (or silently lose
// semantic search until every note is rewritten) just because a backup
// left them out.
@Injectable()
export class ExportService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async exportAll(): Promise<GraphExport> {
    const [allTasks, allDecisions, allDebt] = await Promise.all([
      this.db.select().from(tasks),
      this.db.select().from(decisions),
      this.db.select().from(debt),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      tasks: allTasks,
      decisions: allDecisions,
      debt: allDebt,
    };
  }
}
