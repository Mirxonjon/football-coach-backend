import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateTrainingCategoryDto {
  @ApiProperty({ example: 'Basic Dribbling' })
  @IsString()
  titleUz: string;

  @ApiProperty({ example: 'Базовый дриблинг' })
  @IsString()
  titleRu: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  ageCategoriesId: number;

  @ApiProperty({ example: 'Description in Uzbek' })
  @IsString()
  descriptionUz: string;

  @ApiProperty({ example: 'Description in Russian' })
  @IsString()
  descriptionRu: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
