import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDebtDto {
  @ApiProperty({
    example: 'AUTH',
    description: 'The task this debt was left on.',
  })
  @IsString()
  @IsNotEmpty()
  taskId!: string;

  @ApiProperty({
    example: 'Still stores tokens in plaintext',
    description:
      'What is still wrong with the task, for whatever depends on it.',
  })
  @IsString()
  @IsNotEmpty()
  note!: string;
}
