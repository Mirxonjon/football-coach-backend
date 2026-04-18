import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Language } from '@prisma/client';

export class UpdateLegalTranslationDto {
  @ApiPropertyOptional({ enum: ['UZ','RU','EN'] })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @ApiPropertyOptional({ example: 'Foydalanish shartlari' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: '<p>...</p>' })
  @IsOptional()
  @IsString()
  content?: string;
}
