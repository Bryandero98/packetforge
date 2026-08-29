import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DEFAULT_SEARCH_LIMIT, SearchService } from './search.service';
import { SearchResultDto } from './dto/search-result.dto';

@ApiTags('search')
@Controller('graph')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

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
  @ApiOkResponse({ type: [SearchResultDto] })
  search(@Query('q') q?: string, @Query('limit') limit?: string) {
    if (!q || q.trim() === '') {
      throw new BadRequestException('query param "q" is required');
    }

    const parsedLimit =
      limit === undefined ? DEFAULT_SEARCH_LIMIT : Number(limit);
    if (Number.isNaN(parsedLimit)) {
      throw new BadRequestException('query param "limit" must be a number');
    }

    return this.searchService.search(q, parsedLimit);
  }
}
