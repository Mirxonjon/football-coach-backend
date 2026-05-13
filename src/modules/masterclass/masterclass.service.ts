import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { MasterclassCategoryService } from '@/modules/masterclass-category/masterclass-category.service';
import { CreateMasterclassDto } from '@/types/masterclass/create-masterclass.dto';
import { UpdateMasterclassDto } from '@/types/masterclass/update-masterclass.dto';
import {
  FilterMasterclassDto,
  MasterclassSortBy,
  MasterclassSortOrder,
} from '@/types/masterclass/filter-masterclass.dto';
import { CreateMasterclassBlockDto } from '@/types/masterclass/create-masterclass-block.dto';
import { UpdateMasterclassBlockDto } from '@/types/masterclass/update-masterclass-block.dto';

@Injectable()
export class MasterclassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: MasterclassCategoryService,
  ) {}

  // ── Masterclasses ──

  async findAll(filter: FilterMasterclassDto = {}) {
    const where: Prisma.MasterclassWhereInput = {};
    if (filter.masterclassCategoryId) {
      where.masterclassCategoryId = filter.masterclassCategoryId;
    }
    if (filter.search) {
      const q = filter.search.trim();
      where.OR = [
        { titleUz: { contains: q, mode: 'insensitive' } },
        { titleRu: { contains: q, mode: 'insensitive' } },
      ];
    }

    const sortDir: 'asc' | 'desc' =
      filter.sortOrder === MasterclassSortOrder.asc ? 'asc' : 'desc';
    const orderBy: Prisma.MasterclassOrderByWithRelationInput =
      filter.sortBy === MasterclassSortBy.createdAt
        ? { createdAt: sortDir }
        : { id: sortDir };

    if (filter.all) {
      const data = await this.prisma.masterclass.findMany({
        where,
        include: { masterclassCategory: true },
        orderBy,
      });
      return { data };
    }

    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 12));
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.masterclass.findMany({
        where,
        include: { masterclassCategory: true },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.masterclass.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: number) {
    const mc = await this.prisma.masterclass.findUnique({
      where: { id },
      include: {
        masterclassCategory: true,
        blocks: { orderBy: { sequenceOrder: 'asc' } },
      },
    });
    if (!mc) throw new NotFoundException(`Masterclass ${id} not found`);
    return mc;
  }

  async create(dto: CreateMasterclassDto) {
    await this.categoryService.findOneOrFail(dto.masterclassCategoryId);
    return this.prisma.masterclass.create({
      data: dto,
      include: { masterclassCategory: true },
    });
  }

  async update(id: number, dto: UpdateMasterclassDto) {
    await this.findOneOrFail(id);
    if (dto.masterclassCategoryId) {
      await this.categoryService.findOneOrFail(dto.masterclassCategoryId);
    }
    return this.prisma.masterclass.update({
      where: { id },
      data: dto,
      include: { masterclassCategory: true },
    });
  }

  async remove(id: number) {
    await this.findOneOrFail(id);
    return this.prisma.masterclass.delete({ where: { id } });
  }

  private async findOneOrFail(id: number) {
    const mc = await this.prisma.masterclass.findUnique({ where: { id } });
    if (!mc) throw new NotFoundException(`Masterclass ${id} not found`);
    return mc;
  }

  // ── Blocks ──

  async createBlock(masterclassId: number, dto: CreateMasterclassBlockDto) {
    await this.findOneOrFail(masterclassId);
    return this.prisma.masterclassBlock.create({
      data: { ...dto, masterclassId },
    });
  }

  async updateBlock(id: number, dto: UpdateMasterclassBlockDto) {
    await this.findBlockOrFail(id);
    return this.prisma.masterclassBlock.update({
      where: { id },
      data: dto,
    });
  }

  async removeBlock(id: number) {
    await this.findBlockOrFail(id);
    return this.prisma.masterclassBlock.delete({ where: { id } });
  }

  private async findBlockOrFail(id: number) {
    const block = await this.prisma.masterclassBlock.findUnique({
      where: { id },
    });
    if (!block) throw new NotFoundException(`MasterclassBlock ${id} not found`);
    return block;
  }
}
