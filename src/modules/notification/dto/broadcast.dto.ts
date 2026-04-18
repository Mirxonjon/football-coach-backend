import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BroadcastDto {
  @ApiProperty({ example: 'System Update' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Yangi versiya chiqdi' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ example: 'BROADCAST' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ example: { foo: 'bar' } })
  @IsOptional()
  data?: Record<string, any>;
}
