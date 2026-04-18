import { Controller, Post, Get, Delete, Param, ParseIntPipe, Body, Req, UseGuards, Res, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiBody } from '@nestjs/swagger';
import { ClickService } from './click.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request, Response } from 'express';

import { AddCardDto, VerifyCardDto, PayWithTokenDto, MockPayDto } from '../../types/click/click.dto';

@ApiTags('Click Payments')
@Controller('click')
export class ClickController {
    private readonly loggerInternal = new Logger(ClickController.name);
    constructor(private readonly clickService: ClickService) { }

    // 1. Click Webhook: PREPARE
    @Post('prepare')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Click Webhook for Prepare action' })
    @ApiHeader({ name: 'click_sign_string', description: 'MD5 hash from Click' })
    async clickPrepare(@Body() body: any, @Res() res: Response) {
        try {
            this.loggerInternal.log(`Click Prepare Request: ${JSON.stringify(body)}`);
            const result = await this.clickService.prepare(body);
            this.loggerInternal.log(`Click Prepare Response: ${JSON.stringify(result)}`);
            res.set('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
                .send(result);
        } catch (e) {
            this.loggerInternal.error(`Click Prepare Error: ${e.message}`, e.stack);
            res.set('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
                .send({ error: -8, error_note: 'UNKNOWN ERROR' });
        }
    }

    // 2. Click Webhook: COMPLETE
    @Post('complete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Click Webhook for Complete action' })
    @ApiHeader({ name: 'click_sign_string', description: 'MD5 hash from Click' })
    async clickComplete(@Body() body: any, @Res() res: Response) {
        try {
            this.loggerInternal.log(`Click Complete Request: ${JSON.stringify(body)}`);
            const result = await this.clickService.complete(body);
            this.loggerInternal.log(`Click Complete Response: ${JSON.stringify(result)}`);
            res.set('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
                .send(result);
        } catch (e) {
            this.loggerInternal.error(`Click Complete Error: ${e.message}`, e.stack);
            res.set('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
                .send({ error: -8, error_note: 'UNKNOWN ERROR' });
        }
    }

    @Get('transactions')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user payment transactions history' })
    async getTransactions(@Req() req: Request) {
        const userId = (req as any).user.sub;
        return this.clickService.getTransactions(userId);
    }

    @Get('cards')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get saved Click cards' })
    async getCards(@Req() req: Request) {
        const userId = (req as any).user.sub;
        return this.clickService.getSavedCards(userId);
    }

    @Post('cards/add')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Request to add a new card to Click (Tokenization Step 1)' })
    async addCard(@Req() req: Request, @Body() dto: AddCardDto) {
        const userId = (req as any).user.sub;
        this.loggerInternal.log(`User ${userId} requested to add a card`);
        return this.clickService.createCardToken(userId, dto.cardNumber, dto.expireDate);
    }

    @Post('cards/verify')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Verify the added card with SMS code (Tokenization Step 2)' })
    async verifyCard(@Req() req: Request, @Body() dto: VerifyCardDto) {
        const userId = (req as any).user.sub;
        this.loggerInternal.log(`User ${userId} verifying card token: ${dto.cardId}`);
        return this.clickService.verifyCardToken(userId, dto.cardId, dto.smsCode);
    }

    @Post('cards/pay')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Directly pay for fueling using the saved card' })
    async payWithToken(@Req() req: Request, @Body() dto: PayWithTokenDto) {
        const userId = (req as any).user.sub;
        this.loggerInternal.log(`User ${userId} requested payment of ${dto.amount} with card: ${dto.cardId}`);
        return this.clickService.payWithToken(userId, dto.cardId, dto.amount);
    }

    @Delete('cards/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a saved card by ID' })
    async deleteCard(@Req() req: Request, @Param('id', ParseIntPipe) cardId: number) {
        const userId = (req as any).user.sub;
        this.loggerInternal.log(`User ${userId} requested to delete card: ${cardId}`);
        return this.clickService.deleteCard(userId, cardId);
    }

    @Post('mock-pay')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'MOCK PAYMENT: Simulate a successful Click payment for testing (DEV ONLY)' })
    @ApiBody({ type: MockPayDto })
    async mockPay(@Req() req: Request, @Body() dto: MockPayDto) {
        const userId = (req as any).user.sub;
        this.loggerInternal.log(`MOCK PAYMENT: User ${userId} simulating success for ${dto.amount} UZS`);
        return this.clickService.mockPay(userId, dto.amount);
    }
}
