import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { ExportService } from './export.service';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('ExportService', () => {
  let service: ExportService;
  let pool: Pool;

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(
      'TRUNCATE tasks, decisions, debt RESTART IDENTITY CASCADE',
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: DRIZZLE, useValue: drizzle(pool, { schema }) },
      ],
    }).compile();
    service = moduleRef.get(ExportService);
  });

  afterEach(async () => {
    await pool.end();
  });

  it('exports every task, decision, and debt note with a real exportedAt timestamp', async () => {
    await pool.query(
      `INSERT INTO tasks (id, title) VALUES ('CARD-MODEL', 'Card domain model')`,
    );
    await pool.query(
      `INSERT INTO decisions (task_id, note) VALUES ('CARD-MODEL', 'Plain object, no behavior yet')`,
    );
    await pool.query(
      `INSERT INTO debt (task_id, note) VALUES ('CARD-MODEL', 'No validation yet')`,
    );

    const result = await service.exportAll();

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe('CARD-MODEL');
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].note).toBe('Plain object, no behavior yet');
    expect(result.debt).toHaveLength(1);
    expect(result.debt[0].note).toBe('No validation yet');
    expect(new Date(result.exportedAt).toString()).not.toBe('Invalid Date');
  });

  it('exports empty arrays, not an error, when the graph is empty', async () => {
    const result = await service.exportAll();

    expect(result).toMatchObject({ tasks: [], decisions: [], debt: [] });
  });
});
