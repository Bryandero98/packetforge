import { Module } from '@nestjs/common';
import { AdapterController } from './adapter.controller';
import { AdapterService } from './adapter.service';
import { CursorAdapter } from './adapters/cursor.adapter';
import { GenericJsonAdapter } from './adapters/generic-json.adapter';

@Module({
  controllers: [AdapterController],
  providers: [AdapterService, GenericJsonAdapter, CursorAdapter],
  exports: [AdapterService],
})
export class AdapterModule {}
