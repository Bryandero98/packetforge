import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { HealthService } from './health.service';

// Deliberately unauthenticated and unversioned under no prefix beyond
// /health - the one endpoint an uptime monitor, a container orchestrator's
// liveness probe, or a load balancer needs to be able to hit without any
// setup. 503 (not 200-with-a-status-field-nobody-checks) when the database
// is unreachable, so a naive "is this a 2xx" check still does the right
// thing. Exempt from the global rate limit for the same reason - a
// monitor polling every few seconds is exactly what this endpoint exists
// to serve, not abuse.
@SkipThrottle()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary:
      "Check the server's own health (database connectivity, embedding provider config)",
  })
  @ApiOkResponse()
  async check(@Res({ passthrough: true }) res: Response) {
    const result = await this.healthService.check();
    res.status(
      result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE,
    );
    return result;
  }
}
