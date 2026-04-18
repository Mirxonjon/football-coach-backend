import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, Length } from 'class-validator';

export class PhoneVerifyOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @Matches(/^\+\d{10,15}$/, { message: 'phone must be in international format' })
  phone: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  @Length(5, 5)
  code: string;
}
