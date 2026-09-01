import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.module';
import { EMBEDDING_PROVIDER } from '../embedding/embedding.module';
import type { EmbeddingProvider } from '../embedding/embedding-provider.interface';
import { EMBEDDING_DIMENSIONS } from '../database/schema';
import * as schema from '../database/schema';
import { DEFAULT_SEARCH_LIMIT, SearchService } from './search.service';

// One-hot vectors along orthogonal axes: cosine distance between two
// distinct one-hot vectors is always 1 (similarity 0), and a vector against
// itself is always 0 (similarity 1). That makes the *ranking* fully
// predictable without depending on a real embedding model's notion of
// semantic closeness - this suite proves the SQL (unionAll + cosineDistance
// + join back to tasks) orders and scores correctly, not that OpenAI's
// vectors are good. See openai-embedding.provider.spec.ts for the real
// provider's own contract, and docs/epics/next-gen-features.md Phase 4 for
// why the semantic-quality check needs a real API key instead.
function oneHot(axis: number): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  vector[axis] = 1;
  return vector;
}

const VECTORS: Record<string, number[]> = {
  'query: storage backend': oneHot(0),
  'Chose SQLite for the MVP storage backend': oneHot(0),
  'Card domain model is a plain object, no behavior yet': oneHot(1),
  'Auth middleware still stores tokens in plaintext': oneHot(2),
};

class FixedEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'fixed';
  readonly dimensions = EMBEDDING_DIMENSIONS;
  embed(text: string): Promise<number[]> {
    const vector = VECTORS[text];
    if (!vector) {
      throw new Error(`no fixed vector for: ${text}`);
    }
    return Promise.resolve(vector);
  }
}

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('SearchService', () => {
  let service: SearchService;
  let pool: Pool;

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(
      'TRUNCATE tasks, decisions, debt RESTART IDENTITY CASCADE',
    );
    await pool.query(`DELETE FROM projects WHERE id != 'default'`);
    await pool.query(
      `INSERT INTO tasks (id, title) VALUES ('STORAGE', 'Storage backend'), ('CARD-MODEL', 'Card domain model'), ('AUTH', 'Auth middleware')`,
    );

    const db = drizzle(pool, { schema });
    const provider = new FixedEmbeddingProvider();
    await db.insert(schema.decisions).values([
      {
        taskId: 'STORAGE',
        note: 'Chose SQLite for the MVP storage backend',
        embedding: await provider.embed(
          'Chose SQLite for the MVP storage backend',
        ),
      },
      {
        taskId: 'CARD-MODEL',
        note: 'Card domain model is a plain object, no behavior yet',
        embedding: await provider.embed(
          'Card domain model is a plain object, no behavior yet',
        ),
      },
    ]);
    await db.insert(schema.debt).values({
      taskId: 'AUTH',
      note: 'Auth middleware still stores tokens in plaintext',
      embedding: await provider.embed(
        'Auth middleware still stores tokens in plaintext',
      ),
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: DRIZZLE, useValue: db },
        { provide: EMBEDDING_PROVIDER, useClass: FixedEmbeddingProvider },
      ],
    }).compile();

    service = moduleRef.get(SearchService);
  });

  afterEach(async () => {
    await pool.end();
  });

  it('ranks the exact-match note first and unrelated notes after, across decisions and debt', async () => {
    const results = await service.search('query: storage backend');

    expect(results).toHaveLength(3);
    expect(results[0].task.id).toBe('STORAGE');
    expect(results[0].match.kind).toBe('decision');
    expect(results[0].match.similarity).toBeCloseTo(1, 5);

    const rest = results.slice(1);
    expect(rest.map((r) => r.task.id).sort()).toEqual(['AUTH', 'CARD-MODEL']);
    for (const r of rest) {
      expect(r.match.similarity).toBeCloseTo(0, 5);
    }
  });

  it('scopes results to one project when projectId is passed', async () => {
    await pool.query(
      `INSERT INTO projects (id, name) VALUES ('onramp', 'onramp')`,
    );
    await pool.query(
      `INSERT INTO tasks (id, project_id, title) VALUES ('SWEEP', 'onramp', 'Installation sweep')`,
    );
    await pool.query(
      `INSERT INTO decisions (task_id, note, embedding) VALUES ('SWEEP', 'query: storage backend', '[${Array<number>(
        EMBEDDING_DIMENSIONS,
      )
        .fill(0)
        .map((_, i) => (i === 0 ? 1 : 0))
        .join(',')}]')`,
    );

    const defaultOnly = await service.search(
      'query: storage backend',
      DEFAULT_SEARCH_LIMIT,
      'default',
    );
    const onrampOnly = await service.search(
      'query: storage backend',
      DEFAULT_SEARCH_LIMIT,
      'onramp',
    );

    expect(defaultOnly.map((r) => r.task.id)).not.toContain('SWEEP');
    expect(onrampOnly.map((r) => r.task.id)).toEqual(['SWEEP']);
    expect(onrampOnly[0].task.projectId).toBe('onramp');
  });

  it('excludes notes with no embedding from results', async () => {
    await pool.query(
      `INSERT INTO tasks (id, title) VALUES ('NO-EMBED', 'Not yet embedded')`,
    );
    await pool.query(
      `INSERT INTO decisions (task_id, note) VALUES ('NO-EMBED', 'This one has no embedding yet')`,
    );

    const results = await service.search('query: storage backend');

    expect(results.map((r) => r.task.id)).not.toContain('NO-EMBED');
  });
});
