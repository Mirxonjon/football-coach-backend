import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  status_code: number;

  @ApiProperty({ example: 'Validation failed' })
  message: string;
}

export class UnauthorizedResponseDto {
  @ApiProperty({ example: 401 })
  status_code: number;

  @ApiProperty({ example: 'Unauthorized' })
  message: string;
}

export class ForbiddenResponseDto {
  @ApiProperty({ example: 403 })
  status_code: number;

  @ApiProperty({ example: 'Forbidden resource' })
  message: string;
}

export class NotFoundResponseDto {
  @ApiProperty({ example: 404 })
  status_code: number;

  @ApiProperty({ example: 'Not found' })
  message: string;
}
