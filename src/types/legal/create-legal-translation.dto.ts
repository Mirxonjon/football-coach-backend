import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Language } from '@prisma/client';

export class CreateLegalTranslationDto {
  @ApiProperty({ enum: ['UZ','RU','EN'] })
  @IsEnum(Language)
  language: Language;

  @ApiProperty({ example: 'Foydalanish shartlari' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: '<p>...</p>' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
