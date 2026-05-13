import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AgeCategoryService } from '../age-category/age-category.service';
import { CreateTrainingCategoryDto } from '@/types/training/create-training-category.dto';
import { UpdateTrainingCategoryDto } from '@/types/training/update-training-category.dto';
import {
  CategoryProgressStatus,
  FilterTrainingCategoryDto,
  TrainingCategorySortBy,
  TrainingCategorySortOrder,
} from '@/types/training/filter-training-category.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

@Injectable()
export class TrainingCategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ageCategoryService: AgeCategoryService,
  ) {}

  async findAll(filter: FilterTrainingCategoryDto = {}, userId?: number | null) {
    const where: Prisma.TrainingCategoryWhereInput = {};
    if (filter.ageCategoryId) where.ageCategoriesId = filter.ageCategoryId;
    if (filter.search) {
      const q = filter.search.trim();
      where.OR = [
        { titleUz: { contains: q, mode: 'insensitive' } },
        { titleRu: { contains: q, mode: 'insensitive' } },
        { descriptionUz: { contains: q, mode: 'insensitive' } },
        { descriptionRu: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (filter.hasLessons === true) {
      where.trainingLessons = { some: {} };
    }

    // progressStatus needs the user — silently skipped for anonymous calls.
    if (filter.progressStatus && userId) {
      const ids = await this.categoryIdsByProgress(userId, filter.progressStatus);
      where.id = { in: ids };
    }

    // sortBy + sortOrder
    const sortDir: 'asc' | 'desc' =
      filter.sortOrder === TrainingCategorySortOrder.asc ? 'asc' : 'desc';
    let orderBy: Prisma.TrainingCategoryOrderByWithRelationInput;
    if (filter.sortBy === TrainingCategorySortBy.createdAt) {
      orderBy = { createdAt: sortDir };
    } else if (filter.sortBy === TrainingCategorySortBy.lessonCount) {
      orderBy = { trainingLessons: { _count: sortDir } };
    } else {
      orderBy = { id: sortDir };
    }

    const include: Prisma.TrainingCategoryInclude = {
      ageCategory: true,
      ...(filter.includeCount && {
        _count: { select: { trainingLessons: true } },
      }),
    };

    const annotate = <T extends { _count?: { trainingLessons: number } }>(c: T) => {
      if (!filter.includeCount) return c;
      const { _count, ...rest } = c;
      return { ...rest, lessonCount: _count?.trainingLessons ?? 0 };
    };

    if (filter.all) {
      const data = await this.prisma.trainingCategory.findMany({
        where,
        include,
        orderBy,
      });
      return { data: data.map(annotate) };
    }

    const page = Math.max(1, filter.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, filter.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.trainingCategory.findMany({
        where,
        include,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.trainingCategory.count({ where }),
    ]);

    return {
      data: data.map(annotate),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Returns the set of TrainingCategory IDs that match the requested progress
   * bucket for the given user. Definitions:
   *   in_progress — category has ≥1 lesson the user has started but not completed
   *   completed   — every lesson in the category has progress with isCompleted=true
   *                 (categories with 0 lessons are excluded)
   *   not_started — none of the lessons in the category have any progress for this user
   */
  private async categoryIdsByProgress(
    userId: number,
    status: CategoryProgressStatus,
  ): Promise<number[]> {
    if (status === CategoryProgressStatus.in_progress) {
      const rows = await this.prisma.trainingCategory.findMany({
        where: {
          trainingLessons: {
            some: {
              lessonProgress: { some: { userId, isCompleted: false } },
            },
          },
        },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    }

    if (status === CategoryProgressStatus.not_started) {
      const rows = await this.prisma.trainingCategory.findMany({
        where: {
          trainingLessons: {
            none: {
              lessonProgress: { some: { userId } },
            },
          },
        },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    }

    // completed: every lesson has progress with isCompleted=true.
    // Equivalent: there is no lesson WITHOUT a completed progress entry.
    // We also require at least one lesson — empty categories don't count.
    const rows = await this.prisma.trainingCategory.findMany({
      where: {
        trainingLessons: {
          some: {},
          none: {
            lessonProgress: { none: { userId, isCompleted: true } },
          },
        },
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
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
