import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  getById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  getByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }
}
