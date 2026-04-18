import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateFuelPumpFuelDto } from '@/types/fuel-pump-fuel/create-fuel-pump-fuel.dto';
import { UpdateFuelPumpFuelDto } from '@/types/fuel-pump-fuel/update-fuel-pump-fuel.dto';
import { FilterFuelPumpFuelDto } from '@/types/fuel-pump-fuel/filter-fuel-pump-fuel.dto';

@Injectable()
export class FuelPumpFuelService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateFuelPumpFuelDto) {
    return this.prisma.fuelPumpFuel.create({ data: dto });
  }

  async findAll(query: FilterFuelPumpFuelDto) {
    const { page = 1, limit = 10, fuelPumpId } = query;
    const where: any = {};
    if (fuelPumpId) where.fuelPumpId = fuelPumpId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.fuelPumpFuel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fuelPumpId: true,
          fuelTypeId: true,
          price: true,
          createdAt: true,
          updatedAt: true,
          fuelPump: {
            select: {
              id: true,
              fuelPumpNumber: true,
              status: true,
              stationId: true,
            }
          },
          fuelType: {
            select: {
              id: true,
              name: true,
              octane: true,
              unit: true,
              category: true,
              picture: true,
              createdAt: true,
              updatedAt: true,
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.fuelPumpFuel.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const item = await this.prisma.fuelPumpFuel.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Fuel pump fuel not found');
    return item;
  }

  async update(id: number, dto: UpdateFuelPumpFuelDto) {
    await this.findOne(id);
    return this.prisma.fuelPumpFuel.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.fuelPumpFuel.delete({ where: { id } });
    return { success: true };
  }
}
