import type Database from 'better-sqlite3';

// Schema versioning follows the same pattern PacketForge's authors already
// use in production (hedgehog's build graph): SQLite's own PRAGMA
// user_version tracks the schema version directly in the file header — no
// extra table needed, readable even on a fresh/empty database. Each
// migration below runs once and bumps the version; a database newer than
// this build knows about fails loudly instead of hitting a confusing raw
// SQL error several layers down.

export const CURRENT_SCHEMA_VERSION = 1;

interface Migration {
  version: number;
  migrate: (db: Database.Database) => void;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    migrate: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
          id     TEXT PRIMARY KEY,
          title  TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending'
        );

        CREATE TABLE IF NOT EXISTS decisions (
          id        INTEGER PRIMARY KEY,
          task_id   TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          note      TEXT NOT NULL,
          logged_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS debt (
          id        INTEGER PRIMARY KEY,
          task_id   TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          note      TEXT NOT NULL,
          logged_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
    },
  },
];

export function runMigrations(db: Database.Database): void {
  const current = db.pragma('user_version', { simple: true }) as number;

  if (current > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `This database was created by a newer version of PacketForge (schema v${current}) than this build knows about (schema v${CURRENT_SCHEMA_VERSION}). Upgrade PacketForge before running it against this database.`,
    );
  }

  for (const { version, migrate } of MIGRATIONS) {
    if (version > current) {
      migrate(db);
      db.pragma(`user_version = ${version}`);
    }
  }
}
