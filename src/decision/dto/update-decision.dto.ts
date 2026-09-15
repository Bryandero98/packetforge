import { ApiProperty } from '@nestjs/swagger';

export class UpdateDecisionDto {
  @ApiProperty({
    example: 'Plain object, not a class - still no behavior as of this note',
    description: 'The corrected note text.',
  })
  note!: string;
}
