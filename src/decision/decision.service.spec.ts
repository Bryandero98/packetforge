import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.module';
import { EMBEDDING_PROVIDER } from '../embedding/embedding.module';
import type { EmbeddingProvider } from '../embedding/embedding-provider.interface';
import { EMBEDDING_DIMENSIONS } from '../database/schema';
import * as schema from '../database/schema';
import { DecisionService } from './decision.service';

// A fixed, deterministic vector instead of a real provider - this suite
// tests DecisionService's own logic (the task-exists check, the write, the
// read-back), not embedding quality. SearchService (search.service.spec.ts,
// once it exists) is where real embedding content matters.
class FakeEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'fake';
  readonly dimensions = EMBEDDING_DIMENSIONS;
  embed(): Promise<number[]> {
    return Promise.resolve(new Array<number>(EMBEDDING_DIMENSIONS).fill(0.1));
  }
}

// PacketForge's tests hit a real database, never a mocked query builder - a
// mock can't tell you a foreign key constraint fired or a migration
// produced the table shape the service expects; a real database can. Since
// the Postgres migration, that real database has to be an actual reachable
// Postgres (no in-memory equivalent exists the way SQLite had one) -
// skipped when DATABASE_URL isn't set, and needs the schema already
// migrated (`npm run db:migrate`) before running. Not yet wired into CI
// (see docs/epics/next-gen-features.md, Phase 1).
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('DecisionService', () => {
  let service: DecisionService;
  let pool: Pool;

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(
      'TRUNCATE tasks, decisions, debt RESTART IDENTITY CASCADE',
    );
    await pool.query(
      `INSERT INTO tasks (id, title) VALUES ('TASK-1', 'Example task')`,
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        DecisionService,
        { provide: DRIZZLE, useValue: drizzle(pool, { schema }) },
        { provide: EMBEDDING_PROVIDER, useClass: FakeEmbeddingProvider },
      ],
    }).compile();

    service = moduleRef.get(DecisionService);
  });

  afterEach(async () => {
    await pool.end();
  });

  it('records a decision against a real task and reads it back, with its embedding', async () => {
    await service.addDecision(
      'TASK-1',
      'Chose SQLite for the MVP storage backend',
    );

    const found = await service.listDecisions('TASK-1');

    expect(found).toHaveLength(1);
    expect(found[0].note).toBe('Chose SQLite for the MVP storage backend');
    expect(found[0].embedding).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it('rejects a decision against a task that does not exist', async () => {
    await expect(
      service.addDecision('NO-SUCH-TASK', 'orphan note'),
    ).rejects.toThrow('no such task: NO-SUCH-TASK');
  });
});
