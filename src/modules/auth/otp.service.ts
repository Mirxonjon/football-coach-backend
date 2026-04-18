import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '5');
const OTP_MAX_PER_HOUR = 5;

@Injectable()
export class OtpService {
  constructor(private prisma: PrismaService) {}

  async assertRateLimit(phone: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.prisma.otpCode.count({
      where: { phone, createdAt: { gte: oneHourAgo } },
    });
    if (count >= OTP_MAX_PER_HOUR) {
      throw new HttpException(
        'Too many OTP requests. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async generateAndStoreOtp(phone: string, userId?: number): Promise<string> {
    const code = '' + Math.floor(10000 + Math.random() * 90000);
    const hashed = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { phone, userId, code: hashed, expiresAt },
    });
    return code;
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const now = new Date();
    const otps = await this.prisma.otpCode.findMany({
      where: { phone, isUsed: false, expiresAt: { gte: now } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    for (const otp of otps) {
      const match = await bcrypt.compare(code, otp.code);
      if (match) {
        await this.prisma.otpCode.update({
          where: { id: otp.id },
          data: { isUsed: true },
        });
        await this.prisma.otpCode.updateMany({
          where: { phone, id: { not: otp.id }, isUsed: false },
          data: { isUsed: true },
        });
        return true;
      }
    }
    return false;
  }
}
