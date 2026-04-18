import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateOperatorDto {
  @ApiProperty({ example: 'GreenCharge LLC' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: '#00A86B', description: 'HEX color code' })
  @IsOptional()
  @IsString()
  @Matches(/^#(?:[0-9a-fA-F]{3}){1,2}$/,{ message: 'color must be valid HEX like #00A86B' })
  color?: string;

  @ApiPropertyOptional({ example: '+1 555-123-4567' })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiProperty({ example: 'First National Bank', required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ example: 'US1234567890', required: false })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiProperty({ example: '12345', required: false })
  @IsOptional()
  @IsString()
  bankMfo?: string;
}
