import {
  IsString,
  IsInt,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanFeatureDto } from './plan-feature.dto';

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

  @ApiPropertyOptional({
    type: [PlanFeatureDto],
    description:
      'Bilingual feature rows shown as a checklist on the pricing card. Order is preserved.',
    example: [
      { uz: 'Cheksiz darslar', ru: 'Безлимитные уроки' },
      { uz: '24/7 qo‘llab-quvvatlash', ru: 'Поддержка 24/7', highlight: true },
    ],
  })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PlanFeatureDto)
  @IsOptional()
  features?: PlanFeatureDto[];
}
