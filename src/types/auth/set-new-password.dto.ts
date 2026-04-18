import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class SetNewPasswordDto {
  @ApiProperty({ description: 'Reset token obtained from verify-reset-otp' })
  @IsNotEmpty()
  @IsString()
  resetToken: string;

  @ApiProperty({ example: 'Str0ngP@ssw0rd', description: 'New strong password' })
  @IsNotEmpty()
  @IsString()
  @Length(8, 100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, { message: 'Password must include upper, lower, number, and special char' })
  newPassword: string;
}
