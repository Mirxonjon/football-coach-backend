import { IsInt, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseBookDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  cardId?: number;
}
