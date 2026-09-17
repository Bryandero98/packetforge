import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDecisionDto {
  @ApiProperty({
    example: 'CARD-MODEL',
    description: 'The task this decision was made for.',
  })
  @IsString()
  @IsNotEmpty()
  taskId!: string;

  @ApiProperty({
    example: 'Plain object, not a class - no behavior yet',
    description: 'Why the task was built the way it was.',
  })
  @IsString()
  @IsNotEmpty()
  note!: string;
}
