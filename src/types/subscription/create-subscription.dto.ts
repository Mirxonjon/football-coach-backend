import { IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsInt()
  planId: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  cardId?: number;
}
