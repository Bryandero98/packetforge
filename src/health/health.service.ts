import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';

export interface HealthResult {
  readonly status: 'ok' | 'error';
  readonly checks: {
    readonly database: 'ok' | 'error';
    /** Same lazy env-var check GeminiEmbeddingProvider itself does at call time - not "misconfigured", since search/decisions/debt all work fine without one, just without an embedding. */
    readonly embeddingProvider: 'configured' | 'not-configured';
  };
}

@Injectable()
export class HealthService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async check(): Promise<HealthResult> {
    const database = await this.checkDatabase();
    return {
      status: database === 'ok' ? 'ok' : 'error',
      checks: {
        database,
        embeddingProvider: process.env.GEMINI_API_KEY
          ? 'configured'
          : 'not-configured',
      },
    };
  }

  private async checkDatabase(): Promise<'ok' | 'error'> {
    try {
      await this.db.execute(sql`select 1`);
      return 'ok';
    } catch {
      return 'error';
    }
  }
}
