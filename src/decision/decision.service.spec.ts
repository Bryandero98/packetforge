import { Test } from '@nestjs/testing';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { DRIZZLE } from '../database/database.module';
import { runMigrations } from '../database/migrations';
import * as schema from '../database/schema';
import { DecisionService } from './decision.service';

// PacketForge's tests hit a real SQLite database (in-memory, throwaway) —
// never a mocked query builder. A mock can't tell you a foreign key
// constraint fired or a migration produced the table shape the service
// expects; a real database can.
describe('DecisionService', () => {
  let service: DecisionService;

  beforeEach(async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    sqlite.exec(
      `INSERT INTO tasks (id, title) VALUES ('TASK-1', 'Example task')`,
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        DecisionService,
        { provide: DRIZZLE, useValue: drizzle(sqlite, { schema }) },
      ],
    }).compile();

    service = moduleRef.get(DecisionService);
  });

  it('records a decision against a real task and reads it back', () => {
    service.addDecision('TASK-1', 'Chose SQLite for the MVP storage backend');

    const found = service.listDecisions('TASK-1');

    expect(found).toHaveLength(1);
    expect(found[0].note).toBe('Chose SQLite for the MVP storage backend');
  });

  it('rejects a decision against a task that does not exist', () => {
    expect(() => service.addDecision('NO-SUCH-TASK', 'orphan note')).toThrow(
      'no such task: NO-SUCH-TASK',
    );
  });
});
