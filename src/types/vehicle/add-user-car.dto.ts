import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddUserCarDto {
  @ApiProperty({
    example: 1,
    description:
      'Existing carId from catalog; if absent, custom car info must be provided',
  })
  @IsOptional()
  @IsInt()
  carId?: number;

  @ApiPropertyOptional({ example: 'Tesla' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'Model 3' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 2021 })
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ example: '5YJ3E1EA7JF000000' })
  @IsOptional()
  vin?: string;

  @ApiPropertyOptional({ example: '01A123AA' })
  @IsOptional()
  plateNumber?: string;

  @ApiPropertyOptional({ example: 'Red' })
  @IsOptional()
  color?: string;
}
