import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateDebtDto {
  @ApiProperty({
    example: 'Still stores tokens in plaintext - now scoped to dev only',
    description: 'The corrected note text.',
  })
  @IsString()
  @IsNotEmpty()
  note!: string;
}
