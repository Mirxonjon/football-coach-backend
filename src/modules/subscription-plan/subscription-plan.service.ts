import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateSubscriptionPlanDto } from '@/types/subscription-plan/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from '@/types/subscription-plan/update-subscription-plan.dto';
import { PlanFeatureDto } from '@/types/subscription-plan/plan-feature.dto';

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
    const { features, ...rest } = dto;
    return this.prisma.subscriptionPlan.create({
      data: {
        ...rest,
        ...(features !== undefined && {
          features: this.toJsonFeatures(features),
        }),
      },
    });
  }

  async update(id: number, dto: UpdateSubscriptionPlanDto) {
    await this.findById(id);
    const { features, ...rest } = dto;
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...rest,
        ...(features !== undefined && {
          features: this.toJsonFeatures(features),
        }),
      },
    });
  }

  async softDelete(id: number) {
    await this.findById(id);
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private toJsonFeatures(features: PlanFeatureDto[]): Prisma.InputJsonValue {
    return features.map((f) => ({
      uz: f.uz,
      ru: f.ru,
      ...(f.highlight !== undefined && { highlight: f.highlight }),
    })) as unknown as Prisma.InputJsonValue;
  }
}
