import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { AuditLogService } from './audit-log.service';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('AuditLogService', () => {
  let service: AuditLogService;
  let pool: Pool;

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query('TRUNCATE audit_log RESTART IDENTITY CASCADE');

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: DRIZZLE, useValue: drizzle(pool, { schema }) },
      ],
    }).compile();
    service = moduleRef.get(AuditLogService);
  });

  afterEach(async () => {
    await pool.end();
  });

  it('records an entry and reads it back, newest first', async () => {
    await service.record('task', 'CARD-MODEL', 'created', 'default');
    await service.record('task', 'CARD-MODEL', 'updated', 'default');

    const entries = await service.list();

    expect(entries).toHaveLength(2);
    expect(entries[0].action).toBe('updated');
    expect(entries[1].action).toBe('created');
  });

  it('scopes results to one project when projectId is passed', async () => {
    await service.record('task', 'A', 'created', 'default');
    await service.record('task', 'B', 'created', 'onramp');

    const defaultOnly = await service.list('default');

    expect(defaultOnly).toHaveLength(1);
    expect(defaultOnly[0].entityId).toBe('A');
  });

  it('respects a custom limit', async () => {
    for (let i = 0; i < 5; i++) {
      await service.record('task', `T-${i}`, 'created', 'default');
    }

    const limited = await service.list(undefined, 2);

    expect(limited).toHaveLength(2);
  });
});
