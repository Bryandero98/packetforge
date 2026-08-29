import { ApiProperty } from '@nestjs/swagger';

export class CreateDecisionDto {
  @ApiProperty({
    example: 'CARD-MODEL',
    description: 'The task this decision was made for.',
  })
  taskId!: string;

  @ApiProperty({
    example: 'Plain object, not a class - no behavior yet',
    description: 'Why the task was built the way it was.',
  })
  note!: string;
}
