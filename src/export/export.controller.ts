import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExportService } from './export.service';

@ApiTags('export')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get()
  @ApiOperation({
    summary:
      'Export the entire graph (every task, decision, and debt note, embeddings included) as one JSON document',
  })
  @Header(
    'Content-Disposition',
    'attachment; filename="packetforge-export.json"',
  )
  @ApiOkResponse()
  export() {
    return this.exportService.exportAll();
  }
}
