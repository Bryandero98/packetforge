import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  status: text('status').notNull().default('pending'),
});

export const decisions = sqliteTable('decisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  note: text('note').notNull(),
  loggedAt: text('logged_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const debt = sqliteTable('debt', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  note: text('note').notNull(),
  loggedAt: text('logged_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});
