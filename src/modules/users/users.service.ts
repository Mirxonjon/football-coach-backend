import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '@/common/services/storage/storage.service';
import { UpdateProfileDto } from '@/types/users/update-profile.dto';
import { AdminUpdateUserDto } from '@/types/users/admin-update-user.dto';
import { AdminFilterUsersDto } from '@/types/users/admin-filter-users.dto';
import { Prisma } from '@prisma/client';

const USER_SELECT: Prisma.UserSelect = {
  id: true,
  phone: true,
  email: true,
  firstName: true,
  lastName: true,
  birthDate: true,
  avatarUrl: true,
  isVerified: true,
  isActive: true,
  language: true,
  roleId: true,
  role: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

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
        ...(dto.language !== undefined && { language: dto.language }),
      },
      select: USER_SELECT,
    });
  }

  /**
   * Upload a new avatar image to R2 under the `avatars/` prefix and replace
   * the user's avatarUrl. The old avatar is best-effort deleted afterwards
   * (only if it was hosted on our R2 — Google profile pictures are kept).
   */
  async uploadAvatar(userId: number, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const uploaded = await this.storage.uploadFileDetailed(file, 'avatars');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: uploaded.url },
      select: USER_SELECT,
    });

    // Best-effort cleanup of the previous avatar — never block the response.
    if (user.avatarUrl && user.avatarUrl !== uploaded.url && this.isOurUrl(user.avatarUrl)) {
      this.storage.deleteByUrl(user.avatarUrl).catch((e) =>
        this.logger.warn(
          `[avatar] could not delete previous avatar url=${user.avatarUrl} err=${e?.message}`,
        ),
      );
    }

    return updated;
  }

  /**
   * Remove the user's avatar entirely (sets avatarUrl=null and best-effort
   * deletes the object from R2 if it lives there).
   */
  async deleteAvatar(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.avatarUrl && this.isOurUrl(user.avatarUrl)) {
      this.storage.deleteByUrl(user.avatarUrl).catch((e) =>
        this.logger.warn(
          `[avatar] could not delete avatar on remove url=${user.avatarUrl} err=${e?.message}`,
        ),
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: USER_SELECT,
    });
  }

  /** Heuristic: only delete URLs that point to our R2 public host. */
  private isOurUrl(url: string): boolean {
    const r2PublicUrl = process.env.R2_PUBLIC_URL || '';
    if (r2PublicUrl && url.startsWith(r2PublicUrl)) return true;
    return /\br2\.cloudflarestorage\.com\b|\br2\.dev\b/.test(url);
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
