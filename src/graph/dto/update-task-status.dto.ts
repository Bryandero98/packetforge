import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTaskStatusDto {
  @ApiProperty({
    example: 'done',
    description: 'Free-form status - no fixed enum, same as at creation.',
  })
  @IsString()
  @IsNotEmpty()
  status!: string;
}
