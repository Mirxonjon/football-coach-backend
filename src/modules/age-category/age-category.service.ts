import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgeCategoryDto } from '@/types/training/create-age-category.dto';
import { UpdateAgeCategoryDto } from '@/types/training/update-age-category.dto';

@Injectable()
export class AgeCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.ageCategory.findMany({ orderBy: { minAge: 'asc' } });
  }

  async findOne(id: number) {
    const cat = await this.prisma.ageCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException(`AgeCategory ${id} not found`);
    return cat;
  }

  create(dto: CreateAgeCategoryDto) {
    return this.prisma.ageCategory.create({ data: dto });
  }

  async update(id: number, dto: UpdateAgeCategoryDto) {
    await this.findOne(id);
    return this.prisma.ageCategory.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.ageCategory.delete({ where: { id } });
  }
}
