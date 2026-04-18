import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateFuelPumpDto } from '@/types/fuel-pump/create-fuel-pump.dto';
import { UpdateFuelPumpDto } from '@/types/fuel-pump/update-fuel-pump.dto';
import { FilterFuelPumpDto } from '@/types/fuel-pump/filter-fuel-pump.dto';
import { ConnectorStatus } from '@prisma/client';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FuelPumpService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateFuelPumpDto) {
    if (!dto.qrCode) {
      dto.qrCode = uuidv4();
    }
    return this.prisma.fuelPump.create({ data: dto });
  }

  async findAll(query: FilterFuelPumpDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', stationId, status } = query;
    const where: any = {};
    if (stationId) where.stationId = stationId;
    if (status) where.status = status as ConnectorStatus;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.fuelPump.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          fuelStation: {
            include: {
              operator: true,
            },
          },
        },
      }),
      this.prisma.fuelPump.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const item = await this.prisma.fuelPump.findUnique({
      where: { id },
      include: {
        fuelStation: {
          include: {
            operator: true,
          },
        },
        fuels: {
          include: {
            fuelType: true,
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Fuel pump not found');
    return item;
  }

  async update(id: number, dto: UpdateFuelPumpDto) {
    await this.findOne(id);
    return this.prisma.fuelPump.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.fuelPump.delete({ where: { id } });
    return { success: true };
  }

  async findByQrCode(qrCode: string) {
    const item = await this.prisma.fuelPump.findUnique({
      where: { qrCode },
      include: {
        fuelStation: {
          include: {
            operator: true,
          },
        },
        fuels: {
          include: {
            fuelType: true,
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Fuel pump not found by QR code');
    return item;
  }

  async generateQrCodeImage(id: number): Promise<Buffer> {
    const pump = await this.findOne(id);
    // TypeScript might think qrCode is optionally missing even if it's in the DB
    const qrToken = (pump as any).qrCode || uuidv4();
    
    if (!(pump as any).qrCode) {
      await this.prisma.fuelPump.update({
        where: { id },
        data: { qrCode: qrToken },
      });
    }

    // Return the QR code as a PNG buffer
    return QRCode.toBuffer(qrToken);
  }
}
