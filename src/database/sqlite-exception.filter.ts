import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import Database from 'better-sqlite3';
import type { Response } from 'express';

// Drizzle lets better-sqlite3's own constraint errors (missing required
// field, duplicate primary key) bubble straight up from the insert call -
// uncaught, they'd otherwise surface to API clients as a bare 500 instead
// of a response they can act on.
@Catch(Database.SqliteError)
export class SqliteExceptionFilter implements ExceptionFilter {
  catch(
    error: InstanceType<typeof Database.SqliteError>,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const mapped = this.toHttpException(error);
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }

  private toHttpException(
    error: InstanceType<typeof Database.SqliteError>,
  ): HttpException {
    switch (error.code) {
      case 'SQLITE_CONSTRAINT_PRIMARYKEY':
      case 'SQLITE_CONSTRAINT_UNIQUE':
        return new ConflictException(error.message);
      case 'SQLITE_CONSTRAINT_NOTNULL':
      case 'SQLITE_CONSTRAINT_FOREIGNKEY':
      case 'SQLITE_CONSTRAINT_CHECK':
        return new BadRequestException(error.message);
      default:
        return new BadRequestException(error.message);
    }
  }
}
