import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Min(1)
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Min(1)
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({
    type: Boolean,
    required: false,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsOptional()
  @IsBoolean()
  all?: boolean = false;
}
