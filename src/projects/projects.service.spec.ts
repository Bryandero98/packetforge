import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { ProjectsService } from './projects.service';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('ProjectsService', () => {
  let service: ProjectsService;
  let pool: Pool;

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    // Never truncate projects - "default" is a seeded, permanent row
    // every task falls back to; only clean up rows a test creates itself.
    await pool.query(`DELETE FROM projects WHERE id != 'default'`);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: DRIZZLE, useValue: drizzle(pool, { schema }) },
      ],
    }).compile();
    service = moduleRef.get(ProjectsService);
  });

  afterEach(async () => {
    await pool.end();
  });

  it('the seeded "default" project always exists', async () => {
    const found = await service.listProjects();

    expect(found.some((p) => p.id === 'default')).toBe(true);
  });

  it('creates a project and reads it back', async () => {
    await service.createProject('onramp', 'onramp');

    const found = await service.listProjects();

    expect(found).toContainEqual(
      expect.objectContaining({ id: 'onramp', name: 'onramp' }),
    );
  });
});
