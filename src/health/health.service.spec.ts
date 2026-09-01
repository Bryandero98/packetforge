import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { HealthService } from './health.service';

// Real database, same rationale as every other *.service.spec.ts in this
// repo - skipped when DATABASE_URL isn't set.
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('HealthService', () => {
  let service: HealthService;
  let pool: Pool;
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: DRIZZLE, useValue: drizzle(pool, { schema }) },
      ],
    }).compile();
    service = moduleRef.get(HealthService);
  });

  afterEach(async () => {
    await pool.end();
    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  });

  it('reports ok with a real, reachable database', async () => {
    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.checks.database).toBe('ok');
  });

  it('reports the embedding provider as not-configured when GEMINI_API_KEY is unset', async () => {
    delete process.env.GEMINI_API_KEY;

    const result = await service.check();

    expect(result.checks.embeddingProvider).toBe('not-configured');
  });

  it('reports the embedding provider as configured when GEMINI_API_KEY is set', async () => {
    process.env.GEMINI_API_KEY = 'test-key';

    const result = await service.check();

    expect(result.checks.embeddingProvider).toBe('configured');
  });

  it('reports error, not a thrown exception, when the database is unreachable', async () => {
    // A pool pointed at a real-looking but unroutable address - fails
    // fast and predictably, unlike an actually-malformed connection
    // string which pg might reject differently depending on the driver
    // version.
    const badPool = new Pool({
      connectionString: 'postgresql://user:pass@127.0.0.1:1/nonexistent',
      connectionTimeoutMillis: 500,
    });
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: DRIZZLE, useValue: drizzle(badPool, { schema }) },
      ],
    }).compile();
    const brokenService = moduleRef.get(HealthService);

    const result = await brokenService.check();

    expect(result.status).toBe('error');
    expect(result.checks.database).toBe('error');
    await badPool.end();
  });
});
