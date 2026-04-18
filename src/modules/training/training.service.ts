import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgeCategoryDto } from '@/types/training/create-age-category.dto';
import { UpdateAgeCategoryDto } from '@/types/training/update-age-category.dto';
import { CreateTrainingCategoryDto } from '@/types/training/create-training-category.dto';
import { UpdateTrainingCategoryDto } from '@/types/training/update-training-category.dto';
import { CreateLessonDto } from '@/types/training/create-lesson.dto';
import { UpdateLessonDto } from '@/types/training/update-lesson.dto';
import { CreateLessonBlockDto } from '@/types/training/create-lesson-block.dto';
import { UpdateLessonBlockDto } from '@/types/training/update-lesson-block.dto';

@Injectable()
export class TrainingService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Subscription check ──

  async hasActiveSubscription(userId: number): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
        endDate: { gte: new Date() },
      },
    });
    return !!sub;
  }

  private async requireSubscription(userId: number) {
    const active = await this.hasActiveSubscription(userId);
    if (!active) {
      throw new ForbiddenException('Active subscription required');
    }
  }

  // ── Age Categories ──

  async findAllAgeCategories() {
    return this.prisma.ageCategory.findMany({
      orderBy: { minAge: 'asc' },
    });
  }

  async createAgeCategory(dto: CreateAgeCategoryDto) {
    return this.prisma.ageCategory.create({ data: dto });
  }

  async updateAgeCategory(id: number, dto: UpdateAgeCategoryDto) {
    await this.findAgeCategoryOrFail(id);
    return this.prisma.ageCategory.update({ where: { id }, data: dto });
  }

  async deleteAgeCategory(id: number) {
    await this.findAgeCategoryOrFail(id);
    return this.prisma.ageCategory.delete({ where: { id } });
  }

  private async findAgeCategoryOrFail(id: number) {
    const cat = await this.prisma.ageCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException(`AgeCategory ${id} not found`);
    return cat;
  }

  // ── Training Categories ──

  async findAllTrainingCategories(ageCategoryId?: number) {
    return this.prisma.trainingCategory.findMany({
      where: ageCategoryId ? { ageCategoriesId: ageCategoryId } : undefined,
      include: { ageCategory: true },
      orderBy: { id: 'asc' },
    });
  }

  async createTrainingCategory(dto: CreateTrainingCategoryDto) {
    await this.findAgeCategoryOrFail(dto.ageCategoriesId);
    return this.prisma.trainingCategory.create({ data: dto });
  }

  async updateTrainingCategory(id: number, dto: UpdateTrainingCategoryDto) {
    await this.findTrainingCategoryOrFail(id);
    if (dto.ageCategoriesId) {
      await this.findAgeCategoryOrFail(dto.ageCategoriesId);
    }
    return this.prisma.trainingCategory.update({ where: { id }, data: dto });
  }

  async deleteTrainingCategory(id: number) {
    await this.findTrainingCategoryOrFail(id);
    return this.prisma.trainingCategory.delete({ where: { id } });
  }

  private async findTrainingCategoryOrFail(id: number) {
    const cat = await this.prisma.trainingCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException(`TrainingCategory ${id} not found`);
    return cat;
  }

  // ── Lessons ──

  async findAllLessons(userId: number, trainingCategoryId?: number) {
    await this.requireSubscription(userId);
    return this.prisma.trainingLesson.findMany({
      where: trainingCategoryId ? { trainingCategoryId } : undefined,
      orderBy: { id: 'asc' },
    });
  }

  async findLessonById(userId: number, id: number) {
    await this.requireSubscription(userId);
    const lesson = await this.prisma.trainingLesson.findUnique({
      where: { id },
      include: {
        lessonBlocks: { orderBy: { sequenceOrder: 'asc' } },
      },
    });
    if (!lesson) throw new NotFoundException(`Lesson ${id} not found`);
    return lesson;
  }

  async createLesson(dto: CreateLessonDto) {
    await this.findTrainingCategoryOrFail(dto.trainingCategoryId);
    return this.prisma.trainingLesson.create({ data: dto });
  }

  async updateLesson(id: number, dto: UpdateLessonDto) {
    await this.findLessonOrFail(id);
    if (dto.trainingCategoryId) {
      await this.findTrainingCategoryOrFail(dto.trainingCategoryId);
    }
    return this.prisma.trainingLesson.update({ where: { id }, data: dto });
  }

  async deleteLesson(id: number) {
    await this.findLessonOrFail(id);
    return this.prisma.trainingLesson.delete({ where: { id } });
  }

  private async findLessonOrFail(id: number) {
    const lesson = await this.prisma.trainingLesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException(`Lesson ${id} not found`);
    return lesson;
  }

  // ── Lesson Blocks ──

  async createBlock(lessonId: number, dto: CreateLessonBlockDto) {
    await this.findLessonOrFail(lessonId);
    return this.prisma.lessonBlock.create({
      data: { ...dto, lessonId },
    });
  }

  async updateBlock(id: number, dto: UpdateLessonBlockDto) {
    await this.findBlockOrFail(id);
    return this.prisma.lessonBlock.update({ where: { id }, data: dto });
  }

  async deleteBlock(id: number) {
    await this.findBlockOrFail(id);
    return this.prisma.lessonBlock.delete({ where: { id } });
  }

  private async findBlockOrFail(id: number) {
    const block = await this.prisma.lessonBlock.findUnique({ where: { id } });
    if (!block) throw new NotFoundException(`LessonBlock ${id} not found`);
    return block;
  }
}
