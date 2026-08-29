import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { DecisionModule } from '../decision/decision.module';
import { DebtModule } from '../debt/debt.module';
import { SearchModule } from '../search/search.module';
import { McpController } from './mcp.controller';
import { McpServerFactory } from './mcp-server.factory';

@Module({
  imports: [GraphModule, DecisionModule, DebtModule, SearchModule],
  controllers: [McpController],
  providers: [McpServerFactory],
})
export class McpModule {}
