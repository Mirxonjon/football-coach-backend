import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  @ApiProperty({ description: 'Registration token obtained from verify-otp' })
  @IsNotEmpty()
  @IsString()
  registrationToken: string;

  @ApiProperty({ example: 'Str0ngP@ssw0rd', description: 'New password (min 8 chars, strong recommended)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}
