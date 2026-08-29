import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  vector,
} from 'drizzle-orm/pg-core';

// 1536 = OpenAI's text-embedding-3-small output size - see
// src/embedding/openai-embedding.provider.ts. Shared here so the column
// width and the provider that fills it can never silently drift apart.
export const EMBEDDING_DIMENSIONS = 1536;

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  status: text('status').notNull().default('pending'),
});

export const decisions = pgTable(
  'decisions',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    note: text('note').notNull(),
    loggedAt: timestamp('logged_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Nullable on purpose: a decision is fully valid with no embedding yet
    // (the provider failed, or the row predates Phase 2 and hasn't been
    // backfilled) - the note itself never depends on this column.
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
  },
  (table) => [
    index('decisions_embedding_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  ],
);

export const debt = pgTable(
  'debt',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    note: text('note').notNull(),
    loggedAt: timestamp('logged_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
  },
  (table) => [
    index('debt_embedding_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  ],
);
