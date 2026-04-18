import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'How do I improve my dribbling?' })
  @IsString()
  @IsNotEmpty()
  text: string;
}
