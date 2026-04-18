import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: '+15551234567' })
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/,{ message: 'Invalid phone format' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @Length(4, 8)
  code: string;

  @ApiProperty({ example: 'NewStr0ngP@ss' })
  @IsNotEmpty()
  @IsString()
  @Length(8, 100)
  password: string;
}
