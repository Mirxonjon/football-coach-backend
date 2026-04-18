import { IsString, IsInt, IsEnum, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DiscountType {
  NONE = 'NONE',
  PERCENTAGE = 'PERCENTAGE',
  FIXED_PRICE = 'FIXED_PRICE',
}

export class CreateSubscriptionPlanDto {
  @ApiProperty()
  @IsString()
  titleUz: string;

  @ApiProperty()
  @IsString()
  titleRu: string;

  @ApiProperty()
  @IsString()
  descriptionUz: string;

  @ApiProperty()
  @IsString()
  descriptionRu: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  durationDays: number;

  @ApiProperty({ enum: DiscountType, default: DiscountType.NONE })
  @IsEnum(DiscountType)
  @IsOptional()
  discountType?: DiscountType;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  fixedDiscountPrice?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
