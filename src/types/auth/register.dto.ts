import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches, IsOptional, IsString } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: '+15551234567', description: 'E.164 formatted phone number' })
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/,{ message: 'Invalid phone format' })
  phone: string;

  @ApiProperty({ required: false, example: 'iPhone 15 Pro', description: 'Optional device name' })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
