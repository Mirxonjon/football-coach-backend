import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsInt()
  planId: number;

  @ApiPropertyOptional({ description: 'Saved card ID to charge immediately (required for auto-pay).' })
  @IsInt()
  @IsOptional()
  cardId?: number;

  @ApiPropertyOptional({
    description: 'Enable automatic renewal on the same day every month using the saved card.',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoPay?: boolean;
}
