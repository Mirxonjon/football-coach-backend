import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches, Length } from 'class-validator';

export class VerifyResetOtpDto {
  @ApiProperty({ example: '+15551234567' })
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/,{ message: 'Invalid phone format' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @Length(4, 8)
  code: string;
}
