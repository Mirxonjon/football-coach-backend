import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from '@/types/users/update-profile.dto';
import { AdminUpdateUserDto } from '@/types/users/admin-update-user.dto';
import { AdminFilterUsersDto } from '@/types/users/admin-filter-users.dto';
import { Prisma } from '@prisma/client';

const USER_SELECT: Prisma.UserSelect = {
  id: true,
  phone: true,
  firstName: true,
  lastName: true,
  birthDate: true,
  isVerified: true,
  isActive: true,
  roleId: true,
  role: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  getById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  getByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: number, dto: UpdateProfileDto) {
    await this.ensureExists(userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.birthDate !== undefined && { birthDate: new Date(dto.birthDate) }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: USER_SELECT,
    });
  }

  async adminFindAll(filter: AdminFilterUsersDto) {
    const page = Math.max(1, parseInt(filter.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filter.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive === 'true';
    }

    if (filter.search) {
      where.OR = [
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { phone: { contains: filter.search } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async adminFindOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async adminUpdate(id: number, dto: AdminUpdateUserDto) {
    await this.ensureExists(id);

    const data: Prisma.UserUpdateInput = {};
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.role) {
      const role = await this.prisma.role.findUnique({ where: { name: dto.role } });
      if (!role) throw new NotFoundException(`Role "${dto.role}" not found`);
      data.role = { connect: { id: role.id } };
    }

    return this.prisma.user.update({ where: { id }, data, select: USER_SELECT });
  }

  async adminSoftDelete(id: number) {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: USER_SELECT,
    });
  }

  private async ensureExists(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
  }
}
