import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { LegalDocumentType } from '@prisma/client';

export class CreateLegalDocumentDto {
  @ApiProperty({ enum: LegalDocumentType, example: LegalDocumentType.PRIVACY_POLICY })
  @IsEnum(LegalDocumentType)
  type: LegalDocumentType;

  @ApiProperty({ example: 'Maxfiylik siyosati' })
  @IsString()
  @MaxLength(200)
  titleUz: string;

  @ApiProperty({ example: 'Политика конфиденциальности' })
  @IsString()
  @MaxLength(200)
  titleRu: string;

  @ApiProperty({ description: 'Markdown or HTML body in UZ' })
  @IsString()
  contentUz: string;

  @ApiProperty({ description: 'Markdown or HTML body in RU' })
  @IsString()
  contentRu: string;

  @ApiPropertyOptional({
    description:
      'Defaults to true. When true, the previously active document of the same type is automatically deactivated and version is incremented.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
