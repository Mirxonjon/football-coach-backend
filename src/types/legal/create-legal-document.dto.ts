import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { LegalDocumentType, Language } from '@prisma/client';

class TranslationInputDto {
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

export class CreateLegalDocumentDto {
  @ApiProperty({ enum: ['TERMS','PRIVACY'] })
  @IsEnum(LegalDocumentType)
  type: LegalDocumentType;

  @ApiProperty({ example: '1.0' })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [TranslationInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationInputDto)
  translations?: TranslationInputDto[];
}
