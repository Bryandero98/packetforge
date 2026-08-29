import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({
    example: 'CARD-MODEL',
    description: 'Unique task identifier - the primary key of the graph.',
  })
  id!: string;

  @ApiProperty({
    example: 'Card domain model',
    description: 'Short, human-readable label for the task.',
  })
  title!: string;
}
