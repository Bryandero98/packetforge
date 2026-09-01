import { ApiProperty } from '@nestjs/swagger';

export class SearchResultTaskDto {
  @ApiProperty({ example: 'CARD-MODEL' })
  id!: string;

  @ApiProperty({ example: 'default' })
  projectId!: string;

  @ApiProperty({ example: 'Card domain model' })
  title!: string;

  @ApiProperty({ example: 'pending' })
  status!: string;
}

export class SearchResultMatchDto {
  @ApiProperty({ enum: ['decision', 'debt'], example: 'decision' })
  kind!: 'decision' | 'debt';

  @ApiProperty({ example: 'Plain object, not a class - no behavior yet' })
  note!: string;

  @ApiProperty({
    example: 0.87,
    description: '1 - cosine distance, 0..1, higher is more relevant.',
  })
  similarity!: number;
}

export class SearchResultDto {
  @ApiProperty({ type: SearchResultTaskDto })
  task!: SearchResultTaskDto;

  @ApiProperty({ type: SearchResultMatchDto })
  match!: SearchResultMatchDto;
}
