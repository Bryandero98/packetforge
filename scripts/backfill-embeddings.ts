import 'reflect-metadata';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, getTableName, isNull } from 'drizzle-orm';
import * as schema from '../src/database/schema';
import { OpenAiEmbeddingProvider } from '../src/embedding/providers/openai-embedding.provider';

// One-off CLI, not a Nest provider: it runs once, outside any request, and
// needs nothing DI gives it (no controllers, no other modules) - a plain
// pg Pool + drizzle connection, same as any of the *.spec.ts suites that
// talk to a real database directly.
//
// Sequential, not Promise.all: this hits OpenAI's embeddings API once per
// row. Backfilling means an existing table, potentially hundreds of old
// notes - firing them all at once risks tripping OpenAI's rate limit on
// the very run meant to fix a gap, not create a new one.
async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required (see .env.example).');
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is required to backfill embeddings (see .env.example).',
    );
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  const provider = new OpenAiEmbeddingProvider();

  try {
    for (const table of [schema.decisions, schema.debt] as const) {
      const rows = await db
        .select({ id: table.id, note: table.note })
        .from(table)
        .where(isNull(table.embedding));

      console.log(`${getTableName(table)}: ${rows.length} row(s) without an embedding`);

      for (const row of rows) {
        try {
          const embedding = await provider.embed(row.note);
          await db
            .update(table)
            .set({ embedding })
            .where(eq(table.id, row.id));
          console.log(`  #${row.id}: embedded`);
        } catch (error) {
          // Same policy as embedSafely at write time: one row failing (a
          // transient API error, a rate limit) doesn't abort the whole
          // backfill - it's reported and the run moves on to the next row,
          // safe to re-run later for whatever's still missing.
          console.error(`  #${row.id}: failed - ${String(error)}`);
        }
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(String(error));
  process.exitCode = 1;
});
