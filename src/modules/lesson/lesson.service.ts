import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrainingCategoryService } from '../training-category/training-category.service';
import { CreateLessonDto } from '@/types/training/create-lesson.dto';
import { UpdateLessonDto } from '@/types/training/update-lesson.dto';
import { CreateLessonBlockDto } from '@/types/training/create-lesson-block.dto';
import { UpdateLessonBlockDto } from '@/types/training/update-lesson-block.dto';

@Injectable()
export class LessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingCategoryService: TrainingCategoryService,
  ) {}

  // ── Subscription gate (admins bypass) ──
  private async requireSubscription(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (user?.role?.name === 'ADMIN') return;

    const sub = await this.prisma.subscription.findFirst({
      where: { userId, isActive: true, endDate: { gte: new Date() } },
    });
    if (!sub) throw new ForbiddenException('Active subscription required');
  }

  // ── Lessons ──
  async findAll(userId: number, trainingCategoryId?: number) {
    await this.requireSubscription(userId);
    return this.prisma.trainingLesson.findMany({
      where: trainingCategoryId ? { trainingCategoryId } : undefined,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(userId: number, id: number) {
    await this.requireSubscription(userId);
    const lesson = await this.prisma.trainingLesson.findUnique({
      where: { id },
      include: { lessonBlocks: { orderBy: { sequenceOrder: 'asc' } } },
    });
    if (!lesson) throw new NotFoundException(`Lesson ${id} not found`);
    return lesson;
  }

  async create(dto: CreateLessonDto) {
    await this.trainingCategoryService.findOne(dto.trainingCategoryId);
    return this.prisma.trainingLesson.create({ data: dto });
  }

  async update(id: number, dto: UpdateLessonDto) {
    await this.findLessonOrFail(id);
    if (dto.trainingCategoryId) {
      await this.trainingCategoryService.findOne(dto.trainingCategoryId);
    }
    return this.prisma.trainingLesson.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findLessonOrFail(id);
    return this.prisma.trainingLesson.delete({ where: { id } });
  }

  private async findLessonOrFail(id: number) {
    const lesson = await this.prisma.trainingLesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException(`Lesson ${id} not found`);
    return lesson;
  }

  // ── Blocks ──
  async createBlock(lessonId: number, dto: CreateLessonBlockDto) {
    await this.findLessonOrFail(lessonId);
    return this.prisma.lessonBlock.create({ data: { ...dto, lessonId } });
  }

  async updateBlock(id: number, dto: UpdateLessonBlockDto) {
    await this.findBlockOrFail(id);
    return this.prisma.lessonBlock.update({ where: { id }, data: dto });
  }

  async removeBlock(id: number) {
    await this.findBlockOrFail(id);
    return this.prisma.lessonBlock.delete({ where: { id } });
  }

  private async findBlockOrFail(id: number) {
    const block = await this.prisma.lessonBlock.findUnique({ where: { id } });
    if (!block) throw new NotFoundException(`LessonBlock ${id} not found`);
    return block;
  }

  // ── User lesson progress ──
  async getMyProgress(userId: number, lessonId: number) {
    await this.requireSubscription(userId);
    await this.findLessonOrFail(lessonId);
    const progress = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    return (
      progress ?? {
        userId,
        lessonId,
        lastBlockSequence: 0,
        isCompleted: false,
      }
    );
  }

  async listMyProgress(userId: number) {
    await this.requireSubscription(userId);
    return this.prisma.lessonProgress.findMany({
      where: { userId },
      include: { lesson: { select: { id: true, titleUz: true, titleRu: true, trainingCategoryId: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateMyProgress(
    userId: number,
    lessonId: number,
    lastBlockSequence: number,
  ) {
    await this.requireSubscription(userId);
    const lesson = await this.prisma.trainingLesson.findUnique({
      where: { id: lessonId },
      include: { lessonBlocks: { orderBy: { sequenceOrder: 'desc' }, take: 1 } },
    });
    if (!lesson) throw new NotFoundException(`Lesson ${lessonId} not found`);

    const lastBlock = lesson.lessonBlocks[0];
    const isCompleted = !!lastBlock && lastBlockSequence >= lastBlock.sequenceOrder;

    return this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, lastBlockSequence, isCompleted },
      update: { lastBlockSequence, isCompleted },
    });
  }
}
