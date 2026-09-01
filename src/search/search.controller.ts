import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DEFAULT_TIMELINE_LIMIT, GraphService } from '../graph/graph.service';
import { DEFAULT_SEARCH_LIMIT, SearchService } from './search.service';
import { SearchResultDto } from './dto/search-result.dto';
import { TimelineEntryDto } from './dto/timeline-entry.dto';

// Owns every read-only, cross-task view under /graph - search and the
// timeline both need to join decisions/debt back to their parent task
// the same way, and neither is a task-CRUD operation that belongs on
// GraphController.
@ApiTags('search')
@Controller('graph')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly graphService: GraphService,
  ) {}

  @Get('search')
  @ApiOperation({
    summary:
      'Semantic search over decisions and debt, ranked by cosine similarity',
  })
  @ApiQuery({
    name: 'q',
    description: 'Natural-language query text',
    required: true,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: `Max results, default ${DEFAULT_SEARCH_LIMIT}, capped at 50`,
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description:
      'Scope results to one project - omit to search across every project.',
  })
  @ApiOkResponse({ type: [SearchResultDto] })
  search(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('projectId') projectId?: string,
  ) {
    if (!q || q.trim() === '') {
      throw new BadRequestException('query param "q" is required');
    }

    const parsedLimit =
      limit === undefined ? DEFAULT_SEARCH_LIMIT : Number(limit);
    if (Number.isNaN(parsedLimit)) {
      throw new BadRequestException('query param "limit" must be a number');
    }

    return this.searchService.search(q, parsedLimit, projectId);
  }

  @Get('timeline')
  @ApiOperation({
    summary:
      'Every decision and debt note in chronological order, newest first, each with its parent task inline - a git-log-style view search cannot give you',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter to one project.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: `Max entries, default ${DEFAULT_TIMELINE_LIMIT}, capped at 200`,
  })
  @ApiOkResponse({ type: [TimelineEntryDto] })
  timeline(
    @Query('projectId') projectId?: string,
    @Query('limit') limit?: string,
  ) {
    if (limit === undefined) {
      return this.graphService.getTimeline(projectId);
    }
    const parsedLimit = Number(limit);
    if (Number.isNaN(parsedLimit)) {
      throw new BadRequestException('query param "limit" must be a number');
    }
    return this.graphService.getTimeline(projectId, parsedLimit);
  }
}
