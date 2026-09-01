import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { GraphService } from './graph.service';

// Same rationale as decision.service.spec.ts: a real database, never a
// mocked query builder - skipped when DATABASE_URL isn't set.
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('GraphService', () => {
  let service: GraphService;
  let pool: Pool;

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(
      'TRUNCATE tasks, decisions, debt RESTART IDENTITY CASCADE',
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        GraphService,
        { provide: DRIZZLE, useValue: drizzle(pool, { schema }) },
      ],
    }).compile();

    service = moduleRef.get(GraphService);
  });

  afterEach(async () => {
    await pool.end();
  });

  it('reads back a task with its decisions and debt attached', async () => {
    await service.createTask('CARD-MODEL', 'Card domain model');
    await pool.query(
      `INSERT INTO decisions (task_id, note) VALUES ('CARD-MODEL', 'Plain object, no behavior yet')`,
    );
    await pool.query(
      `INSERT INTO debt (task_id, note) VALUES ('CARD-MODEL', 'No validation yet')`,
    );

    const detail = await service.getTaskDetail('CARD-MODEL');

    expect(detail.id).toBe('CARD-MODEL');
    expect(detail.decisions).toHaveLength(1);
    expect(detail.decisions[0].note).toBe('Plain object, no behavior yet');
    expect(detail.debt).toHaveLength(1);
    expect(detail.debt[0].note).toBe('No validation yet');
  });

  it('rejects reading a task that does not exist', async () => {
    await expect(service.getTaskDetail('NO-SUCH-TASK')).rejects.toThrow(
      'no such task: NO-SUCH-TASK',
    );
  });

  it('updates a task status and reads the new value back', async () => {
    await service.createTask('CARD-MODEL', 'Card domain model');

    const updated = await service.updateTaskStatus('CARD-MODEL', 'done');

    expect(updated.status).toBe('done');
    const [detail] = await service.listTasks();
    expect(detail.status).toBe('done');
  });

  it('rejects updating the status of a task that does not exist', async () => {
    await expect(
      service.updateTaskStatus('NO-SUCH-TASK', 'done'),
    ).rejects.toThrow('no such task: NO-SUCH-TASK');
  });

  it('deletes a task, and cascades to its decisions and debt', async () => {
    await service.createTask('CARD-MODEL', 'Card domain model');
    await pool.query(
      `INSERT INTO decisions (task_id, note) VALUES ('CARD-MODEL', 'Plain object, no behavior yet')`,
    );

    await service.deleteTask('CARD-MODEL');

    expect(await service.listTasks()).toEqual([]);
    const { rows } = await pool.query('SELECT * FROM decisions');
    expect(rows).toEqual([]);
  });

  it('rejects deleting a task that does not exist', async () => {
    await expect(service.deleteTask('NO-SUCH-TASK')).rejects.toThrow(
      'no such task: NO-SUCH-TASK',
    );
  });

  it('getPacket strips id/taskId/embedding, converting loggedAt to an ISO string', async () => {
    await service.createTask('CARD-MODEL', 'Card domain model');
    await pool.query(
      `INSERT INTO decisions (task_id, note) VALUES ('CARD-MODEL', 'Plain object, no behavior yet')`,
    );

    const packet = await service.getPacket('CARD-MODEL');

    expect(packet.task).toEqual({
      id: 'CARD-MODEL',
      title: 'Card domain model',
      status: 'pending',
    });
    expect(packet.debt).toEqual([]);
    expect(packet.decisions).toHaveLength(1);
    expect(packet.decisions[0].note).toBe('Plain object, no behavior yet');
    expect(typeof packet.decisions[0].loggedAt).toBe('string');
    expect(new Date(packet.decisions[0].loggedAt).toString()).not.toBe(
      'Invalid Date',
    );
  });

  it('getPacket rejects a task that does not exist', async () => {
    await expect(service.getPacket('NO-SUCH-TASK')).rejects.toThrow(
      'no such task: NO-SUCH-TASK',
    );
  });
});
