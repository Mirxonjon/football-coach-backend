import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 'Fueling Completed' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Yoqilg\'i quyish yakunlandi' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ example: 'SESSION_COMPLETED' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ example: { sessionId: 123 } })
  @IsOptional()
  data?: Record<string, any>;
}
