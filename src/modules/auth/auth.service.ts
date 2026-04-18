import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { PhoneRequestOtpDto } from '@/types/auth/phone-request-otp.dto';
import { PhoneVerifyOtpDto } from '@/types/auth/phone-verify-otp.dto';
import { EmailRegisterDto } from '@/types/auth/email-register.dto';
import { EmailLoginDto } from '@/types/auth/email-login.dto';
import { GoogleAuthDto } from '@/types/auth/google-auth.dto';
import { RefreshDto } from '@/types/auth/refresh.dto';
import { ForgotPasswordEmailDto } from '@/types/auth/forgot-password-email.dto';
import { ResetPasswordTokenDto } from '@/types/auth/reset-password-token.dto';
import { AuthTokens, DeviceInfo } from '@/types/auth/tokens.type';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';
import { OAuth2Client } from 'google-auth-library';

const ACCESS_EXPIRES_SECONDS = (() => {
  const v = process.env.ACCESS_TOKEN_TTL || '15m';
  if (v.endsWith('m')) return parseInt(v) * 60;
  if (v.endsWith('h')) return parseInt(v) * 3600;
  if (v.endsWith('s')) return parseInt(v);
  const n = parseInt(v);
  return isNaN(n) ? 15 * 60 : n;
})();
const REFRESH_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30');

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private otpService: OtpService,
    private smsService: SmsService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  // ─── Phone OTP ───────────────────────────────────────────────

  async phoneRequestOtp(dto: PhoneRequestOtpDto) {
    await this.otpService.assertRateLimit(dto.phone);

    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    const code = await this.otpService.generateAndStoreOtp(dto.phone, user?.id);

    try {
      await this.smsService.sendOtp(dto.phone, code);
    } catch {
      // swallow provider errors
    }

    return { ttlSec: parseInt(process.env.OTP_TTL_MINUTES || '5') * 60 };
  }

  async phoneVerifyOtp(dto: PhoneVerifyOtpDto, device: DeviceInfo) {
    const ok = await this.otpService.verifyOtp(dto.phone, dto.code);
    if (!ok) throw new UnauthorizedException('Invalid or expired OTP');

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      const role = await this.ensureRole('USER');
      user = await this.prisma.user.create({
        data: { phone: dto.phone, roleId: role.id, isVerified: true },
      });
    } else if (!user.isVerified) {
      await this.prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
    }

    const tokens = await this.issueTokensAndPersistSession(user.id, device);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ─── Email ───────────────────────────────────────────────────

  async emailRegister(dto: EmailRegisterDto, device: DeviceInfo) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const role = await this.ensureRole('USER');
    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        phone: `unset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        email: dto.email,
        password: hash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isVerified: true,
        roleId: role.id,
      },
    });

    const tokens = await this.issueTokensAndPersistSession(user.id, device);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async emailLogin(dto: EmailLoginDto, device: DeviceInfo) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account deactivated');

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.issueTokensAndPersistSession(user.id, device);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ─── Google ──────────────────────────────────────────────────

  async googleAuth(dto: GoogleAuthDto, device: DeviceInfo) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: dto.idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub) throw new UnauthorizedException('Invalid Google token');

    let user = await this.prisma.user.findUnique({ where: { googleId: payload.sub } });
    if (!user && payload.email) {
      user = await this.prisma.user.findUnique({ where: { email: payload.email } });
      if (user) {
        await this.prisma.user.update({ where: { id: user.id }, data: { googleId: payload.sub } });
      }
    }

    if (!user) {
      const role = await this.ensureRole('USER');
      user = await this.prisma.user.create({
        data: {
          phone: `google_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          email: payload.email,
          googleId: payload.sub,
          firstName: payload.given_name,
          lastName: payload.family_name,
          avatarUrl: payload.picture,
          isVerified: true,
          roleId: role.id,
        },
      });
    }

    if (!user.isActive) throw new UnauthorizedException('Account deactivated');

    const tokens = await this.issueTokensAndPersistSession(user.id, device);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ─── Refresh / Logout ────────────────────────────────────────

  async refresh(refreshToken: string, device: DeviceInfo): Promise<AuthTokens> {
    let payload: any;
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'secret-key',
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const sessions = await this.prisma.session.findMany({
      where: { userId: payload.sub },
      orderBy: { createdAt: 'desc' },
    });

    let matched: { id: number } | null = null;
    for (const s of sessions) {
      if (await bcrypt.compare(refreshToken, s.refreshToken)) {
        matched = { id: s.id };
        break;
      }
    }

    if (!matched) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.session.delete({ where: { id: matched.id } });
    return this.issueTokensAndPersistSession(payload.sub, device);
  }

  async logout(userId: number) {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  // ─── Password forgot / reset ─────────────────────────────────

  async forgotPassword(dto: ForgotPasswordEmailDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return; // don't reveal existence

    const tokenPlain = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(tokenPlain, 12);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token: tokenHash, expiresAt },
    });

    // TODO: send email with tokenPlain — for now just log in dev
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[DEV] Password reset token for ${dto.email}: ${tokenPlain}`);
    }
  }

  async resetPassword(dto: ResetPasswordTokenDto) {
    const now = new Date();
    const candidates = await this.prisma.passwordResetToken.findMany({
      where: { expiresAt: { gte: now } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    let matched: { id: number; userId: number } | null = null;
    for (const c of candidates) {
      if (await bcrypt.compare(dto.token, c.token)) {
        matched = { id: c.id, userId: c.userId };
        break;
      }
    }
    if (!matched) throw new BadRequestException('Invalid or expired reset token');

    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: matched.userId }, data: { password: hash } }),
      this.prisma.passwordResetToken.delete({ where: { id: matched.id } }),
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: matched.userId, expiresAt: { lt: now } },
      }),
    ]);
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private async issueTokensAndPersistSession(
    userId: number,
    device: DeviceInfo,
  ): Promise<AuthTokens> {
    const secret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'secret-key';
    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      { expiresIn: ACCESS_EXPIRES_SECONDS, secret },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, type: 'refresh' },
      { expiresIn: `${REFRESH_EXPIRES_DAYS}d`, secret },
    );

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);

    await this.prisma.session.create({
      data: {
        userId,
        refreshToken: hashedRefresh,
        ipAddress: device.ip,
        userAgent: device.userAgent,
        expiresAt,
      },
    });

    return { accessToken, refreshToken, expiresIn: ACCESS_EXPIRES_SECONDS };
  }

  private async ensureRole(name: 'USER' | 'ADMIN') {
    let role = await this.prisma.role.findUnique({ where: { name } as any });
    if (!role) role = await this.prisma.role.create({ data: { name } });
    return role;
  }

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      phone: user.phone?.startsWith('unset_') || user.phone?.startsWith('google_') ? null : user.phone,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
    };
  }
}
