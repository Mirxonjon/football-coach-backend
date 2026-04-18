import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

enum ConfirmStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export class ConfirmTransactionDto {
  @ApiProperty({ enum: ConfirmStatus })
  @IsEnum(ConfirmStatus)
  status: ConfirmStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
