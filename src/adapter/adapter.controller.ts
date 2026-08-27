import { Controller, Get } from '@nestjs/common';
import { AdapterService } from './adapter.service';

@Controller('adapters')
export class AdapterController {
  constructor(private readonly adapterService: AdapterService) {}

  @Get()
  list() {
    return this.adapterService.list();
  }
}
