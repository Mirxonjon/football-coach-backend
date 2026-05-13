import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Length, Matches, Min } from 'class-validator';

export class InitCardDto {
  @ApiProperty({ example: '8600123456789012', description: '16-digit card number (no spaces)' })
  @IsString()
  @Length(16, 19)
  @Matches(/^\d+$/)
  cardNumber: string;

  @ApiProperty({ example: '1230', description: 'MMYY (4 digits)' })
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  expireDate: string;
}

export class VerifyCardDto {
  @ApiProperty({
    description: 'Internal card ID returned by /cards/init (NOT the Click token).',
    example: 1733414512001,
  })
  @IsInt()
  @Min(1)
  cardId: number;

  @ApiProperty({ example: '12345', description: 'OTP sent by Click to cardholder phone' })
  @IsString()
  @Length(1, 10)
  smsCode: string;
}
