import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { DASHBOARD_HTML } from './dashboard.html';

// Excluded from Swagger - it's a page, not an API operation, and would
// otherwise show up in /docs as a confusing "endpoint that returns HTML".
@ApiExcludeController()
@Controller('dashboard')
export class DashboardController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  serve(): string {
    return DASHBOARD_HTML;
  }
}
