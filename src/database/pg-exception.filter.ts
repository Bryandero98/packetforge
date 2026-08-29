import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { DrizzleQueryError } from 'drizzle-orm';
import type { Response } from 'express';

/** The shape of the real pg error Drizzle nests under DrizzleQueryError.cause. */
interface PgDriverError {
  code?: string;
  detail?: string;
  column?: string;
  message: string;
}

// Structural check, not `instanceof DatabaseError` from the `pg` package -
// deliberately, after finding by hand that Drizzle's node-postgres driver
// never actually throws the raw pg error; it wraps it as
// DrizzleQueryError, with the real pg error (code, detail, column -
// everything this filter needs) nested under `.cause`, typed only as a
// loose `Error`. Duck-typing the cause instead of asserting a class avoids
// the same dual-package-hazard failure mode already hit once this session
// in cliguard's adapters (see SECURITY.md there): even if some future
// dependency bump resolves a second copy of `pg`, a `.code` string is
// still a `.code` string.
function isPgDriverError(error: unknown): error is PgDriverError {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string'
  );
}

// Drizzle lets Postgres's own constraint errors (missing required field,
// duplicate primary key) bubble straight up from the insert call - uncaught,
// they'd otherwise surface to API clients as a bare 500 instead of a
// response they can act on. Mapped by Postgres's own SQLSTATE error codes:
// https://www.postgresql.org/docs/current/errcodes-appendix.html
@Catch(DrizzleQueryError)
export class PgExceptionFilter implements ExceptionFilter {
  catch(error: DrizzleQueryError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const mapped = this.toHttpException(error);
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }

  private toHttpException(error: DrizzleQueryError): HttpException {
    const cause = error.cause;
    if (!isPgDriverError(cause)) {
      return new BadRequestException(error.message);
    }

    switch (cause.code) {
      case '23505': // unique_violation
        return new ConflictException(cause.detail ?? cause.message);
      case '23502': // not_null_violation
        // Postgres's own detail for this one is "Failing row contains
        // (...)" - the whole row, values included, not a message an API
        // client should see. The column that's actually missing is on a
        // different field entirely.
        return new BadRequestException(
          cause.column
            ? `missing required field: ${cause.column}`
            : cause.message,
        );
      case '23503': // foreign_key_violation
      case '23514': // check_violation
        return new BadRequestException(cause.detail ?? cause.message);
      default:
        return new BadRequestException(cause.detail ?? cause.message);
    }
  }
}
