import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional({ example: '1990-05-20', description: 'ISO date string (YYYY-MM-DD or full ISO datetime)' })
  @IsOptional()
  @IsDateString()
  wasBorn?: string;
}
