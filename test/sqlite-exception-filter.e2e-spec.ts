import { randomUUID } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { SqliteExceptionFilter } from './../src/database/sqlite-exception.filter';

function errorMessage(body: unknown): string {
  return (body as { message: string }).message;
}

// Regression coverage for a real bug found by hand: without this filter,
// a plain SQLite constraint violation (missing required field, duplicate
// primary key) reached the client as a bare 500 instead of a status the
// caller could act on. Exercised over real HTTP against a real, file-backed
// SQLite database - no mocking of drizzle or better-sqlite3.
describe('SqliteExceptionFilter (e2e)', () => {
  let app: INestApplication<App>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = join(tmpdir(), `packetforge-test-${randomUUID()}.db`);
    process.env.PACKETFORGE_DB_PATH = dbPath;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new SqliteExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.PACKETFORGE_DB_PATH;
    if (existsSync(dbPath)) unlinkSync(dbPath);
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
        expect(errorMessage(res.body)).toMatch(
          /NOT NULL constraint failed: tasks\.title/,
        );
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
        expect(errorMessage(res.body)).toMatch(
          /UNIQUE constraint failed: tasks\.id/,
        );
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
        expect(errorMessage(res.body)).toMatch(
          /NOT NULL constraint failed: decisions\.note/,
        );
      });
  });
});
