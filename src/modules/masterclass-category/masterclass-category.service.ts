import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateMasterclassCategoryDto } from '@/types/masterclass/create-masterclass-category.dto';
import { UpdateMasterclassCategoryDto } from '@/types/masterclass/update-masterclass-category.dto';
import {
  FilterMasterclassCategoryDto,
  MasterclassCategorySortBy,
  MasterclassCategorySortOrder,
} from '@/types/masterclass/filter-masterclass-category.dto';

@Injectable()
export class MasterclassCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: FilterMasterclassCategoryDto = {}) {
    const where: Prisma.MasterclassCategoryWhereInput = {};
    if (filter.search) {
      const q = filter.search.trim();
      where.OR = [
        { titleUz: { contains: q, mode: 'insensitive' } },
        { titleRu: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (filter.hasMasterclasses === true) {
      where.masterclasses = { some: {} };
    }

    const sortDir: 'asc' | 'desc' =
      filter.sortOrder === MasterclassCategorySortOrder.asc ? 'asc' : 'desc';
    let orderBy: Prisma.MasterclassCategoryOrderByWithRelationInput;
    if (filter.sortBy === MasterclassCategorySortBy.createdAt) {
      orderBy = { createdAt: sortDir };
    } else if (filter.sortBy === MasterclassCategorySortBy.masterclassCount) {
      orderBy = { masterclasses: { _count: sortDir } };
    } else {
      orderBy = { id: sortDir };
    }

    const include: Prisma.MasterclassCategoryInclude = filter.includeCount
      ? { _count: { select: { masterclasses: true } } }
      : {};

    const annotate = <T extends { _count?: { masterclasses: number } }>(c: T) => {
      if (!filter.includeCount) return c;
      const { _count, ...rest } = c;
      return { ...rest, masterclassCount: _count?.masterclasses ?? 0 };
    };

    if (filter.all) {
      const data = await this.prisma.masterclassCategory.findMany({
        where,
        include,
        orderBy,
      });
      return { data: data.map(annotate) };
    }

    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 12));
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.masterclassCategory.findMany({
        where,
        include,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.masterclassCategory.count({ where }),
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

  async findOne(id: number) {
    const cat = await this.prisma.masterclassCategory.findUnique({
      where: { id },
      include: { masterclasses: true },
    });
    if (!cat) throw new NotFoundException(`MasterclassCategory ${id} not found`);
    return cat;
  }

  create(dto: CreateMasterclassCategoryDto) {
    return this.prisma.masterclassCategory.create({ data: dto });
  }

  async update(id: number, dto: UpdateMasterclassCategoryDto) {
    await this.findOneOrFail(id);
    return this.prisma.masterclassCategory.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOneOrFail(id);
    return this.prisma.masterclassCategory.delete({ where: { id } });
  }

  async findOneOrFail(id: number) {
    const cat = await this.prisma.masterclassCategory.findUnique({
      where: { id },
    });
    if (!cat) throw new NotFoundException(`MasterclassCategory ${id} not found`);
    return cat;
  }
}
