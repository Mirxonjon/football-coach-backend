import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateSubscriptionDto } from '@/types/subscription/create-subscription.dto';
import { DiscountType } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

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

    if (dto.cardId) {
      const card = await this.prisma.card.findFirst({
        where: { id: dto.cardId, userId, isActive: true },
      });
      if (!card) throw new BadRequestException('Card not found');
    }

    const amount = this.calculateFinalPrice(plan);

    const startDate = now;
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const [subscription, transaction] = await this.prisma.$transaction(
      async (tx) => {
        const walletTx = await tx.walletTransaction.create({
          data: {
            userId,
            amount,
            subscriptionsPlansId: plan.id,
            cardId: dto.cardId ?? null,
            status: 'PENDING',
            provider: dto.cardId ? 'click' : null,
          },
        });

        const sub = await tx.subscription.create({
          data: {
            userId,
            subscriptionsPlansId: plan.id,
            startDate,
            endDate,
            isActive: false,
          },
          include: { subscriptionsPlan: true },
        });

        return [sub, walletTx];
      },
    );

    return {
      subscription,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
      },
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
        return Math.round(
          plan.basePrice * (1 - plan.discountPercent / 100) * 100,
        ) / 100;
      case 'FIXED_PRICE':
        if (plan.fixedDiscountPrice == null) return plan.basePrice;
        return plan.fixedDiscountPrice;
      default:
        return plan.basePrice;
    }
  }
}
