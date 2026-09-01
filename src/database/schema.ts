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

/**
 * Root of workspace scoping - one PacketForge deployment can now serve
 * multiple repos/projects instead of needing one deployment each.
 * Decisions and debt don't get their own project_id column: they're
 * scoped transitively through task_id -> tasks.project_id, so scoping a
 * query to a project only ever means joining on tasks, never keeping two
 * columns in sync.
 */
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  // DB-level default 'default' (see migration 0003) so every row that
  // existed before this column did is still valid, and so a caller that
  // doesn't know about projects yet (an older MCP client, a script) keeps
  // working exactly as before - "default" is a real project, seeded by
  // the same migration, not a magic string the app has to special-case.
  projectId: text('project_id')
    .notNull()
    .default('default')
    .references(() => projects.id, { onDelete: 'cascade' }),
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

/**
 * Who/what/when for every write - deliberately no foreign keys to
 * tasks/projects: a delete cascading into the audit trail of its own
 * deletion would erase the one record proving the delete happened. Rows
 * here outlive the entity they describe on purpose.
 */
export const auditLog = pgTable('audit_log', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  projectId: text('project_id'),
  occurredAt: timestamp('occurred_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
