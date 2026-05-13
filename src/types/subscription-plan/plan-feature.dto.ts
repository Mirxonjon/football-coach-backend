import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanFeatureDto {
  @ApiProperty({ example: 'Cheksiz darslarga kirish' })
  @IsString()
  @MaxLength(200)
  uz: string;

  @ApiProperty({ example: 'Безлимитный доступ к урокам' })
  @IsString()
  @MaxLength(200)
  ru: string;

  @ApiPropertyOptional({ description: 'Bold/highlighted feature row' })
  @IsBoolean()
  @IsOptional()
  highlight?: boolean;
}
