import { ApiProperty } from '@nestjs/swagger';

export class MeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '+15551234567' })
  phone: string;

  @ApiProperty({ example: 'John', nullable: true })
  firstName?: string | null;

  @ApiProperty({ example: 'Doe', nullable: true })
  lastName?: string | null;

  @ApiProperty({ example: '1990-05-20T00:00:00.000Z', nullable: true, description: 'Birth date in ISO format' })
  wasBorn?: Date | null;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ example: 'USER', description: 'Role name' })
  role: string;

  @ApiProperty({ example: '2026-02-14T12:34:56.000Z' })
  createdAt: Date;
}
