import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ClickService {
    private readonly logger = new Logger(ClickService.name);

    // Constants
    private readonly CLICK_API_URL = 'https://api.click.uz/v2/merchant/card_token';

    constructor(
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
    ) { }

    private get ENV() {
        return {
            MERCHANT_ID: this.config.get<string>('CLICK_MERCHANT_ID'),
            SERVICE_ID: this.config.get<string>('CLICK_SERVICE_ID'),
            MERCHANT_USER_ID: this.config.get<string>('CLICK_MERCHANT_USER_ID'),
            SECRET_KEY: this.config.get<string>('CLICK_SECRET_KEY'),
        };
    }

    // 1. Signature Validation Helper
    private validateSignature(data: any, action: number): boolean {
        const {
            click_trans_id,
            service_id,
            merchant_trans_id,
            amount,
            sign_time,
            sign_string,
            merchant_prepare_id,
        } = data;

        const { SECRET_KEY } = this.ENV;
        const isComplete = action === 1;

        // Payload format for Click: 
        // click_trans_id + service_id + secret_key + merchant_trans_id + (merchant_prepare_id if action=1) + amount + action + sign_time
        const payload = `${click_trans_id}${service_id}${SECRET_KEY}${merchant_trans_id}${isComplete ? merchant_prepare_id : ''}${amount}${action}${sign_time}`;
        const md5Hash = crypto.createHash('md5').update(payload).digest('hex');

        return md5Hash === sign_string;
    }

    // 2. Click Webhook: PREPARE (action=0)
    async prepare(data: any) {
        const { click_trans_id, merchant_trans_id, amount } = data;
        this.logger.log(`Processing Click Prepare: click_trans_id=${click_trans_id}, merchant_trans_id=${merchant_trans_id}, amount=${amount}`);

        if (!this.validateSignature(data, 0)) {
            this.logger.error(`Invalid signature for Click Prepare: click_trans_id=${click_trans_id}`);
            return { error: -1, error_note: 'SIGN CHECK FAILED' };
        }

        const txId = parseInt(merchant_trans_id);
        if (isNaN(txId)) {
            this.logger.error(`Invalid merchant_trans_id: ${merchant_trans_id}`);
            return { error: -5, error_note: 'INVALID MERCHANT TRANS ID' };
        }

        const transaction = await this.prisma.paymentTransaction.findUnique({
            where: { id: txId },
        });

        if (!transaction) {
            this.logger.error(`Transaction not found: ${txId}`);
            return { error: -6, error_note: 'TRANSACTION NOT FOUND' };
        }

        const expectedAmount = transaction.amount * 1.01;
        if (Math.abs(expectedAmount - parseFloat(amount)) > 0.01) {
            this.logger.error(`Amount mismatch: expected ${expectedAmount} (including 1% commission), received ${amount}`);
            return { error: -2, error_note: 'INVALID AMOUNT' };
        }

        this.logger.log(`Click Prepare Success: ${txId}`);

        return {
            click_trans_id,
            merchant_trans_id,
            merchant_prepare_id: txId,
            error: 0,
            error_note: 'Success',
        };
    }

    // 3. Click Webhook: COMPLETE (action=1)
    async complete(data: any) {
        const { click_trans_id, merchant_trans_id, amount, error } = data;
        this.logger.log(`Processing Click Complete: click_trans_id=${click_trans_id}, merchant_trans_id=${merchant_trans_id}, error=${error}`);

        if (!this.validateSignature(data, 1)) {
            this.logger.error(`Invalid signature for Click Complete: click_trans_id=${click_trans_id}`);
            return { error: -1, error_note: 'SIGN CHECK FAILED' };
        }

        const txId = parseInt(merchant_trans_id);
        const transaction = await this.prisma.paymentTransaction.findUnique({
            where: { id: txId },
            include: { FuelSession: true }
        });

        if (!transaction) {
            this.logger.error(`Transaction not found in Complete: ${txId}`);
            return { error: -6, error_note: 'TRANSACTION NOT FOUND' };
        }

        if (transaction.status === PaymentStatus.SUCCESS) {
            this.logger.warn(`Transaction already paid: ${txId}`);
            return { error: -4, error_note: 'ALREADY PAID' };
        }

        const expectedAmount = transaction.amount * 1.01;
        if (Math.abs(expectedAmount - parseFloat(amount)) > 0.01) {
            this.logger.error(`Amount mismatch in Complete: expected ${expectedAmount} (including 1% commission), received ${amount}`);
            return { error: -2, error_note: 'INVALID AMOUNT' };
        }

        const isSuccess = parseInt(error) === 0;
        const status = isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;

        // Perform Update in Transaction
        await this.prisma.paymentTransaction.update({
            where: { id: txId },
            data: {
                status,
                externalId: click_trans_id.toString(),
                errorMessage: isSuccess ? null : 'Transaction failed or cancelled by Click'
            }
        });

        return {
            click_trans_id,
            merchant_trans_id,
            merchant_confirm_id: txId,
            error: 0,
            error_note: 'Success',
        };
    }

    // 4. User Transaction History
    async getTransactions(userId: number) {
        return this.prisma.paymentTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                FuelSession: {
                    include: {
                        fuelStation: { select: { title: true } },
                        fuelType: { select: { name: true } }
                    }
                }
            }
        });
    }

    private getAuthHeaders() {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const { MERCHANT_USER_ID, SECRET_KEY } = this.ENV;

        const signature = crypto.createHash('sha1').update(timestamp + SECRET_KEY).digest('hex');
        const authHeader = `${MERCHANT_USER_ID}:${signature}:${timestamp}`;

        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Auth': authHeader,
        };
    }

    // 5. SECURE CARD SAVING: ADD CARD
    async createCardToken(userId: number, cardNumber: string, expireDate: string) {
        const { SERVICE_ID } = this.ENV;
        this.logger.log(`User ${userId} creating card token for card ending in ${this.getLast4(cardNumber)}`);

        const existing = await this.prisma.card.findFirst({
            where: { userId, last4: this.getLast4(cardNumber) }
        });
        if (existing && existing.isActive) {
            this.logger.warn(`Card already saved for user ${userId}: last4=${existing.last4}`);
            throw new BadRequestException('Card already saved');
        }

        const payload = {
            service_id: parseInt(SERVICE_ID),
            card_number: cardNumber,
            expire_date: expireDate,
            temporary: 0,
        };

        try {
            this.logger.log(`Calling Click API to request card token for user ${userId}`);
            const res = await fetch(`${this.CLICK_API_URL}/request`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(payload),
            });
            const data = await res.json() as any;
            this.logger.log(`Click Card Request Response: ${JSON.stringify(data)}`);

            if (data.error_code !== 0) {
                this.logger.error(`Click card registration failed: ${data.error_note}`);
                throw new BadRequestException(data.error_note || 'Card registration failed');
            }

            const token = data.card_token;

            const card = await this.prisma.card.upsert({
                where: { token },
                update: {},
                create: {
                    userId,
                    token,
                    last4: this.getLast4(cardNumber),
                    isActive: false,
                },
            });

            this.logger.log(`Card record upserted for user ${userId}: cardId=${card.id}`);
            return { success: true, message: 'SMS code sent', phone: data.phone_number, cardId: card.id };
        } catch (e) {
            this.logger.error(`Click Add Card Error: ${e.message}`);
            throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
        }
    }

    // 6. VERIFY SMS CODE
    async verifyCardToken(userId: number, cardId: number, smsCode: string) {
        const { SERVICE_ID } = this.ENV;
        this.logger.log(`User ${userId} verifying cardId ${cardId}`);

        const card = await this.prisma.card.findUnique({ where: { id: cardId } });
        if (!card || card.userId !== userId) {
            this.logger.error(`Card not found or access denied: user=${userId}, cardId=${cardId}`);
            throw new BadRequestException('Card not found');
        }

        const payload = {
            service_id: parseInt(SERVICE_ID),
            card_token: card.token,
            sms_code: smsCode,
        };

        try {
            this.logger.log(`Calling Click API to verify card token for user ${userId}`);
            const res = await fetch(`${this.CLICK_API_URL}/verify`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(payload),
            });
            const data = await res.json() as any;
            this.logger.log(`Click Card Verify Response: ${JSON.stringify(data)}`);

            if (data.error_code !== 0) {
                this.logger.error(`Click card verification failed: ${data.error_note}`);
                throw new BadRequestException(data.error_note || 'Card verification failed');
            }

            await this.prisma.card.update({
                where: { id: cardId },
                data: { isActive: true },
            });

            this.logger.log(`Card ${cardId} verified and activated for user ${userId}`);
            return { success: true, message: 'Card verified successfully' };
        } catch (e) {
            this.logger.error(`Click Verify Card Error: ${e.message}`);
            throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
        }
    }

    // 7. PAY WITH SAVED TOKEN
    async payWithToken(userId: number, cardId: number | undefined, amount: number) {
        if (amount <= 0) throw new BadRequestException('Invalid amount');

        let card;
        if (cardId) {
            card = await this.prisma.card.findFirst({ where: { id: cardId, userId } });
        } else {
            card = await this.prisma.card.findFirst({ where: { userId, isActive: true }, orderBy: { createdAt: 'desc' } });
        }
        if (!card || !card.isActive) {
            throw new BadRequestException('No active card found for user');
        }

        const tx = await this.prisma.paymentTransaction.create({
            data: {
                cardId: card.id,
                userId,
                amount,
                provider: 'CLICK',
                status: PaymentStatus.PENDING,
            },
        });

        const { SERVICE_ID } = this.ENV;
        const payload = {
            service_id: parseInt(SERVICE_ID),
            card_token: card.token,
            amount: amount,
            transaction_parameter: tx.id.toString(),
        };

        try {
            const headers = this.getAuthHeaders();
            this.logger.log(`[CLICK API REQUEST]: ${this.CLICK_API_URL}/payment | Headers: ${JSON.stringify(headers)} | Body: ${JSON.stringify(payload)}`);

            const res = await fetch(`${this.CLICK_API_URL}/payment`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            const data = await res.json() as any;
            console.log('================ CLICK PAY WITH TOKEN RESPONSE ================');
            console.log(data);
            console.log('=========================================================');
            if (data.error_code !== 0) {
                await this.prisma.paymentTransaction.update({
                    where: { id: tx.id },
                    data: {
                        status: PaymentStatus.FAILED,
                        errorCode: data.error_code.toString(),
                        errorMessage: data.error_note
                    },
                });
                throw new BadRequestException(data.error_note || 'Payment failed');
            }

            await this.prisma.paymentTransaction.update({
                where: { id: tx.id },
                data: {
                    status: PaymentStatus.SUCCESS,
                    externalId: data.click_trans_id?.toString()
                },
            });

            return { success: true, message: 'Payment successful', transactionId: tx.id };
        } catch (e) {
            this.logger.error('Click Pay With Token Error', e);
            throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
        }
    }

    async getSavedCards(userId: number) {
        const cards = await this.prisma.card.findMany({
            where: { userId, isActive: true },
            select: { id: true, last4: true, createdAt: true },
        });
        return cards;
    }

    // 8. DELETE SAVED CARD
    async deleteCard(userId: number, cardId: number) {
        const card = await this.prisma.card.findUnique({ where: { id: cardId } });

        this.logger.log(`User ${userId} attempting to delete card ${cardId}`);

        if (!card || card.userId !== userId) {
            this.logger.error(`Card deletion failed: not found or access denied: user=${userId}, cardId=${cardId}`);
            throw new BadRequestException('Card not found or access denied');
        }

        // Use soft delete by setting isActive to false to preserve transaction history
        await this.prisma.card.update({
            where: { id: cardId },
            data: { isActive: false }
        });

        this.logger.log(`Card ${cardId} soft-deleted for user ${userId}`);
        return { success: true, message: 'Card deleted successfully' };
    }

    // 9. MOCK PAYMENT FOR TESTING
    async mockPay(userId: number, amount: number) {
        if (amount <= 0) throw new BadRequestException('Invalid amount');

        // Find or create a dummy card for this user to satisfy foreign key constraints
        let card = await this.prisma.card.findFirst({
            where: { userId, last4: '0000' }
        });

        if (!card) {
            card = await this.prisma.card.create({
                data: {
                    userId,
                    token: `mock_token_${userId}_${Date.now()}`,
                    last4: '0000',
                    isActive: true,
                }
            });
        }

        // Create a successful transaction immediately
        const tx = await this.prisma.paymentTransaction.create({
            data: {
                cardId: card.id,
                userId,
                amount,
                provider: 'CLICK_MOCK',
                status: PaymentStatus.SUCCESS,
                externalId: `mock_trans_${Date.now()}`,
            },
        });

        return { 
            success: true, 
            message: 'Mock payment successful', 
            paymentId: tx.id,
            amount,
            status: tx.status
        };
    }

    private getLast4(cardNumber: string) {
        return cardNumber.slice(-4);
    }
}
