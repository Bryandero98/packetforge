import { ApiProperty } from '@nestjs/swagger';

export class DebtDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'AUTH' })
  taskId!: string;

  @ApiProperty({ example: 'Still stores tokens in plaintext' })
  note!: string;

  @ApiProperty({ example: '2026-08-29T05:00:00.000Z' })
  loggedAt!: string;

  @ApiProperty({
    type: [Number],
    nullable: true,
    description:
      '1536-dimension embedding vector, or null if the embedding provider failed or was not configured.',
  })
  embedding!: number[] | null;
}
