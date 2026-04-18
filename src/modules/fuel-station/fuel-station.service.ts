import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateFuelStationDto } from '@/types/fuel-station/create-fuel-station.dto';
import { UpdateFuelStationDto } from '@/types/fuel-station/update-fuel-station.dto';
import { FilterFuelStationDto } from '@/types/fuel-station/filter-fuel-station.dto';

@Injectable()
export class FuelStationService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateFuelStationDto) {
    const created = await this.prisma.fuelStation.create({ data: dto });
    return created;
  }

  async findAll(query: FilterFuelStationDto, userId?: number) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minPrice,
      maxPrice,
      operatorId,
      isActive,
      search,
      fuelType_id,
      pumpStatus,
      from,
      to,
      lat,
      lng,
      radiusKm,
      category,
      octane,
    } = query;

    const where: any = {};

    if (operatorId) where.operatorId = operatorId;
    if (typeof isActive === 'boolean') where.isActive = isActive;
    
    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    if (fuelType_id || pumpStatus || minPrice !== undefined || maxPrice !== undefined || category || octane) {
      where.fuelPumps = {
        some: {},
      };

      if (pumpStatus) {
        where.fuelPumps.some.status = pumpStatus;
      }

      if (fuelType_id || minPrice !== undefined || maxPrice !== undefined || category || octane) {
        where.fuelPumps.some.fuels = {
          some: {},
        };

        if (fuelType_id) {
          where.fuelPumps.some.fuels.some.fuelTypeId = fuelType_id;
        }

        if (category || octane) {
          where.fuelPumps.some.fuels.some.fuelType = {};
          if (category) {
            let catArr: string[] = Array.isArray(category) ? [...category] as string[] : [category] as string[];
            if (catArr.includes('GAS_AND_PROPANE')) {
              catArr = catArr.filter((c: string) => c !== 'GAS_AND_PROPANE');
              catArr.push('GAS', 'PROPANE');
            }
            where.fuelPumps.some.fuels.some.fuelType.category = { in: catArr as any };
          }
          if (octane) {
            where.fuelPumps.some.fuels.some.fuelType.octane = { in: Array.isArray(octane) ? octane : [octane] };
          }
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
          const priceFilter: any = {};
          if (minPrice !== undefined) priceFilter.gte = Number(minPrice);
          if (maxPrice !== undefined) priceFilter.lte = Number(maxPrice);
          where.fuelPumps.some.fuels.some.price = priceFilter;
        }
      }
    }

    let stations = (await this.prisma.fuelStation.findMany({
      where,
      include: {
        operator: {
          select: {
            title: true,
            color: true,
          },
        },
        fuelPumps: {
          select: {
            id: true, 
            fuelPumpNumber: true,
            status: true,
            fuels: {
              include: {
                fuelType: {
                  select: {
                    name: true,
                    picture: true,
                    octane: true,
                    unit: true,
                    category:true
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
    })) as any;

    // 🔥 DISTANCE LOGIC
    if (lat !== undefined && lng !== undefined) {
      const R = 6371;
      const toRad = (v: number) => (v * Math.PI) / 180;

      stations = stations.map((s) => {
        const dLat = toRad(s.latitude - lat);
        const dLng = toRad(s.longitude - lng);

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat)) *
          Math.cos(toRad(s.latitude)) *
          Math.sin(dLng / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;

        return {
          ...s,
          distanceKm: Number(d.toFixed(2)),
        };
      });

      if (radiusKm !== undefined) {
        stations = stations.filter((s) => s.distanceKm <= radiusKm);
      }

      stations.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    let likedStationIds: number[] = [];

    if (userId) {
      const likes = await this.prisma.fuelStationLike.findMany({
        where: {
          userId,
          fuelStationId: { in: stations.map((s) => s.id) },
        },
        select: { fuelStationId: true },
      });

      likedStationIds = likes.map((l) => l.fuelStationId);
    }

    stations = stations.map((s) => ({
      ...s,
      isLiked: userId ? likedStationIds.includes(s.id) : false,
    }));

    const total = stations.length;
    const paginated = stations.slice((page - 1) * limit, page * limit);

    return {
      items: paginated,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number) {
    const item = await this.prisma.fuelStation.findUnique({
      where: { id },
      include: {
        fuelPumps: {
          include: {
            fuels: {
              include: {
                fuelType: true
              }
            }
          }
        }
      }
    });
    if (!item) throw new NotFoundException('Fuel station not found');
    return item;
  }

  async update(id: number, dto: UpdateFuelStationDto) {
    await this.findOne(id);
    const updated = await this.prisma.fuelStation.update({
      where: { id },
      data: dto,
    });
    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.fuelStation.delete({ where: { id } });
    return { success: true };
  }
}
