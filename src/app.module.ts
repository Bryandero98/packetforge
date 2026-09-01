import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { GraphModule } from './graph/graph.module';
import { DecisionModule } from './decision/decision.module';
import { DebtModule } from './debt/debt.module';
import { AdapterModule } from './adapter/adapter.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { SearchModule } from './search/search.module';
import { McpModule } from './mcp/mcp.module';
import { HealthModule } from './health/health.module';
import { ExportModule } from './export/export.module';
import { ProjectsModule } from './projects/projects.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RequestLoggerMiddleware } from './logging/request-logger.middleware';

@Module({
  imports: [
    DatabaseModule,
    EmbeddingModule,
    ProjectsModule,
    GraphModule,
    DecisionModule,
    DebtModule,
    AdapterModule,
    SearchModule,
    McpModule,
    HealthModule,
    ExportModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
