import { ApiProperty } from '@nestjs/swagger';

export class OperatorResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'GreenCharge LLC' })
  title: string;

  @ApiProperty({ example: '#00A86B', nullable: true })
  color?: string | null;

  @ApiProperty({ example: '+1 555-123-4567', nullable: true })
  contact?: string | null;

  @ApiProperty({ example: 'First National', nullable: true })
  bankName?: string | null;

  @ApiProperty({ example: 'US1234567890', nullable: true })
  bankAccount?: string | null;

  @ApiProperty({ example: '12345', nullable: true })
  bankMfo?: string | null;

  @ApiProperty({ example: '2026-02-14T12:34:56.000Z' })
  createdAt: Date;
}
