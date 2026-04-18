import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: '+998900000001' })
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Invalid phone format' })
  phone: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}
