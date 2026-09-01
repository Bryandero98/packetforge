import { ApiProperty } from '@nestjs/swagger';

export class UpdateTaskStatusDto {
  @ApiProperty({
    example: 'done',
    description: 'Free-form status - no fixed enum, same as at creation.',
  })
  status!: string;
}
