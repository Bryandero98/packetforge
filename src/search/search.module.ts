import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  // GraphModule only for GraphService.getTimeline() - GET /graph/timeline
  // lives on SearchController since it's the existing owner of the
  // /graph prefix's read-only, cross-task views (alongside /graph/search),
  // not because it's semantically "search".
  imports: [GraphModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
