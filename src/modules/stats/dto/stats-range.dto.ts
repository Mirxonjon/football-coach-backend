import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Max, Min } from 'class-validator';

export class StatsRangeDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-03-20T00:00:00.000Z',
    description: 'ISO date lower bound (inclusive). Defaults to now - 30 days.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-04-19T23:59:59.999Z',
    description: 'ISO date upper bound (inclusive). Defaults to now.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}

export class StatsTopQueryDto {
  @ApiPropertyOptional({ type: Number, example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
