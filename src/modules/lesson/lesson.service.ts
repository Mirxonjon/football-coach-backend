import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TrainingCategoryService } from '../training-category/training-category.service';
import { StorageService } from '@/common/services/storage/storage.service';
import { CreateLessonDto } from '@/types/training/create-lesson.dto';
import { UpdateLessonDto } from '@/types/training/update-lesson.dto';
import { CreateLessonBlockDto } from '@/types/training/create-lesson-block.dto';
import { UpdateLessonBlockDto } from '@/types/training/update-lesson-block.dto';
import {
  FilterLessonDto,
  LessonProgressStatus,
  LessonSortBy,
  SortOrder,
} from '@/types/training/filter-lesson.dto';

// How long signed media URLs stay valid. Long enough for a user to finish a
// long block, short enough that a leaked link expires before it spreads.
const MEDIA_URL_TTL_SEC = 60 * 60 * 2; // 2 hours

// Block types whose contentUz/Ru holds a media URL we should sign.
const MEDIA_BLOCK_TYPES = new Set(['VIDEO', 'IMAGE', 'FILE']);

@Injectable()
export class LessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingCategoryService: TrainingCategoryService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Replace a public R2 URL with a short-lived signed URL. Non-R2 URLs (e.g.
   * external CDNs, example.com placeholders) are returned as-is.
   */
  private async signIfOurR2(url: string | null | undefined): Promise<string | null | undefined> {
    if (!url) return url;
    const key = this.storage.urlToKey(url);
    if (!key) return url; // not a URL we manage — leave it alone
    try {
      return await this.storage.getSignedDownloadUrl(key, MEDIA_URL_TTL_SEC);
    } catch {
      return url; // fall back to public url on signing error
    }
  }

  // ── Access helpers ────────────────────────────────────────────────────
  /**
   * Returns whether the user may view paid content — true if ADMIN or has an
   * active subscription. Used as a soft check so the catalogue remains
   * browsable to free users while paid blocks stay locked.
   */
  private async hasPaidAccess(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (user?.role?.name === 'ADMIN') return true;

    const sub = await this.prisma.subscription.findFirst({
      where: { userId, isActive: true, endDate: { gte: new Date() } },
    });
    return !!sub;
  }

  /** Hard gate — only for actions that MUST require paid access (progress tracking). */
  private async requireSubscription(userId: number) {
    if (!(await this.hasPaidAccess(userId))) {
      throw new ForbiddenException('Active subscription required');
    }
  }

  // ── Lessons ──────────────────────────────────────────────────────────
  /**
   * Public catalogue. Free users see every lesson with an `isLocked` flag so the
   * UI can render a paywall badge on rows that require a subscription.
   *
   * Supports pagination ({page, limit}), `all=true` to skip pagination, plus
   * `isFree` and `unlocked` filters. `unlocked=true` is user-aware: it limits
   * results to lessons the current user can actually view (everything for
   * paid/admin users, only free lessons for free users).
   */
  async findAll(userId: number, filter: FilterLessonDto = {}) {
    const paid = await this.hasPaidAccess(userId);

    const where: Prisma.TrainingLessonWhereInput = {};
    if (filter.trainingCategoryId) where.trainingCategoryId = filter.trainingCategoryId;
    if (filter.ageCategoryId) {
      where.trainingCategory = { is: { ageCategoriesId: filter.ageCategoryId } };
    }
    if (filter.search) {
      const q = filter.search.trim();
      where.OR = [
        { titleUz: { contains: q, mode: 'insensitive' } },
        { titleRu: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filter.isFree === true) where.isFree = true;
    else if (filter.isFree === false) where.isFree = false;

    // unlocked=true: paid users see everything; free users see only free.
    if (filter.unlocked === true && !paid) {
      where.isFree = true;
    }

    // hasVideo=true → at least one VIDEO block exists in the lesson
    if (filter.hasVideo === true) {
      where.lessonBlocks = { some: { blockType: 'VIDEO' } };
    }

    // progressStatus filter — uses LessonProgress for THIS user
    if (filter.progressStatus === LessonProgressStatus.completed) {
      where.lessonProgress = { some: { userId, isCompleted: true } };
    } else if (filter.progressStatus === LessonProgressStatus.in_progress) {
      where.lessonProgress = { some: { userId, isCompleted: false } };
    } else if (filter.progressStatus === LessonProgressStatus.not_started) {
      where.lessonProgress = { none: { userId } };
    }

    // sortBy + sortOrder — newest first by default
    const sortField =
      filter.sortBy === LessonSortBy.createdAt ? 'createdAt' : 'id';
    const sortDir = filter.sortOrder === SortOrder.asc ? 'asc' : 'desc';
    const orderBy: Prisma.TrainingLessonOrderByWithRelationInput = {
      [sortField]: sortDir,
    };

    const include = {
      trainingCategory: {
        select: {
          id: true,
          titleUz: true,
          titleRu: true,
          ageCategoriesId: true,
          ageCategory: {
            select: {
              id: true,
              titleUz: true,
              titleRu: true,
              minAge: true,
              maxAge: true,
            },
          },
        },
      },
    } satisfies Prisma.TrainingLessonInclude;

    const annotate = <T extends { isFree: boolean }>(l: T) => ({
      ...l,
      isLocked: !paid && !l.isFree,
    });

    if (filter.all) {
      const lessons = await this.prisma.trainingLesson.findMany({
        where,
        include,
        orderBy,
      });
      return { data: lessons.map(annotate) };
    }

    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 12));
    const skip = (page - 1) * limit;

    const [lessons, total] = await this.prisma.$transaction([
      this.prisma.trainingLesson.findMany({
        where,
        include,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.trainingLesson.count({ where }),
    ]);

    return {
      data: lessons.map(annotate),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Single-lesson view.
   * - Free lesson or paid user → full blocks.
   * - Unsubscribed user + paid lesson → blocks listed but non-free blocks have
   *   content stripped out and marked `isLocked: true` so the frontend can show
   *   "subscribe to unlock" without leaking the paid content.
   */
  async findOne(userId: number, id: number) {
    const lesson = await this.prisma.trainingLesson.findUnique({
      where: { id },
      include: {
        lessonBlocks: { orderBy: { sequenceOrder: 'asc' } },
        trainingCategory: {
          select: {
            id: true,
            titleUz: true,
            titleRu: true,
            ageCategoriesId: true,
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException(`Lesson ${id} not found`);

    const paid = await this.hasPaidAccess(userId);
    const unlocked = paid || lesson.isFree;

    // Map blocks. For viewable media blocks (VIDEO/IMAGE/FILE) hosted on our
    // R2 we replace the public URL with a short-lived signed URL so it can't
    // be casually shared once the user closes the page.
    const blocks = await Promise.all(
      lesson.lessonBlocks.map(async (b) => {
        const viewable = unlocked || b.isFree;
        if (!viewable) {
          return {
            id: b.id,
            lessonId: b.lessonId,
            blockType: b.blockType,
            sequenceOrder: b.sequenceOrder,
            duration: b.duration,
            isFree: b.isFree,
            isLocked: true,
            contentUz: null,
            contentRu: null,
            createdAt: b.createdAt,
            updatedAt: b.updatedAt,
          };
        }

        if (MEDIA_BLOCK_TYPES.has(b.blockType)) {
          const [contentUz, contentRu] = await Promise.all([
            this.signIfOurR2(b.contentUz),
            this.signIfOurR2(b.contentRu),
          ]);
          return { ...b, contentUz, contentRu, isLocked: false };
        }

        return { ...b, isLocked: false };
      }),
    );

    return {
      ...lesson,
      isLocked: !unlocked,
      lessonBlocks: blocks,
    };
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

  // ── User lesson progress (paid-only) ──
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
