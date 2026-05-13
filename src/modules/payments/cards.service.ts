import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { ClickProvider } from './providers/click.provider';
import { InitCardDto, VerifyCardDto } from '@/types/payments/init-card.dto';

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly click: ClickProvider,
  ) {}

  async list(userId: number) {
    return this.prisma.card.findMany({
      where: { userId },
      select: {
        id: true,
        last4: true,
        cardNumber: true,
        expireDate: true,
        phoneNumber: true,
        provider: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });
  }

  /**
   * Step 1: Click issues a temporary card_token and sends an SMS OTP to the
   * cardholder. We persist the temp token SERVER-SIDE in a pending Card row
   * and return ONLY our internal `cardId` to the client. The provider token
   * never leaves the backend.
   */
  async initAdd(userId: number, dto: InitCardDto) {
    const existing = await this.prisma.card.findUnique({ where: { userId } });
    if (existing?.isVerified) {
      throw new ConflictException(
        'Card already saved — remove it before adding a new one',
      );
    }

    const res = await this.click.requestCardToken(dto.cardNumber, dto.expireDate);
    const last4 = dto.cardNumber.slice(-4);

    // Reuse the same row if the user is retrying an unverified init (keeps the
    // one-card-per-user invariant intact), otherwise create a new pending row.
    const card = existing
      ? await this.prisma.card.update({
          where: { userId },
          data: {
            provider: 'click',
            token: res.card_token,
            cardNumber: null,
            last4,
            expireDate: dto.expireDate,
            phoneNumber: res.phone_number ?? null,
            isActive: true,
            isVerified: false,
          },
        })
      : await this.prisma.card.create({
          data: {
            id: Date.now(),
            userId,
            provider: 'click',
            token: res.card_token,
            last4,
            expireDate: dto.expireDate,
            phoneNumber: res.phone_number ?? null,
            isVerified: false,
          },
        });

    return {
      cardId: card.id,
      phoneNumber: card.phoneNumber,
      cardNumberMasked: maskPan(dto.cardNumber),
      expiresInSeconds: 120, // typical Click OTP validity window — UI can show a countdown
    };
  }

  /**
   * Step 2: client posts `{ cardId, smsCode }`. We look up the pending card,
   * check ownership, then ask Click to verify using the token we stored on
   * init. On success we swap in Click's permanent token and mark verified.
   */
  async verifyAdd(userId: number, dto: VerifyCardDto) {
    const card = await this.prisma.card.findUnique({ where: { id: dto.cardId } });
    if (!card) throw new NotFoundException('Card not found');
    if (card.userId !== userId) throw new ForbiddenException();
    if (card.isVerified) {
      throw new ConflictException('Card is already verified');
    }

    const res = await this.click.verifyCardToken(card.token, dto.smsCode);
    const last4 = (res.card_number || card.last4).slice(-4);

    const updated = await this.prisma.card.update({
      where: { id: card.id },
      data: {
        token: res.card_token,
        cardNumber: res.card_number ?? card.cardNumber,
        last4,
        phoneNumber: res.phone_number ?? card.phoneNumber,
        isActive: true,
        isVerified: true,
      },
    });

    return {
      id: updated.id,
      last4: updated.last4,
      cardNumber: updated.cardNumber,
      phoneNumber: updated.phoneNumber,
      isVerified: updated.isVerified,
      createdAt: updated.createdAt,
    };
  }

  async remove(userId: number, cardId: number) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Card not found');
    if (card.userId !== userId) throw new ForbiddenException();

    // Best-effort revoke with provider; don't block removal if the token is already gone.
    try {
      await this.click.deleteCardToken(card.token);
    } catch {}

    await this.prisma.card.delete({ where: { id: cardId } });
  }
}

function maskPan(pan: string) {
  if (pan.length < 10) return pan;
  return `${pan.slice(0, 4)}********${pan.slice(-4)}`;
}
