import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'fcm_device_token_string' })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;

  @ApiProperty({ example: 'ANDROID', enum: ['ANDROID', 'IOS'] })
  @IsString()
  @IsIn(['ANDROID', 'IOS'])
  deviceType: string;
}
