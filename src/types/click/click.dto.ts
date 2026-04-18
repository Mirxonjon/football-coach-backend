import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Length, Matches, Min } from 'class-validator';

// CreateInvoiceDto removed - wallets are obsolete

export class AddCardDto {
    @ApiProperty({ description: '16-digit card number', example: '8600123456789012' })
    @IsNotEmpty()
    @IsString()
    @Length(16, 16)
    @Matches(/^\d+$/)
    cardNumber: string; // 16 digits

    @ApiProperty({ description: 'Expiry date in MMYY format', example: '1225' })
    @IsNotEmpty()
    @IsString()
    @Length(4, 4)
    @Matches(/^\d{4}$/)
    expireDate: string; // MMYY
}

export class VerifyCardDto {
    @ApiProperty({ description: 'Card ID received from AddCard operation', example: 1 })
    @IsNotEmpty()
    @IsNumber()
    cardId: number;

    @ApiProperty({ description: 'SMS code sent to the users phone', example: '12345' })
    @IsNotEmpty()
    @IsString()
    smsCode: string;
}

export class PayWithTokenDto {
    @ApiProperty({ description: 'Card ID to use for payment', example: 1 })
    @IsNotEmpty()
    @IsNumber()
    cardId: number;


    @ApiProperty({ description: 'Amount to pay in UZS', example: 50000 })
    @IsNotEmpty()
    @IsNumber()
    @Min(1000)
    amount: number;
}

export class MockPayDto {
    @ApiProperty({ description: 'Amount to simulate payment in UZS', example: 50000 })
    @IsNotEmpty()
    @IsNumber()
    @Min(100)
    amount: number;
}
