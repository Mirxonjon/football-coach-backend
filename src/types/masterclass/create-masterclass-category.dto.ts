import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateMasterclassCategoryDto {
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  titleUz: string;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  titleRu: string;

  @ApiProperty()
  @IsString()
  descriptionUz: string;

  @ApiProperty()
  @IsString()
  descriptionRu: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
