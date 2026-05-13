import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { ClickProvider } from '@/modules/payments/providers/click.provider';
import { NotificationService } from '@/modules/notification/notification.service';
import { DiscountType, NotificationType } from '@prisma/client';

type PlanLike = {
  basePrice: number;
  discountType: DiscountType;
  discountPercent: number;
  fixedDiscountPrice: number | null;
  durationDays: number;
};

@Injectable()
export class SubscriptionCron {
  private readonly logger = new Logger(SubscriptionCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly click: ClickProvider,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * Runs every day at 02:00 server time.
   *   - Subscriptions expiring within the next 24h with autoPay=true → charge saved card,
   *     extend endDate by plan.durationDays.
   *   - Subscriptions expiring in 3 days or 1 day with autoPay=false → push notification
   *     (deduped by lastExpiryNoticeDay so we don't spam).
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async run() {
    const now = new Date();

    await this.processAutoRenewals(now);
    await this.processExpiryNotices(now, 3);
    await this.processExpiryNotices(now, 1);
  }

  private async processAutoRenewals(now: Date) {
    // Find subs whose endDate falls in the next 24h and have autoPay on
    const upper = new Date(now);
    upper.setDate(upper.getDate() + 1);

    const subs = await this.prisma.subscription.findMany({
      where: {
        isActive: true,
        autoPay: true,
        endDate: { gte: now, lte: upper },
        cardId: { not: null },
      },
      include: { subscriptionsPlan: true },
    });

    for (const sub of subs) {
      if (!sub.cardId) continue;
      try {
        const card = await this.prisma.card.findUnique({ where: { id: sub.cardId } });
        if (!card || !card.isActive || !card.isVerified) {
          await this.notifyNoCard(sub.userId);
          continue;
        }

        const amount = this.priceFor(sub.subscriptionsPlan);
        const charge = await this.click.charge(amount, card.token);

        await this.prisma.walletTransaction.create({
          data: {
            userId: sub.userId,
            amount,
            cardId: card.id,
            subscriptionsPlansId: sub.subscriptionsPlansId,
            provider: 'click',
            status: charge.success ? 'SUCCESS' : 'FAILED',
            externalId: charge.externalId ?? null,
            errorCode: charge.errorCode ?? null,
            errorMessage: charge.errorMessage ?? null,
          },
        });

        if (charge.success) {
          const newEnd = new Date(sub.endDate);
          newEnd.setDate(newEnd.getDate() + sub.subscriptionsPlan.durationDays);
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: {
              endDate: newEnd,
              lastRenewalAttemptAt: now,
              lastExpiryNoticeDay: null,
              isActive: true,
            },
          });
          await this.notifications.sendToUser(sub.userId, {
            title: 'Obuna yangilandi',
            body: 'Obunangiz avtomatik ravishda yangilandi. Rahmat!',
            type: NotificationType.SUBSCRIPTION,
            data: { subscriptionId: sub.id },
          });
        } else {
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { lastRenewalAttemptAt: now },
          });
          await this.notifications.sendToUser(sub.userId, {
            title: "Avtomatik to'lov amalga oshmadi",
            body:
              "Obunangizni yangilashda xatolik yuz berdi. Iltimos, kartangizni tekshiring va qo'lda to'lovni amalga oshiring.",
            type: NotificationType.SUBSCRIPTION,
            data: {
              subscriptionId: sub.id,
              errorCode: charge.errorCode ?? '',
            },
          });
        }
      } catch (err: any) {
        this.logger.error(`Auto-renew failed for subscription ${sub.id}: ${err?.message}`);
      }
    }
  }

  private async processExpiryNotices(now: Date, daysBefore: number) {
    // Subscriptions ending in [daysBefore, daysBefore + 1) days, autoPay off, not yet notified for this threshold.
    const start = new Date(now);
    start.setDate(start.getDate() + daysBefore);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const subs = await this.prisma.subscription.findMany({
      where: {
        isActive: true,
        autoPay: false,
        endDate: { gte: start, lt: end },
        OR: [
          { lastExpiryNoticeDay: null },
          { lastExpiryNoticeDay: { gt: daysBefore } },
        ],
      },
    });

    for (const sub of subs) {
      try {
        await this.notifications.sendToUser(sub.userId, {
          title: 'Obuna tugash arafasida',
          body:
            daysBefore === 1
              ? "Obunangiz ertaga tugaydi. Uzilishlarning oldini olish uchun to'lovni amalga oshiring yoki avto-to'lovni yoqing."
              : `Obunangiz ${daysBefore} kundan keyin tugaydi. To'lovni amalga oshiring yoki avto-to'lovni yoqing.`,
          type: NotificationType.SUBSCRIPTION,
          data: { subscriptionId: sub.id, daysLeft: daysBefore },
        });
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { lastExpiryNoticeDay: daysBefore },
        });
      } catch (err: any) {
        this.logger.error(
          `Expiry notice (d-${daysBefore}) failed for subscription ${sub.id}: ${err?.message}`,
        );
      }
    }
  }

  private async notifyNoCard(userId: number) {
    await this.notifications.sendToUser(userId, {
      title: "Avto-to'lov uchun karta topilmadi",
      body: "Obunani yangilash uchun saqlangan karta yo'q. Iltimos, karta qo'shing.",
      type: NotificationType.SUBSCRIPTION,
    });
  }

  private priceFor(plan: PlanLike): number {
    switch (plan.discountType) {
      case 'PERCENTAGE':
        return Math.round(plan.basePrice * (1 - plan.discountPercent / 100) * 100) / 100;
      case 'FIXED_PRICE':
        return plan.fixedDiscountPrice ?? plan.basePrice;
      default:
        return plan.basePrice;
    }
  }
}
