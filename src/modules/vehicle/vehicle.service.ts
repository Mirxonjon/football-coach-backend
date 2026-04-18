import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateCarDto } from '@/types/vehicle/create-car.dto';
import { UpdateCarDto } from '@/types/vehicle/update-car.dto';
import { CarFilterDto } from '@/types/vehicle/car-filter.dto';
import { AddUserCarDto } from '@/types/vehicle/add-user-car.dto';
import { UpdateUserCarDto } from '@/types/vehicle/update-user-car.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VehicleService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateCarDto, createdById?: number) {
    try {
      const car = await this.prisma.car.create({
        data: { ...dto, createdById },
      });
      return car;
    } catch (e) {
      if (e.code === 'P2002')
        throw new BadRequestException('VIN must be unique');
      throw e;
    }
  }

  async update(id: number, dto: UpdateCarDto) {
    const exists = await this.prisma.car.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Car not found');
    try {
      return await this.prisma.car.update({ where: { id }, data: dto });
    } catch (e) {
      if (e.code === 'P2002')
        throw new BadRequestException('VIN must be unique');
      throw e;
    }
  }

  async remove(id: number) {
    await this.prisma.userCar.deleteMany({ where: { carId: id } });
    await this.prisma.car.delete({ where: { id } });
    return { success: true };
  }

  async findOne(id: number) {
    const car = await this.prisma.car.findUnique({ where: { id } });
    if (!car) throw new NotFoundException('Car not found');
    return car;
  }

  async findAll(query: CarFilterDto) {
    const {
      brand,
      model,
      yearFrom,
      yearTo,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: any = {};
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (model) where.model = { contains: model, mode: 'insensitive' };
    if (yearFrom || yearTo)
      where.year = { gte: yearFrom ?? undefined, lte: yearTo ?? undefined };
    if (search)
      where.OR = [
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];

    if (typeof query.createdById === 'number')
      where.createdById = query.createdById;

    const total = await this.prisma.car.count({ where });
    const data = await this.prisma.car.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    return { total, page, limit, data };
  }

  async addToUser(userId: number, dto: AddUserCarDto) {
    let carId = dto.carId;

    if (dto.vin) {
      const existingVin = await this.prisma.userCar.findUnique({
        where: { vin: dto.vin },
      });

      if (existingVin) {
        throw new BadRequestException('Car with this VIN already exists');
      }
    }

    if (dto.plateNumber) {
      const existingPlate = await this.prisma.userCar.findUnique({
        where: { plateNumber: dto.plateNumber },
      });

      if (existingPlate) {
        throw new BadRequestException('plateNumber already exists');
      }
    }
    if (!carId) {
      if (!dto.brand || !dto.model)
        throw new BadRequestException(
          'brand and model required for custom car'
        );

      console.log(dto);

      const create = await this.prisma.car.create({
        data: {
          brand: dto.brand,
          model: dto.model,
          year: dto.year ?? undefined,
          createdById: userId,
        },
      });
      carId = create.id;
    } else {
      const car = await this.prisma.car.findUnique({ where: { id: carId } });
      if (!car) throw new NotFoundException('Car not found');
    }

    // Ensure uniqueness per user+car? Allow multiple with different plateNumbers.
    try {
      const userCar = await this.prisma.userCar.create({
        data: {
          userId,
          carId,
          vin: dto.vin ?? undefined,
          plateNumber: dto.plateNumber ?? undefined,
          color: dto.color ?? undefined,
        },
      });
      return userCar;
    } catch (e) {
      if (e.code === 'P2002')
        throw new BadRequestException('plateNumber must be unique');
      throw e;
    }
  }

  async removeFromUser(userId: number, userCarId: number) {
    const uc = await this.prisma.userCar.findUnique({
      where: { id: userCarId },
    });
    if (!uc || uc.userId !== userId)
      throw new NotFoundException('User car not found');
    await this.prisma.userCar.delete({ where: { id: userCarId } });
    return { success: true };
  }

  async updateUserCar(
    userId: number,
    userCarId: number,
    dto: UpdateUserCarDto
  ) {
    const uc = await this.prisma.userCar.findUnique({
      where: { id: userCarId },
    });

    if (!uc || uc.userId !== userId) {
      throw new NotFoundException('User car not found');
    }

    if (dto.vin && dto.vin !== uc.vin) {
      const existingVin = await this.prisma.userCar.findUnique({
        where: { vin: dto.vin },
      });
      if (existingVin) {
        throw new BadRequestException('Car with this VIN already exists');
      }
    }

    if (dto.plateNumber && dto.plateNumber !== uc.plateNumber) {
      const existingPlate = await this.prisma.userCar.findUnique({
        where: { plateNumber: dto.plateNumber },
      });
      if (existingPlate) {
        throw new BadRequestException('plateNumber already exists');
      }
    }

    if (dto.carId && dto.carId !== uc.carId) {
      const carExists = await this.prisma.car.findUnique({
        where: { id: dto.carId },
      });
      if (!carExists) {
        throw new NotFoundException('Car not found');
      }
    }

    try {
      return await this.prisma.userCar.update({
        where: { id: userCarId },
        data: {
          vin: dto.vin,
          plateNumber: dto.plateNumber,
          color: dto.color,
          carId: dto.carId,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('Duplicate entry for vin or plateNumber');
      }
      throw e;
    }
  }

  async getUserCars(userId: number) {
    return this.prisma.userCar.findMany({
      where: { userId },
      include: { car: true },
    });
  }

  // External sync
  async syncExternal() {
    const filePath = path.join(process.cwd(), 'ev-cars.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    let created = 0;
    let updated = 0;

    for (const brandBlock of data) {
      const brandName = brandBlock.brand;
      const logoUrl = brandBlock.logo_url;

      for (const m of brandBlock.models) {
        const mapped = {
          brand: brandName,
          model: m.model,
          imageUrl: logoUrl ?? undefined,
          year: m.year ?? undefined,
        };

        const existing = await this.prisma.car.findFirst({
          where: {
            brand: mapped.brand,
            model: mapped.model,
          },
        });

        if (existing) {
          await this.prisma.car.update({
            where: { id: existing.id },
            data: {
              imageUrl: mapped.imageUrl,
              year: mapped.year,
            },
          });

          updated++;
        } else {
          await this.prisma.car.create({
            data: {
              ...mapped,
              createdById: null,
            },
          });

          created++;
        }
      }
    }

    return { created, updated };
  }
}
