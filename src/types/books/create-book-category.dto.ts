import { IsEnum, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookCategoryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  titleUz: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  titleRu: string;

  @ApiProperty({ enum: ['BOOK', 'KONSPEKT'] })
  @IsEnum(['BOOK', 'KONSPEKT'])
  categoryType: 'BOOK' | 'KONSPEKT';
}
