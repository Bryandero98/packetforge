import { Module } from '@nestjs/common';
import { AdapterModule } from '../adapter/adapter.module';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';

@Module({
  imports: [AdapterModule],
  controllers: [GraphController],
  providers: [GraphService],
  exports: [GraphService],
})
export class GraphModule {}
