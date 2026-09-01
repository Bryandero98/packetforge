import { ApiProperty } from '@nestjs/swagger';

export class TaskDto {
  @ApiProperty({ example: 'CARD-MODEL' })
  id!: string;

  @ApiProperty({
    example: 'default',
    description: 'Which project this task belongs to.',
  })
  projectId!: string;

  @ApiProperty({ example: 'Card domain model' })
  title!: string;

  @ApiProperty({
    example: 'pending',
    description: 'Free-form status - defaults to "pending", no fixed enum.',
  })
  status!: string;
}
