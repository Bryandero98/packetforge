import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PgExceptionFilter } from './../src/database/pg-exception.filter';

function errorMessage(body: unknown): string {
  return (body as { message: string }).message;
}

// Regression coverage for a real bug found by hand (originally against
// SQLite, before the Postgres migration): without this filter, a plain
// database constraint violation (missing required field, duplicate primary
// key) reached the client as a bare 500 instead of a status the caller
// could act on. Exercised over real HTTP against a real Postgres database -
// no mocking of drizzle or pg.
//
// Needs a real, already-migrated Postgres reachable at DATABASE_URL (run
// `npm run db:migrate` against it first) - skipped entirely when that's not
// set, so `npm run test:e2e` still passes with no Postgres available
// locally. Not yet wired into CI (see docs/epics/next-gen-features.md,
// Phase 1) - a `services: postgres:` block in the GitHub Actions workflow
// is the natural next step to make this run for real on every push.
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('PgExceptionFilter (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(
      'TRUNCATE tasks, decisions, debt RESTART IDENTITY CASCADE',
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new PgExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    await pool.end();
  });

  it('creates a task normally', async () => {
    await request(app.getHttpServer())
      .post('/graph/tasks')
      .send({ id: 'CARD-MODEL', title: 'Card domain model' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toMatchObject({
          id: 'CARD-MODEL',
          title: 'Card domain model',
        });
      });
  });

  it('maps a missing required field to 400, not a bare 500', async () => {
    await request(app.getHttpServer())
      .post('/graph/tasks')
      .send({ id: 'BAD-TASK' })
      .expect(400)
      .expect((res) => {
        expect(errorMessage(res.body)).toMatch(/title/i);
      });
  });

  it('maps a duplicate primary key to 409, not a bare 500', async () => {
    await request(app.getHttpServer())
      .post('/graph/tasks')
      .send({ id: 'CARD-MODEL', title: 'first' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/graph/tasks')
      .send({ id: 'CARD-MODEL', title: 'second' })
      .expect(409)
      .expect((res) => {
        expect(errorMessage(res.body)).toMatch(/already exists|duplicate/i);
      });
  });

  it('maps a missing required field on /decisions to 400 too', async () => {
    await request(app.getHttpServer())
      .post('/graph/tasks')
      .send({ id: 'CARD-MODEL', title: 'Card domain model' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/decisions')
      .send({ taskId: 'CARD-MODEL' })
      .expect(400)
      .expect((res) => {
        expect(errorMessage(res.body)).toMatch(/note/i);
      });
  });
});
