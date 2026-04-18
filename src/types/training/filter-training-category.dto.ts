import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterTrainingCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ageCategoryId?: number;
}
