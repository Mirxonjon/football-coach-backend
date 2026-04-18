import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordTokenDto {
  @ApiProperty({ example: 'a3bf1c2d...' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewStr0ngP@ss' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
