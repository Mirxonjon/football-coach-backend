import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class AdminLoginDto {
  @ApiPropertyOptional({ example: '+998900000000', description: 'Phone number (E.164). Provide phone OR email.' })
  @ValidateIf((o) => !o.email)
  @IsNotEmpty({ message: 'Provide phone or email' })
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Invalid phone format' })
  phone?: string;

  @ApiPropertyOptional({ example: 'admin@football-coach.uz', description: 'Email address. Provide phone OR email.' })
  @ValidateIf((o) => !o.phone)
  @IsNotEmpty({ message: 'Provide phone or email' })
  @IsEmail({}, { message: 'Invalid email' })
  email?: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
