import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateCardDto {
  @ApiProperty({ description: 'Provider token (never raw PAN)' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Last 4 digits of card', example: '3456' })
  @IsString()
  @Length(4, 4)
  last4: string;
}
