import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuditLogService, DEFAULT_AUDIT_LOG_LIMIT } from './audit-log.service';
import { AuditLogEntryDto } from './dto/audit-log-entry.dto';

@ApiTags('audit-log')
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({
    summary:
      'Who/what/when for every write, newest first - never truncated by a delete, since entries outlive the entity they describe',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter to one project.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: `Max entries, default ${DEFAULT_AUDIT_LOG_LIMIT}, capped at 200`,
  })
  @ApiOkResponse({ type: [AuditLogEntryDto] })
  list(@Query('projectId') projectId?: string, @Query('limit') limit?: string) {
    if (limit === undefined) {
      return this.auditLogService.list(projectId);
    }
    const parsedLimit = Number(limit);
    if (Number.isNaN(parsedLimit)) {
      throw new BadRequestException('query param "limit" must be a number');
    }
    return this.auditLogService.list(projectId, parsedLimit);
  }
}
