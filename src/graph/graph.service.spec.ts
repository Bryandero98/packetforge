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
    // Tasks cascade-delete on their project, so this must run after the
    // tasks truncate above, not before. "default" is never removed - see
    // projects.service.spec.ts's identical rationale.
    await pool.query(`DELETE FROM projects WHERE id != 'default'`);

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
      projectId: 'default',
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

  it('createTask with no projectId falls back to the "default" project', async () => {
    const task = await service.createTask('CARD-MODEL', 'Card domain model');

    expect(task.projectId).toBe('default');
  });

  it('createTask scopes a task to an explicit projectId', async () => {
    await pool.query(
      `INSERT INTO projects (id, name) VALUES ('onramp', 'onramp')`,
    );

    const task = await service.createTask(
      'SWEEP',
      'Installation sweep',
      'onramp',
    );

    expect(task.projectId).toBe('onramp');
  });

  it('listTasks(projectId) only returns tasks scoped to that project', async () => {
    await pool.query(
      `INSERT INTO projects (id, name) VALUES ('onramp', 'onramp')`,
    );
    await service.createTask('CARD-MODEL', 'Card domain model');
    await service.createTask('SWEEP', 'Installation sweep', 'onramp');

    const defaultTasks = await service.listTasks('default');
    const onrampTasks = await service.listTasks('onramp');

    expect(defaultTasks.map((t) => t.id)).toEqual(['CARD-MODEL']);
    expect(onrampTasks.map((t) => t.id)).toEqual(['SWEEP']);
  });

  it('listTasks() with no projectId returns tasks across every project', async () => {
    await pool.query(
      `INSERT INTO projects (id, name) VALUES ('onramp', 'onramp')`,
    );
    await service.createTask('CARD-MODEL', 'Card domain model');
    await service.createTask('SWEEP', 'Installation sweep', 'onramp');

    const all = await service.listTasks();

    expect(all.map((t) => t.id).sort()).toEqual(['CARD-MODEL', 'SWEEP']);
  });
});
