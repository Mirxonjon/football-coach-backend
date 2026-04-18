import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateTelegramSettingDto {
  @ApiPropertyOptional({ example: '123456789', description: 'Personal Telegram User ID' })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @ApiPropertyOptional({ example: '-100987654321', description: 'Telegram Group or Channel ID' })
  @IsOptional()
  @IsString()
  telegramGroupId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
