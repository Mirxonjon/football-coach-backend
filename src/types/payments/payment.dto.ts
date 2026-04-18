import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class PaymentCreateDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  sessionId: number;

  @ApiProperty({ example: '12000.00' })
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}

export class PaymentUpdateDto {
  @ApiProperty({ example: '12000.00' })
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}
