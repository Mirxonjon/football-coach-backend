import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateFuelPumpStatusLogDto } from '@/types/fuel-pump-status-log/create-fuel-pump-status-log.dto';
import { FilterFuelPumpStatusLogDto } from '@/types/fuel-pump-status-log/filter-fuel-pump-status-log.dto';

@Injectable()
export class FuelPumpStatusLogService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFuelPumpStatusLogDto) {
    return this.prisma.fuelPumpStatusLog.create({ data: dto });
  }

  async findAll(query: FilterFuelPumpStatusLogDto) {
    const { page = 1, limit = 10, fuelPumpId, status, from, to } = query;
    const where: any = {};
    if (fuelPumpId) where.fuelPumpId = fuelPumpId;
    if (status) where.status = status;

    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.fuelPumpStatusLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.fuelPumpStatusLog.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async remove(id: number) {
    const existing = await this.prisma.fuelPumpStatusLog.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Log not found');
    await this.prisma.fuelPumpStatusLog.delete({ where: { id } });
    return { success: true };
  }
}
