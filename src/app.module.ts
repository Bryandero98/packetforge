import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { GraphModule } from './graph/graph.module';
import { DecisionModule } from './decision/decision.module';
import { DebtModule } from './debt/debt.module';
import { AdapterModule } from './adapter/adapter.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    DatabaseModule,
    EmbeddingModule,
    GraphModule,
    DecisionModule,
    DebtModule,
    AdapterModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
