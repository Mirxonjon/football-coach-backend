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

  @ApiProperty()
  @IsString()
  fileUrl: string;

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
