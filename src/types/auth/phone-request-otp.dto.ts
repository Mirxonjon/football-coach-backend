import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class PhoneRequestOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @Matches(/^\+\d{10,15}$/, { message: 'phone must be in international format' })
  phone: string;
}
