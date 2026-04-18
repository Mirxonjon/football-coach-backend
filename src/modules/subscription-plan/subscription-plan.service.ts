import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateSubscriptionPlanDto } from '@/types/subscription-plan/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from '@/types/subscription-plan/update-subscription-plan.dto';

@Injectable()
export class SubscriptionPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: number) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return plan;
  }

  async create(dto: CreateSubscriptionPlanDto) {
    return this.prisma.subscriptionPlan.create({ data: dto });
  }

  async update(id: number, dto: UpdateSubscriptionPlanDto) {
    await this.findById(id);
    return this.prisma.subscriptionPlan.update({ where: { id }, data: dto });
  }

  async softDelete(id: number) {
    await this.findById(id);
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
