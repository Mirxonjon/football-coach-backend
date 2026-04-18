import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatDto {
  @ApiProperty({ example: 'Training advice' })
  @IsString()
  @MaxLength(200)
  title: string;
}
