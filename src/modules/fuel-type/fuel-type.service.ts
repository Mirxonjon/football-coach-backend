import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFuelTypeDto } from './types/create-fuel-type.dto';
import { UpdateFuelTypeDto } from './types/update-fuel-type.dto';
import { FuelType } from '@prisma/client';

@Injectable()
export class FuelTypeService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createDto: CreateFuelTypeDto): Promise<FuelType> {
        const existingType = await this.prisma.fuelType.findUnique({
            where: { name: createDto.name },
        });

        if (existingType) {
            throw new ConflictException(`Fuel type with name '${createDto.name}' already exists.`);
        }

        return this.prisma.fuelType.create({
            data: createDto,
        });
    }

    async findAll(): Promise<FuelType[]> {
        return this.prisma.fuelType.findMany({
            orderBy: { id: 'desc' },
        });
    }

    async findOne(id: number): Promise<FuelType> {
        const fuelType = await this.prisma.fuelType.findUnique({
            where: { id },
        });

        if (!fuelType) {
            throw new NotFoundException(`Fuel type with ID ${id} not found.`);
        }

        return fuelType;
    }

    async update(id: number, updateDto: UpdateFuelTypeDto): Promise<FuelType> {
        await this.findOne(id);

        if (updateDto.name) {
            const existingType = await this.prisma.fuelType.findFirst({
                where: {
                    name: updateDto.name,
                    id: { not: id },
                },
            });

            if (existingType) {
                throw new ConflictException(`Fuel type with name '${updateDto.name}' already exists.`);
            }
        }

        return this.prisma.fuelType.update({
            where: { id },
            data: updateDto,
        });
    }

    async remove(id: number): Promise<FuelType> {
        await this.findOne(id);

        return this.prisma.fuelType.delete({
            where: { id },
        });
    }
}
