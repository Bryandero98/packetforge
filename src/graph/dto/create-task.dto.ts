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

  @ApiProperty({
    example: 'default',
    required: false,
    description:
      'Which project this task belongs to - omit to fall back to the "default" project.',
  })
  projectId?: string;
}
