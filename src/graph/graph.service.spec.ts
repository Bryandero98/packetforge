import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { AuditLogService } from '../audit-log/audit-log.service';
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
      'TRUNCATE tasks, decisions, debt, audit_log RESTART IDENTITY CASCADE',
    );
    // Tasks cascade-delete on their project, so this must run after the
    // tasks truncate above, not before. "default" is never removed - see
    // projects.service.spec.ts's identical rationale.
    await pool.query(`DELETE FROM projects WHERE id != 'default'`);

    const moduleRef = await Test.createTestingModule({
      providers: [
        GraphService,
        AuditLogService,
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

  it('getTimeline merges decisions and debt in chronological order, newest first', async () => {
    await service.createTask('CARD-MODEL', 'Card domain model');
    await pool.query(
      `INSERT INTO decisions (task_id, note, logged_at) VALUES ('CARD-MODEL', 'first decision', now() - interval '2 minutes')`,
    );
    await pool.query(
      `INSERT INTO debt (task_id, note, logged_at) VALUES ('CARD-MODEL', 'the debt', now() - interval '1 minute')`,
    );
    await pool.query(
      `INSERT INTO decisions (task_id, note, logged_at) VALUES ('CARD-MODEL', 'latest decision', now())`,
    );

    const timeline = await service.getTimeline();

    expect(timeline.map((e) => e.note)).toEqual([
      'latest decision',
      'the debt',
      'first decision',
    ]);
    expect(timeline[0].kind).toBe('decision');
    expect(timeline[0].task).toEqual({
      id: 'CARD-MODEL',
      projectId: 'default',
      title: 'Card domain model',
      status: 'pending',
    });
  });

  it('getTimeline(projectId) only includes entries from tasks in that project', async () => {
    await pool.query(
      `INSERT INTO projects (id, name) VALUES ('onramp', 'onramp')`,
    );
    await service.createTask('CARD-MODEL', 'Card domain model');
    await service.createTask('SWEEP', 'Installation sweep', 'onramp');
    await pool.query(
      `INSERT INTO decisions (task_id, note) VALUES ('CARD-MODEL', 'default project decision')`,
    );
    await pool.query(
      `INSERT INTO decisions (task_id, note) VALUES ('SWEEP', 'onramp project decision')`,
    );

    const onrampTimeline = await service.getTimeline('onramp');

    expect(onrampTimeline).toHaveLength(1);
    expect(onrampTimeline[0].note).toBe('onramp project decision');
  });

  it('getTimeline respects a custom limit', async () => {
    await service.createTask('CARD-MODEL', 'Card domain model');
    for (let i = 0; i < 5; i++) {
      await pool.query(
        `INSERT INTO decisions (task_id, note) VALUES ('CARD-MODEL', 'decision ${i}')`,
      );
    }

    const limited = await service.getTimeline(undefined, 2);

    expect(limited).toHaveLength(2);
  });
});
