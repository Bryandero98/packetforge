import { ApiProperty } from '@nestjs/swagger';

export interface DecisionConflict {
  id: number;
  note: string;
  similarity: number;
}

export class DecisionConflictDto implements DecisionConflict {
  @ApiProperty({
    example: 3,
    description: 'id of the existing decision this one closely matches',
  })
  id!: number;

  @ApiProperty({
    example: 'Chose SQLite for the MVP - zero setup, good enough at this scale',
  })
  note!: string;

  @ApiProperty({
    example: 0.93,
    description:
      '1 - cosine distance against the existing note, 0..1, higher is more similar.',
  })
  similarity!: number;
}

export class DecisionDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'CARD-MODEL' })
  taskId!: string;

  @ApiProperty({ example: 'Plain object, not a class - no behavior yet' })
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

  @ApiProperty({
    type: [DecisionConflictDto],
    description:
      'Existing decisions on the same task whose note is highly similar to this one ' +
      '(see CONFLICT_SIMILARITY_THRESHOLD in decision.service.ts). Empty when none are ' +
      'found, or when no embedding was computed for this note. A warning, not a ' +
      'rejection - the write always succeeds.',
  })
  conflicts!: DecisionConflictDto[];
}
