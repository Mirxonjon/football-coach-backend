import { ApiPropertyOptional } from '@nestjs/swagger';
import { ListQueryDto } from '@/types/global/dto/list-query.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class PaymentFiltersDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ example: '10000.00' })
  @IsOptional()
  minAmount?: string;

  @ApiPropertyOptional({ example: '500000.00' })
  @IsOptional()
  maxAmount?: string;
}
