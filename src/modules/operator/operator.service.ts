import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateOperatorDto } from '@/types/operator/create-operator.dto';
import { UpdateOperatorDto } from '@/types/operator/update-operator.dto';
import { FilterOperatorDto } from '@/types/operator/filter-operator.dto';

@Injectable()
export class OperatorService {
  constructor(private prisma: PrismaService) {}

  private toResponse(operator: any) {
    return {
      id: operator.id,
      title: operator.title,
      color: operator.color,
      contact: operator.contact,
      bankName: operator.bankName,
      bankAccount: operator.bankAccount,
      bankMfo: operator.bankMfo,
      createdAt: operator.createdAt,
    };
  }

  async create(dto: CreateOperatorDto) {
    const created = await this.prisma.operator.create({ data: dto });
    return this.toResponse(created);
  }

  async findAll(query: FilterOperatorDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      title,
    } = query;

    const sortable = new Set(['createdAt', 'title', 'id']);
    const orderField = sortable.has(sortBy) ? sortBy : 'createdAt';
    const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const where: any = {};
    if (title) {
      where.title = { contains: title, mode: 'insensitive' };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.operator.findMany({
        where,
        orderBy: { [orderField]: orderDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.operator.count({ where }),
    ]);

    return {
      items: items.map((o) => this.toResponse(o)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number) {
    const item = await this.prisma.operator.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Operator not found');
    return this.toResponse(item);
  }

  async update(id: number, dto: UpdateOperatorDto) {
    await this.ensureExists(id);
    const updated = await this.prisma.operator.update({
      where: { id },
      data: dto,
    });
    return this.toResponse(updated);
  }

  async remove(id: number) {
    await this.ensureExists(id);
    await this.prisma.operator.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: number) {
    const operator = await this.prisma.operator.findUnique({
      where: { id },
    });

    if (!operator) {
      throw new NotFoundException(`Operator with id ${id} not found`);
    }

    return operator;
  }
}
