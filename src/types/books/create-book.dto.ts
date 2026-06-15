import { IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookDto {
  @ApiProperty()
  @IsInt()
  bookCategoryId: number;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  titleUz: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  titleRu: string;

  @ApiProperty({
    description:
      "Default PDF URL (legacy / single-language books). Required for download. If only one language is supplied via fileUrlUz/fileUrlRu, send that same URL here too.",
  })
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional({
    description:
      "Uzbek PDF URL. Used by Book RAG to embed UZ chunks. Optional; if absent, RAG falls back to fileUrl as UZ.",
  })
  @IsOptional()
  @IsString()
  fileUrlUz?: string;

  @ApiPropertyOptional({
    description:
      "Russian PDF URL. Used by Book RAG to embed RU chunks. Optional; if present, RAG ignores the legacy fileUrl for the RU language.",
  })
  @IsOptional()
  @IsString()
  fileUrlRu?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ enum: ['NONE', 'PERCENTAGE', 'FIXED_PRICE'], default: 'NONE' })
  @IsOptional()
  @IsEnum(['NONE', 'PERCENTAGE', 'FIXED_PRICE'])
  discountType?: 'NONE' | 'PERCENTAGE' | 'FIXED_PRICE';

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fixedDiscountPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty()
  @IsString()
  descriptionRu: string;

  @ApiProperty()
  @IsString()
  descriptionUz: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tacticHintImg?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalPages?: number;
}
