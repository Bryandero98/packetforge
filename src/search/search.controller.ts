import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { DEFAULT_SEARCH_LIMIT, SearchService } from './search.service';

@Controller('graph')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
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
