import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateDecisionDto {
  @ApiProperty({
    example: 'Plain object, not a class - still no behavior as of this note',
    description: 'The corrected note text.',
  })
  @IsString()
  @IsNotEmpty()
  note!: string;
}
