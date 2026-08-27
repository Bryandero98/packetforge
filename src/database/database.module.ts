import { Global, Module } from '@nestjs/common';
import Database from 'better-sqlite3';
import {
  drizzle,
  type BetterSQLite3Database,
} from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { runMigrations } from './migrations';

export const DRIZZLE = Symbol('DRIZZLE_CONNECTION');

export type DrizzleDb = BetterSQLite3Database<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (): DrizzleDb => {
        const sqlite = new Database(
          process.env.PACKETFORGE_DB_PATH ?? 'packetforge.db',
        );
        sqlite.pragma('journal_mode = WAL');
        runMigrations(sqlite);
        return drizzle(sqlite, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
