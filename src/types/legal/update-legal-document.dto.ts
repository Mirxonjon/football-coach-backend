import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { LegalDocumentType } from '@prisma/client';

export class UpdateLegalDocumentDto {
  @ApiPropertyOptional({ enum: ['TERMS','PRIVACY'] })
  @IsOptional()
  @IsEnum(LegalDocumentType)
  type?: LegalDocumentType;

  @ApiPropertyOptional({ example: '1.1' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
