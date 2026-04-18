import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateOperatorPayoutDto } from '@/types/operator-payout/create-operator-payout.dto';
import { UpdateOperatorPayoutDto } from '@/types/operator-payout/update-operator-payout.dto';
import { FilterOperatorPayoutDto } from '@/types/operator-payout/filter-operator-payout.dto';
import { PayoutStatus } from '@prisma/client';

@Injectable()
export class OperatorPayoutService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOperatorPayoutDto) {
    return this.prisma.operatorPayout.create({
      data: {
        operatorId: dto.operatorId,
        amount: dto.amount,
        currency: dto.currency ?? 'UZS',
        status: (dto.status as PayoutStatus) ?? PayoutStatus.PENDING,
        periodFrom: dto.periodFrom ? new Date(dto.periodFrom) : undefined,
        periodTo: dto.periodTo ? new Date(dto.periodTo) : undefined,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
      },
    });
  }

  async findAll(query: FilterOperatorPayoutDto) {
    const { page = 1, limit = 10, operatorId, status, from, to } = query;
    const where: any = {};
    if (operatorId) where.operatorId = operatorId;
    if (status) where.status = status as PayoutStatus;
    if (from || to) {
      where.periodFrom = {};
      if (from) where.periodFrom.gte = new Date(from);
      if (to) where.periodFrom.lte = new Date(to);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.operatorPayout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { operator: true },
      }),
      this.prisma.operatorPayout.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const item = await this.prisma.operatorPayout.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Operator payout not found');
    return item;
  }

  async update(id: number, dto: UpdateOperatorPayoutDto) {
    await this.findOne(id);
    return this.prisma.operatorPayout.update({
      where: { id },
      data: {
        operatorId: dto.operatorId,
        amount: dto.amount,
        currency: dto.currency,
        status: dto.status as PayoutStatus,
        periodFrom: dto.periodFrom ? new Date(dto.periodFrom) : undefined,
        periodTo: dto.periodTo ? new Date(dto.periodTo) : undefined,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.operatorPayout.delete({ where: { id } });
    return { success: true };
  }
}
