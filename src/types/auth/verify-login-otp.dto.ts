import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches, Length } from 'class-validator';

export class VerifyLoginOtpDto {
  @ApiProperty({ example: '+15551234567', description: 'Phone number in E.164 format' })
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/,{ message: 'Invalid phone format' })
  phone: string;

  @ApiProperty({ example: '123456', description: 'One-time password code' })
  @IsNotEmpty()
  @Length(4, 8)
  code: string;
}
