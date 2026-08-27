import { Module } from '@nestjs/common';
import { AdapterController } from './adapter.controller';
import { AdapterService } from './adapter.service';
import { GenericJsonAdapter } from './adapters/generic-json.adapter';

@Module({
  controllers: [AdapterController],
  providers: [AdapterService, GenericJsonAdapter],
  exports: [AdapterService],
})
export class AdapterModule {}
