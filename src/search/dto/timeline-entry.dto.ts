import { ApiProperty } from '@nestjs/swagger';
import { SearchResultTaskDto } from './search-result.dto';

export class TimelineEntryDto {
  @ApiProperty({ type: SearchResultTaskDto })
  task!: SearchResultTaskDto;

  @ApiProperty({ enum: ['decision', 'debt'], example: 'decision' })
  kind!: 'decision' | 'debt';

  @ApiProperty({ example: 'Plain object, not a class - no behavior yet' })
  note!: string;

  @ApiProperty({ example: '2026-09-01T05:00:00.000Z' })
  occurredAt!: string;
}
