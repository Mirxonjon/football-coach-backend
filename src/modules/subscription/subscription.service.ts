import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateSubscriptionDto } from '@/types/subscription/create-subscription.dto';
import { AutoPayDto } from '@/types/subscription/auto-pay.dto';
import { ClickProvider } from '@/modules/payments/providers/click.provider';
import { DiscountType } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly click: ClickProvider,
  ) {}

  async getMySubscriptions(userId: number) {
    const now = new Date();

    const [active, history] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { userId, isActive: true, endDate: { gte: now } },
        include: { subscriptionsPlan: true },
        orderBy: { endDate: 'desc' },
      }),
      this.prisma.subscription.findMany({
        where: {
          userId,
          OR: [{ isActive: false }, { endDate: { lt: now } }],
        },
        include: { subscriptionsPlan: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return { active, history };
  }

  async subscribe(userId: number, dto: CreateSubscriptionDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Subscription plan not found or inactive');
    }

    const now = new Date();
    const existingActive = await this.prisma.subscription.findFirst({
      where: { userId, isActive: true, endDate: { gte: now } },
    });
    if (existingActive) {
      throw new ConflictException('You already have an active subscription');
    }

    if (dto.autoPay && !dto.cardId) {
      throw new BadRequestException('cardId is required when enabling auto-pay');
    }

    let card: { id: number; token: string } | null = null;
    if (dto.cardId) {
      const found = await this.prisma.card.findFirst({
        where: { id: dto.cardId, userId, isActive: true, isVerified: true },
      });
      if (!found) throw new BadRequestException('Card not found or not verified');
      card = { id: found.id, token: found.token };
    }

    const amount = this.calculateFinalPrice(plan);

    // If a card was provided, charge it via Click BEFORE creating the subscription row.
    let chargeExternalId: string | null = null;
    let paymentStatus: 'PENDING' | 'SUCCESS' = 'PENDING';
    if (card) {
      const charge = await this.click.charge(amount, card.token);
      if (!charge.success) {
        throw new HttpException(
          {
            message: 'Payment failed',
            errorCode: charge.errorCode,
            errorMessage: charge.errorMessage,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      chargeExternalId = charge.externalId ?? null;
      paymentStatus = 'SUCCESS';
    }

    const startDate = now;
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const [subscription, transaction] = await this.prisma.$transaction(async (tx) => {
      const walletTx = await tx.walletTransaction.create({
        data: {
          userId,
          amount,
          subscriptionsPlansId: plan.id,
          cardId: card?.id ?? null,
          status: paymentStatus,
          provider: card ? 'click' : null,
          externalId: chargeExternalId,
        },
      });

      const sub = await tx.subscription.create({
        data: {
          userId,
          subscriptionsPlansId: plan.id,
          startDate,
          endDate,
          isActive: paymentStatus === 'SUCCESS',
          autoPay: !!dto.autoPay,
          cardId: card?.id ?? null,
        },
        include: { subscriptionsPlan: true },
      });

      return [sub, walletTx];
    });

    return {
      subscription,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
      },
    };
  }

  /**
   * Toggle auto-renewal for the user's current active subscription.
   */
  async setAutoPay(userId: number, dto: AutoPayDto) {
    const now = new Date();
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, isActive: true, endDate: { gte: now } },
      orderBy: { endDate: 'desc' },
    });
    if (!sub) throw new NotFoundException('No active subscription found');

    let cardId = sub.cardId;
    if (dto.enabled) {
      const targetCardId = dto.cardId ?? sub.cardId;
      if (!targetCardId) {
        throw new BadRequestException(
          'cardId is required to enable auto-pay (no card attached to this subscription)',
        );
      }
      const card = await this.prisma.card.findFirst({
        where: { id: targetCardId, userId, isActive: true, isVerified: true },
      });
      if (!card) throw new BadRequestException('Card not found or not verified');
      cardId = card.id;
    }

    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: { autoPay: dto.enabled, cardId },
    });
  }

  /**
   * DEV-ONLY: activate a subscription for the current user without charging
   * any card. Used to test subscription-gated features while Click is not yet
   * wired up. Blocked outside development environments.
   */
  async devActivate(userId: number, planId: number) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('devActivate is disabled in production');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    const now = new Date();
    const existing = await this.prisma.subscription.findFirst({
      where: { userId, isActive: true, endDate: { gte: now } },
    });
    if (existing) {
      throw new ConflictException('You already have an active subscription');
    }

    const amount = this.calculateFinalPrice(plan);
    const startDate = now;
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const [subscription, transaction] = await this.prisma.$transaction(async (tx) => {
      const walletTx = await tx.walletTransaction.create({
        data: {
          userId,
          amount,
          subscriptionsPlansId: plan.id,
          status: 'SUCCESS',
          provider: 'dev',
          externalId: `dev_${Date.now()}`,
        },
      });

      const sub = await tx.subscription.create({
        data: {
          userId,
          subscriptionsPlansId: plan.id,
          startDate,
          endDate,
          isActive: true,
          autoPay: false,
        },
        include: { subscriptionsPlan: true },
      });

      return [sub, walletTx];
    });

    this.logger.warn(
      `[DEV-ACTIVATE] userId=${userId} planId=${planId} → subId=${subscription.id} endDate=${endDate.toISOString()}`,
    );

    return {
      subscription,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
      },
      notice:
        'Subscription activated WITHOUT a real payment (dev-only endpoint).',
    };
  }

  private calculateFinalPrice(plan: {
    basePrice: number;
    discountType: DiscountType;
    discountPercent: number;
    fixedDiscountPrice: number | null;
  }): number {
    switch (plan.discountType) {
      case 'PERCENTAGE':
        return Math.round(plan.basePrice * (1 - plan.discountPercent / 100) * 100) / 100;
      case 'FIXED_PRICE':
        if (plan.fixedDiscountPrice == null) return plan.basePrice;
        return plan.fixedDiscountPrice;
      default:
        return plan.basePrice;
    }
  }
}
