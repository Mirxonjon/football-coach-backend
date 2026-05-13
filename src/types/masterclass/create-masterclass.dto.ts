import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Length, Min } from 'class-validator';

export class CreateMasterclassDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  masterclassCategoryId: number;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  titleUz: string;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  titleRu: string;
}
