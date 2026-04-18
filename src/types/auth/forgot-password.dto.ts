import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: '+15551234567' })
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/,{ message: 'Invalid phone format' })
  phone: string;
}
