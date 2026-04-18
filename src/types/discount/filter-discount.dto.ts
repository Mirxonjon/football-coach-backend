import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ListQueryDto } from '@/types/global/dto/list-query.dto';

export class FilterDiscountDto extends ListQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  fuelStationId?: number;


  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true'))
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-02-15T12:00:00Z', description: 'Return discounts active at this time' })
  @IsOptional()
  @IsDateString()
  activeAt?: string;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Sort by field' })
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ example: 'desc', description: 'Sort order' })
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
