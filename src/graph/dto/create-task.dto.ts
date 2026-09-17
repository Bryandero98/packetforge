import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({
    example: 'CARD-MODEL',
    description: 'Unique task identifier - the primary key of the graph.',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    example: 'Card domain model',
    description: 'Short, human-readable label for the task.',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: 'default',
    required: false,
    description:
      'Which project this task belongs to - omit to fall back to the "default" project.',
  })
  @IsOptional()
  @IsString()
  projectId?: string;
}
