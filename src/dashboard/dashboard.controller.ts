import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { DASHBOARD_HTML } from './dashboard.html';

// Excluded from Swagger - it's a page, not an API operation, and would
// otherwise show up in /docs as a confusing "endpoint that returns HTML".
// Exempt from the global rate limit - it's a static page a browser may
// reload freely, not a write path worth guarding.
@SkipThrottle()
@ApiExcludeController()
@Controller('dashboard')
export class DashboardController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  serve(): string {
    return DASHBOARD_HTML;
  }
}
