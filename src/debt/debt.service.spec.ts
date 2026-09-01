import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { AuditLogService } from '../audit-log/audit-log.service';
import { DRIZZLE } from '../database/database.module';
import { EMBEDDING_PROVIDER } from '../embedding/embedding.module';
import type { EmbeddingProvider } from '../embedding/embedding-provider.interface';
import { EMBEDDING_DIMENSIONS } from '../database/schema';
import * as schema from '../database/schema';
import { DebtService } from './debt.service';

// Same rationale as decision.service.spec.ts: a real database, never a
// mocked query builder.
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

class FakeEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'fake';
  readonly dimensions = EMBEDDING_DIMENSIONS;
  embed(): Promise<number[]> {
    return Promise.resolve(new Array<number>(EMBEDDING_DIMENSIONS).fill(0.1));
  }
}

describeIfDb('DebtService', () => {
  let service: DebtService;
  let pool: Pool;

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(
      'TRUNCATE tasks, decisions, debt, audit_log RESTART IDENTITY CASCADE',
    );
    await pool.query(
      `INSERT INTO tasks (id, title) VALUES ('TASK-1', 'Example task')`,
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        DebtService,
        AuditLogService,
        { provide: DRIZZLE, useValue: drizzle(pool, { schema }) },
        { provide: EMBEDDING_PROVIDER, useClass: FakeEmbeddingProvider },
      ],
    }).compile();

    service = moduleRef.get(DebtService);
  });

  afterEach(async () => {
    await pool.end();
  });

  it('records debt against a real task and reads it back, with its embedding', async () => {
    await service.addDebt('TASK-1', 'Still stores tokens in plaintext');

    const found = await service.listDebt('TASK-1');

    expect(found).toHaveLength(1);
    expect(found[0].note).toBe('Still stores tokens in plaintext');
    expect(found[0].embedding).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it('rejects debt against a task that does not exist', async () => {
    await expect(
      service.addDebt('NO-SUCH-TASK', 'orphan debt'),
    ).rejects.toThrow('no such task: NO-SUCH-TASK');
  });

  it('listDebt with no taskId returns debt across every task', async () => {
    await pool.query(
      `INSERT INTO tasks (id, title) VALUES ('TASK-2', 'Second task')`,
    );
    await service.addDebt('TASK-1', 'First debt');
    await service.addDebt('TASK-2', 'Second debt');

    const found = await service.listDebt();

    expect(found.map((d) => d.note).sort()).toEqual([
      'First debt',
      'Second debt',
    ]);
  });
});
