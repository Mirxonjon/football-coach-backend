import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { ConfirmTransactionDto } from '@/types/payments/confirm-transaction.dto';
import { WalletQueryDto } from '@/types/payments/wallet-query.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listTransactions(userId: number, query: WalletQueryDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          amount: true,
          status: true,
          provider: true,
          externalId: true,
          errorCode: true,
          errorMessage: true,
          subscriptionsPlansId: true,
          createdAt: true,
        },
      }),
      this.prisma.walletTransaction.count({ where: { userId } }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async confirmTransaction(txId: number, dto: ConfirmTransactionDto) {
    const tx = await this.prisma.walletTransaction.findUnique({
      where: { id: txId },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status !== 'PENDING') {
      throw new BadRequestException('Transaction is not PENDING');
    }

    const status = dto.status as 'SUCCESS' | 'FAILED';

    const updated = await this.prisma.walletTransaction.update({
      where: { id: txId },
      data: {
        status,
        externalId: dto.externalId ?? tx.externalId,
        errorCode: dto.errorCode,
        errorMessage: dto.errorMessage,
      },
    });

    if (status === 'SUCCESS') {
      await this.fulfillPurchase(tx.userId, tx.subscriptionsPlansId, txId);
    }

    this.logger.log(
      `Transaction ${txId} confirmed as ${status}`,
    );

    return updated;
  }

  private async fulfillPurchase(
    userId: number,
    planId: number | null,
    transactionId: number,
  ) {
    if (planId) {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      });
      if (!plan) return;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.durationDays);

      await this.prisma.subscription.create({
        data: {
          userId,
          subscriptionsPlansId: planId,
          startDate,
          endDate,
          isActive: true,
        },
      });
      this.logger.log(`Subscription created for user ${userId}, plan ${planId}`);
      return;
    }

    const txWithBook = await this.prisma.walletTransaction.findUnique({
      where: { id: transactionId },
      select: { id: true },
    });

    if (!txWithBook) return;
  }
}
