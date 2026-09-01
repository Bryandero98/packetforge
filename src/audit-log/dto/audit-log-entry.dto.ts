import { ApiProperty } from '@nestjs/swagger';

export class AuditLogEntryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({
    enum: ['task', 'decision', 'debt', 'project'],
    example: 'task',
  })
  entityType!: string;

  @ApiProperty({ example: 'CARD-MODEL' })
  entityId!: string;

  @ApiProperty({ enum: ['created', 'updated', 'deleted'], example: 'created' })
  action!: string;

  @ApiProperty({ example: 'default', nullable: true })
  projectId!: string | null;

  @ApiProperty({ example: '2026-09-01T05:00:00.000Z' })
  occurredAt!: string;
}
