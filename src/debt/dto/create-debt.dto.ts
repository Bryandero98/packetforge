import { ApiProperty } from '@nestjs/swagger';

export class CreateDebtDto {
  @ApiProperty({
    example: 'AUTH',
    description: 'The task this debt was left on.',
  })
  taskId!: string;

  @ApiProperty({
    example: 'Still stores tokens in plaintext',
    description:
      'What is still wrong with the task, for whatever depends on it.',
  })
  note!: string;
}
