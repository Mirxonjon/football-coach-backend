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
      // Eng yangisi tepada — bir nechta karta bo'lganda tartib barqaror bo'lsin.
      orderBy: { createdAt: 'desc' },
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
    const last4 = dto.cardNumber.slice(-4);

    // Foydalanuvchi bir nechta karta saqlashi mumkin, lekin AYNAN shu kartani
    // ikki marta emas. Bir xillikni last4 + amal qilish muddati bo'yicha
    // aniqlaymiz — to'liq raqamni biz saqlamaymiz.
    const duplicate = await this.prisma.card.findFirst({
      where: {
        userId,
        last4,
        expireDate: dto.expireDate,
        isVerified: true,
      },
    });
    if (duplicate) {
      throw new ConflictException('This card is already saved');
    }

    const res = await this.click.requestCardToken(dto.cardNumber, dto.expireDate);

    // Tasdiqlanmagan urinish qolgan bo'lsa (SMS kelmadi, foydalanuvchi qaytadan
    // bosdi) — o'sha qatorni qayta ishlatamiz, aks holda yangisini yaratamiz.
    // Shunda yarim qolgan yozuvlar to'planib qolmaydi.
    const pending = await this.prisma.card.findFirst({
      where: { userId, last4, expireDate: dto.expireDate, isVerified: false },
      orderBy: { createdAt: 'desc' },
    });

    const card = pending
      ? await this.prisma.card.update({
          where: { id: pending.id },
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

    // Subscription.cardId — tashqi kalitsiz oddiy Int, shuning uchun o'zi
    // tozalanmaydi. Osilib qolgan havolani olib tashlaymiz va avtomatik
    // uzaytirishni o'chiramiz: karta yo'q bo'lsa u baribir ishlamaydi, lekin
    // foydalanuvchi holatni sozlamalarda aniq ko'rib tursin.
    await this.prisma.subscription.updateMany({
      where: { userId, cardId },
      data: { cardId: null, autoPay: false },
    });
  }
}

function maskPan(pan: string) {
  if (pan.length < 10) return pan;
  return `${pan.slice(0, 4)}********${pan.slice(-4)}`;
}
