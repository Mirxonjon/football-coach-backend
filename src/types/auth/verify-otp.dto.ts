import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '+15551234567', description: 'E.164 formatted phone number' })
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/,{ message: 'Invalid phone format' })
  phone: string;

  @ApiProperty({ example: '123456', description: 'One-time password code' })
  @IsNotEmpty()
  @Length(4, 8)
  code: string;
}
