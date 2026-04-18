import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FuelStationLikeService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureFuelStationExists(fuelStationId: number) {
    const station = await this.prisma.fuelStation.findUnique({ where: { id: fuelStationId } });
    if (!station) throw new NotFoundException('Fuel station not found');
    return station;
  }

  async toggle(userId: number, fuelStationId: number): Promise<{ liked: boolean }> {
    await this.ensureFuelStationExists(fuelStationId);

    const existing = await this.prisma.fuelStationLike.findUnique({
      where: { userId_fuelStationId: { userId, fuelStationId } },
    });

    if (existing) {
      await this.prisma.fuelStationLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }

    try {
      await this.prisma.fuelStationLike.create({ data: { userId, fuelStationId } });
      return { liked: true };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // Unique constraint hit concurrently → treat as already liked
        return { liked: true };
      }
      throw e;
    }
  }

  async myLikes(userId: number, page = 1, limit = 10) {
    const where = { userId };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.fuelStationLike.count({ where }),
      this.prisma.fuelStationLike.findMany({
        where,
        include: {
          fuelStation: {
            include: {
              operator: {
                select: {
                  title: true,
                  color: true,
                },
              },
              fuelPumps: {
                include: {
                  fuels: {
                    include: {
                      fuelType: true
                    }
                  }
                }
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, total, page, limit };
  }

  async countForStation(fuelStationId: number): Promise<number> {
    await this.ensureFuelStationExists(fuelStationId);
    return this.prisma.fuelStationLike.count({ where: { fuelStationId } });
  }

  async checkLiked(userId: number, fuelStationId: number): Promise<boolean> {
    await this.ensureFuelStationExists(fuelStationId);
    const like = await this.prisma.fuelStationLike.findUnique({
      where: { userId_fuelStationId: { userId, fuelStationId } },
      select: { id: true },
    });
    return Boolean(like);
  }
}
