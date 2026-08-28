import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import Database, { type Database as SqliteConnection } from 'better-sqlite3';
import {
  drizzle,
  type BetterSQLite3Database,
} from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { runMigrations } from './migrations';

export const DRIZZLE = Symbol('DRIZZLE_CONNECTION');
const SQLITE_CONNECTION = Symbol('SQLITE_CONNECTION');

export type DrizzleDb = BetterSQLite3Database<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: SQLITE_CONNECTION,
      useFactory: (): SqliteConnection => {
        const sqlite = new Database(
          process.env.PACKETFORGE_DB_PATH ?? 'packetforge.db',
        );
        sqlite.pragma('journal_mode = WAL');
        runMigrations(sqlite);
        return sqlite;
      },
    },
    {
      provide: DRIZZLE,
      inject: [SQLITE_CONNECTION],
      useFactory: (sqlite: SqliteConnection): DrizzleDb =>
        drizzle(sqlite, { schema }),
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(
    @Inject(SQLITE_CONNECTION) private readonly sqlite: SqliteConnection,
  ) {}

  // Without this, the underlying better-sqlite3 file handle outlives the
  // Nest app on shutdown - harmless under WAL on Linux/macOS, but on
  // Windows it leaves the .db file locked (EBUSY) for anything trying to
  // delete or reopen it right after close, tests included.
  onModuleDestroy(): void {
    this.sqlite.close();
  }
}
