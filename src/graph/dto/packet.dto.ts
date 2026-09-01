import { ApiProperty } from '@nestjs/swagger';

export class PacketDto {
  @ApiProperty({
    example: 'cursor',
    description: 'Which adapter formatted this packet.',
  })
  adapter!: string;

  @ApiProperty({
    description:
      "The task's full context, formatted by the chosen adapter - a JSON string for generic-json, Markdown for cursor.",
  })
  content!: string;
}
