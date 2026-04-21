import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

type DateBucketRow = { date: Date; total: number | bigint; count: number | bigint };
type CountBucketRow = { date: Date; count: number | bigint };

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveRange(from?: Date, to?: Date): { from: Date; to: Date } {
    const now = new Date();
    const resolvedTo = to ? new Date(to) : now;
    const resolvedFrom = from
      ? new Date(from)
      : new Date(resolvedTo.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: resolvedFrom, to: resolvedTo };
  }

  private formatDay(d: Date): string {
    // YYYY-MM-DD
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async getOverview() {
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      newUsers7d,
      newUsers30d,
      activeSubs,
      expiredSubs,
      totalSubs,
      totalSuccessAgg,
      last7dAgg,
      last30dAgg,
      pendingAgg,
      lessonsCount,
      booksCount,
      trainingCatCount,
      ageCatCount,
      totalLessonProgress,
      completedLessons,
      aiChatsTotal,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: last7d } } }),
      this.prisma.user.count({ where: { createdAt: { gte: last30d } } }),
      this.prisma.subscription.count({
        where: { isActive: true, endDate: { gte: now } },
      }),
      this.prisma.subscription.count({
        where: {
          OR: [{ isActive: false }, { endDate: { lt: now } }],
        },
      }),
      this.prisma.subscription.count(),
      this.prisma.walletTransaction.aggregate({
        where: { status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { status: PaymentStatus.SUCCESS, createdAt: { gte: last7d } },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { status: PaymentStatus.SUCCESS, createdAt: { gte: last30d } },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { status: PaymentStatus.PENDING },
        _sum: { amount: true },
      }),
      this.prisma.trainingLesson.count(),
      this.prisma.book.count(),
      this.prisma.trainingCategory.count(),
      this.prisma.ageCategory.count(),
      this.prisma.lessonProgress.count(),
      this.prisma.lessonProgress.count({ where: { isCompleted: true } }),
      this.prisma.aiChat.count(),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newLast7d: newUsers7d,
        newLast30d: newUsers30d,
      },
      subscriptions: {
        active: activeSubs,
        expired: expiredSubs,
        totalEver: totalSubs,
      },
      revenue: {
        totalSuccess: Number(totalSuccessAgg._sum.amount ?? 0),
        last7d: Number(last7dAgg._sum.amount ?? 0),
        last30d: Number(last30dAgg._sum.amount ?? 0),
        pendingAmount: Number(pendingAgg._sum.amount ?? 0),
      },
      content: {
        lessons: lessonsCount,
        books: booksCount,
        trainingCategories: trainingCatCount,
        ageCategories: ageCatCount,
      },
      engagement: {
        totalLessonProgress,
        completedLessons,
        aiChatsTotal,
      },
    };
  }

  async getRevenue(fromInput?: Date, toInput?: Date) {
    const { from, to } = this.resolveRange(fromInput, toInput);

    const rows = await this.prisma.$queryRaw<DateBucketRow[]>`
      SELECT
        DATE_TRUNC('day', "createdAt") AS date,
        COALESCE(SUM("amount"), 0) AS total,
        COUNT(*) AS count
      FROM "WalletTransaction"
      WHERE "status" = 'SUCCESS'
        AND "createdAt" >= ${from}
        AND "createdAt" <= ${to}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY DATE_TRUNC('day', "createdAt") ASC
    `;

    return rows.map((row) => ({
      date: this.formatDay(new Date(row.date)),
      total: Number(row.total),
      count: Number(row.count),
    }));
  }

  async getUsersGrowth(fromInput?: Date, toInput?: Date) {
    const { from, to } = this.resolveRange(fromInput, toInput);

    const rows = await this.prisma.$queryRaw<CountBucketRow[]>`
      SELECT
        DATE_TRUNC('day', "createdAt") AS date,
        COUNT(*) AS count
      FROM "User"
      WHERE "createdAt" >= ${from}
        AND "createdAt" <= ${to}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY DATE_TRUNC('day', "createdAt") ASC
    `;

    return rows.map((row) => ({
      date: this.formatDay(new Date(row.date)),
      count: Number(row.count),
    }));
  }

  async getTopLessons(limit = 10) {
    const grouped = await this.prisma.lessonProgress.groupBy({
      by: ['lessonId'],
      _count: { lessonId: true },
      orderBy: { _count: { lessonId: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) return [];

    const lessonIds = grouped.map((g) => g.lessonId);

    const [lessons, completedGroups] = await Promise.all([
      this.prisma.trainingLesson.findMany({
        where: { id: { in: lessonIds } },
        select: {
          id: true,
          titleUz: true,
          titleRu: true,
          trainingCategory: { select: { titleUz: true, titleRu: true } },
        },
      }),
      this.prisma.lessonProgress.groupBy({
        by: ['lessonId'],
        where: { lessonId: { in: lessonIds }, isCompleted: true },
        _count: { lessonId: true },
      }),
    ]);

    const lessonMap = new Map(lessons.map((l) => [l.id, l]));
    const completedMap = new Map(
      completedGroups.map((g) => [g.lessonId, g._count.lessonId]),
    );

    return grouped.map((g) => {
      const lesson = lessonMap.get(g.lessonId);
      return {
        lessonId: g.lessonId,
        titleUz: lesson?.titleUz ?? null,
        titleRu: lesson?.titleRu ?? null,
        categoryTitleUz: lesson?.trainingCategory?.titleUz ?? null,
        categoryTitleRu: lesson?.trainingCategory?.titleRu ?? null,
        progressCount: g._count.lessonId,
        completedCount: completedMap.get(g.lessonId) ?? 0,
      };
    });
  }

  async getTopBooks(limit = 10) {
    const grouped = await this.prisma.userBook.groupBy({
      by: ['bookId'],
      _count: { bookId: true },
      orderBy: { _count: { bookId: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) return [];

    const bookIds = grouped.map((g) => g.bookId);

    const books = await this.prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, titleUz: true, titleRu: true },
    });

    const bookMap = new Map(books.map((b) => [b.id, b]));

    return grouped.map((g) => {
      const book = bookMap.get(g.bookId);
      return {
        bookId: g.bookId,
        titleUz: book?.titleUz ?? null,
        titleRu: book?.titleRu ?? null,
        purchaseCount: g._count.bookId,
      };
    });
  }

  async getSubscriptionsByPlan() {
    const now = new Date();

    const plans = await this.prisma.subscriptionPlan.findMany({
      select: { id: true, titleUz: true, titleRu: true },
    });

    if (plans.length === 0) return [];

    const planIds = plans.map((p) => p.id);

    const [totalGroups, activeGroups, revenueGroups] = await Promise.all([
      this.prisma.subscription.groupBy({
        by: ['subscriptionsPlansId'],
        where: { subscriptionsPlansId: { in: planIds } },
        _count: { subscriptionsPlansId: true },
      }),
      this.prisma.subscription.groupBy({
        by: ['subscriptionsPlansId'],
        where: {
          subscriptionsPlansId: { in: planIds },
          isActive: true,
          endDate: { gte: now },
        },
        _count: { subscriptionsPlansId: true },
      }),
      this.prisma.walletTransaction.groupBy({
        by: ['subscriptionsPlansId'],
        where: {
          subscriptionsPlansId: { in: planIds },
          status: PaymentStatus.SUCCESS,
        },
        _sum: { amount: true },
      }),
    ]);

    const totalMap = new Map(
      totalGroups.map((g) => [g.subscriptionsPlansId, g._count.subscriptionsPlansId]),
    );
    const activeMap = new Map(
      activeGroups.map((g) => [g.subscriptionsPlansId, g._count.subscriptionsPlansId]),
    );
    const revenueMap = new Map(
      revenueGroups.map((g) => [g.subscriptionsPlansId, Number(g._sum.amount ?? 0)]),
    );

    return plans.map((plan) => ({
      planId: plan.id,
      titleUz: plan.titleUz,
      titleRu: plan.titleRu,
      activeCount: activeMap.get(plan.id) ?? 0,
      totalCount: totalMap.get(plan.id) ?? 0,
      revenue: revenueMap.get(plan.id) ?? 0,
    }));
  }

  async getNotificationsSummary() {
    const [total, unread, byTypeTotal, byTypeUnread] = await Promise.all([
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { isRead: false } }),
      this.prisma.notification.groupBy({
        by: ['type'],
        _count: { type: true },
      }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where: { isRead: false },
        _count: { type: true },
      }),
    ]);

    const unreadMap = new Map(
      byTypeUnread.map((g) => [g.type, g._count.type]),
    );

    const byType = byTypeTotal.map((g) => ({
      type: g.type,
      total: g._count.type,
      unread: unreadMap.get(g.type) ?? 0,
    }));

    return { total, unread, byType };
  }
}
