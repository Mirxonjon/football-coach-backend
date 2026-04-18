import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateAgeCategoryDto {
  @ApiProperty({ example: 'U-12' })
  @IsString()
  titleUz: string;

  @ApiProperty({ example: 'U-12' })
  @IsString()
  titleRu: string;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(0)
  minAge: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(0)
  maxAge: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconUrl?: string;
}
