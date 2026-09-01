import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({
    example: 'onramp',
    description:
      'Unique project identifier - tasks reference this to say which project they belong to.',
  })
  id!: string;

  @ApiProperty({
    example: 'onramp',
    description: 'Human-readable project name.',
  })
  name!: string;
}
