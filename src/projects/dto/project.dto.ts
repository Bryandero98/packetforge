import { ApiProperty } from '@nestjs/swagger';

export class ProjectDto {
  @ApiProperty({ example: 'onramp' })
  id!: string;

  @ApiProperty({ example: 'onramp' })
  name!: string;

  @ApiProperty({ example: '2026-09-01T05:00:00.000Z' })
  createdAt!: string;
}
