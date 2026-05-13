import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AutoPayDto {
  @ApiProperty({ description: 'Turn auto-renewal on or off' })
  @Type(() => Boolean)
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({
    description:
      'Card to charge at renewal. Required when enabling auto-pay if the subscription has no card yet.',
  })
  @IsOptional()
  @IsInt()
  cardId?: number;
}
