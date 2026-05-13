import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookCategoryType } from '@prisma/client';

export class FilterBookCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: BookCategoryType })
  @IsOptional()
  @IsEnum(BookCategoryType)
  categoryType?: BookCategoryType;
}
