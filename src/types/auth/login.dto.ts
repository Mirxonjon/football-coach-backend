import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, Length } from 'class-validator';

export class LoginWithOtpDto {
  @ApiProperty({ example: '+15551234567' })
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/,{ message: 'Invalid phone format' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @Length(4, 8)
  code: string;
}

export class LoginWithPasswordDto {
  @ApiProperty({ example: '+15551234567' })
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/,{ message: 'Invalid phone format' })
  phone: string;

  @ApiProperty({ example: 'StrongP@ssw0rd' })
  @IsNotEmpty()
  @IsString()
  @Length(8, 100)
  password: string;

  @ApiPropertyOptional({ example: 'Pixel 8' })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
