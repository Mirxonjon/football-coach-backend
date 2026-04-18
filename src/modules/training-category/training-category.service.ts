import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgeCategoryService } from '../age-category/age-category.service';
import { CreateTrainingCategoryDto } from '@/types/training/create-training-category.dto';
import { UpdateTrainingCategoryDto } from '@/types/training/update-training-category.dto';

@Injectable()
export class TrainingCategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ageCategoryService: AgeCategoryService,
  ) {}

  findAll(ageCategoryId?: number) {
    return this.prisma.trainingCategory.findMany({
      where: ageCategoryId ? { ageCategoriesId: ageCategoryId } : undefined,
      include: { ageCategory: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const cat = await this.prisma.trainingCategory.findUnique({
      where: { id },
      include: { ageCategory: true },
    });
    if (!cat) throw new NotFoundException(`TrainingCategory ${id} not found`);
    return cat;
  }

  async create(dto: CreateTrainingCategoryDto) {
    await this.ageCategoryService.findOne(dto.ageCategoriesId);
    return this.prisma.trainingCategory.create({ data: dto });
  }

  async update(id: number, dto: UpdateTrainingCategoryDto) {
    await this.findOne(id);
    if (dto.ageCategoriesId) {
      await this.ageCategoryService.findOne(dto.ageCategoriesId);
    }
    return this.prisma.trainingCategory.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.trainingCategory.delete({ where: { id } });
  }
}
