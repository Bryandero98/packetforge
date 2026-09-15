import { ApiProperty } from '@nestjs/swagger';

export class UpdateDebtDto {
  @ApiProperty({
    example: 'Still stores tokens in plaintext - now scoped to dev only',
    description: 'The corrected note text.',
  })
  note!: string;
}
