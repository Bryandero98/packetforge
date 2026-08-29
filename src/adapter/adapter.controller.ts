import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdapterService } from './adapter.service';

@ApiTags('adapters')
@Controller('adapters')
export class AdapterController {
  constructor(private readonly adapterService: AdapterService) {}

  @Get()
  @ApiOperation({ summary: 'List the registered output adapters' })
  @ApiOkResponse({ type: [String] })
  list() {
    return this.adapterService.list();
  }
}
