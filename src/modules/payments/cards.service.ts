import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateCardDto } from '@/types/payments/create-card.dto';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number) {
    return this.prisma.card.findMany({
      where: { userId },
      select: { id: true, last4: true, isActive: true, createdAt: true },
    });
  }

  async create(userId: number, dto: CreateCardDto) {
    const card = await this.prisma.card.create({
      data: { userId, token: dto.token, last4: dto.last4 },
    });
    return { id: card.id, last4: card.last4, createdAt: card.createdAt };
  }

  async remove(userId: number, cardId: number) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Card not found');
    if (card.userId !== userId) throw new ForbiddenException();
    await this.prisma.card.delete({ where: { id: cardId } });
  }
}
