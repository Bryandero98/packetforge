import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    example: 'onramp',
    description:
      'Unique project identifier - tasks reference this to say which project they belong to.',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    example: 'onramp',
    description: 'Human-readable project name.',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
