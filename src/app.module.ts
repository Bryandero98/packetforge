import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuditLogModule } from './audit-log/audit-log.module';
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
    // Generous global default (100 req/min per IP) - cheap insurance now
    // that this is agent-facing and, before auth exists, unauthenticated:
    // an agent stuck in a retry loop shouldn't be able to hammer the
    // database unbounded. Individual write endpoints layer a stricter
    // @Throttle() on top (see graph/decision/debt/projects controllers).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    AuditLogModule,
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
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
