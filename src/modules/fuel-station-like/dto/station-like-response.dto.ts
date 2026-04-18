import { ApiProperty } from '@nestjs/swagger';

class FuelStationSummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Downtown Station' })
  title!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 41.2995 })
  latitude!: number;

  @ApiProperty({ example: 69.2401 })
  longitude!: number;
}

export class FuelStationLikeItemDto {
  @ApiProperty({ example: 10 })
  id!: number;

  @ApiProperty({ example: 2 })
  userId!: number;

  @ApiProperty({ example: 5 })
  fuelStationId!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: FuelStationSummaryDto })
  fuelStation!: FuelStationSummaryDto;
}

export class FuelStationLikeListResponseDto {
  @ApiProperty({ type: [FuelStationLikeItemDto] })
  items!: FuelStationLikeItemDto[];

  @ApiProperty({ example: 25 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;
}

export class FuelStationCountResponseDto {
  @ApiProperty({ example: 123 })
  count!: number;
}

export class FuelStationCheckLikedResponseDto {
  @ApiProperty({ example: true })
  liked!: boolean;
}
