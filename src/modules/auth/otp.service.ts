import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '3'); // 2-5 minutes window
const OTP_RESEND_WINDOW_SECONDS = parseInt(
  process.env.OTP_RESEND_WINDOW_SECONDS || '60'
); // rate-limit per minute

@Injectable()
export class OtpService {
  constructor(private prisma: PrismaService) {}

  async assertRateLimit(phone: string) {
    const since = new Date(Date.now() - OTP_RESEND_WINDOW_SECONDS * 1000);
    const recent = await this.prisma.otpCode.findFirst({
      where: { phone, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });

    if (recent) {
      throw new HttpException(
        'Please wait before requesting another OTP',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  async generateAndStoreOtp(phone: string, userId?: number) {
    let code: string;

    // test number
    if (phone === '+998987654321') {
      code = '12345';
    } else {
      code = '' + Math.floor(10000 + Math.random() * 90000);
    }

    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { phone, userId, code, expiresAt },
    });
    return code;
  }

  async verifyOtp(phone: string, code: string) {
    const now = new Date();
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, isUsed: false, expiresAt: { gte: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) return false;

    // increment attempts and check
    const updated = await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { attemptsCount: { increment: 1 } },
    });
    if (updated.attemptsCount > 5) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { isUsed: true },
      });
      return false;
    }

    if (otp.code !== code) {
      return false;
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });
    await this.prisma.otpCode.updateMany({
      where: { phone, id: { not: otp.id } },
      data: { isUsed: true },
    });
    return true;
  }
}
