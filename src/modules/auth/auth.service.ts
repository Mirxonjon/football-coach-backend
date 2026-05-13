import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
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
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  // Web (regular user) and Admin panel use SEPARATE Google OAuth client IDs.
  // Each id_token's `aud` claim must match the client id that issued it, so we
  // verify against the matching audience per flow.
  private readonly googleWebClientId =
    process.env.GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
  private readonly googleAdminClientId =
    process.env.GOOGLE_ADMIN_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private otpService: OtpService,
    private smsService: SmsService,
  ) {
    // The OAuth2Client object itself does not enforce aud — we pass `audience`
    // to verifyIdToken explicitly per call. Constructor arg is only used when
    // exchanging codes (not our flow), so any of the configured ids is fine.
    this.googleClient = new OAuth2Client(
      this.googleWebClientId || this.googleAdminClientId,
    );
    if (!this.googleWebClientId) {
      this.logger.warn(
        'GOOGLE_WEB_CLIENT_ID is not set — /auth/google will reject every token',
      );
    }
    if (!this.googleAdminClientId) {
      this.logger.warn(
        'GOOGLE_ADMIN_CLIENT_ID is not set — /admin/google will reject every token',
      );
    }
  }

  private fmtDevice(d: DeviceInfo) {
    return `${d?.ip ?? '?'} | ${d?.userAgent ?? '?'}`;
  }

  // ─── Phone OTP ───────────────────────────────────────────────

  async phoneRequestOtp(dto: PhoneRequestOtpDto) {
    await this.otpService.assertRateLimit(dto.phone);

    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    const code = await this.otpService.generateAndStoreOtp(dto.phone, user?.id);

    this.logger.log(
      `[PHONE-OTP] request phone=${dto.phone} userId=${user?.id ?? 'new'}`,
    );

    try {
      await this.smsService.sendOtp(dto.phone, code);
    } catch (e: any) {
      this.logger.warn(
        `[PHONE-OTP] sms send failed phone=${dto.phone} err=${e?.message}`,
      );
    }

    return { ttlSec: parseInt(process.env.OTP_TTL_MINUTES || '5') * 60 };
  }

  async phoneVerifyOtp(dto: PhoneVerifyOtpDto, device: DeviceInfo) {
    const ok = await this.otpService.verifyOtp(dto.phone, dto.code);
    if (!ok) {
      this.logger.warn(
        `[PHONE-OTP] ✗ invalid code phone=${dto.phone} device=${this.fmtDevice(device)}`,
      );
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    const isNew = !user;
    if (!user) {
      const role = await this.ensureRole('USER');
      user = await this.prisma.user.create({
        data: { phone: dto.phone, roleId: role.id, isVerified: true },
      });
    } else if (!user.isVerified) {
      await this.prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
    }

    const tokens = await this.issueTokensAndPersistSession(user.id, device);
    this.logger.log(
      `[PHONE-OTP] ✓ login userId=${user.id} phone=${user.phone} ${isNew ? '(new user)' : ''} device=${this.fmtDevice(device)}`,
    );
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ─── Email ───────────────────────────────────────────────────

  async emailRegister(dto: EmailRegisterDto, device: DeviceInfo) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      this.logger.warn(`[EMAIL-REG] ✗ already exists email=${dto.email}`);
      throw new ConflictException('Email already registered');
    }

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
    this.logger.log(
      `[EMAIL-REG] ✓ new user userId=${user.id} email=${user.email} device=${this.fmtDevice(device)}`,
    );
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async emailLogin(dto: EmailLoginDto, device: DeviceInfo) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password) {
      this.logger.warn(
        `[EMAIL-LOGIN] ✗ not found / no password email=${dto.email} device=${this.fmtDevice(device)}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      this.logger.warn(
        `[EMAIL-LOGIN] ✗ deactivated userId=${user.id} email=${user.email}`,
      );
      throw new UnauthorizedException('Account deactivated');
    }

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) {
      this.logger.warn(
        `[EMAIL-LOGIN] ✗ wrong password userId=${user.id} email=${user.email} device=${this.fmtDevice(device)}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokensAndPersistSession(user.id, device);
    this.logger.log(
      `[EMAIL-LOGIN] ✓ userId=${user.id} email=${user.email} device=${this.fmtDevice(device)}`,
    );
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ─── Google ──────────────────────────────────────────────────

  async googleAuth(dto: GoogleAuthDto, device: DeviceInfo) {
    this.logger.log(
      `[GOOGLE] attempt idToken.len=${dto.idToken?.length ?? 0} device=${this.fmtDevice(device)}`,
    );

    let payload;
    try {
      // Decode header (without verifying) to log token's aud — helps when the
      // frontend uses the wrong client_id and we need to spot the mismatch.
      const tokenAud = peekIdTokenAud(dto.idToken);
      this.logger.log(
        `[GOOGLE] expected aud=${this.googleWebClientId || '<empty>'} | token aud=${tokenAud ?? '<unparseable>'}`,
      );

      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: this.googleWebClientId,
      });
      payload = ticket.getPayload();
    } catch (e: any) {
      this.logger.warn(
        `[GOOGLE] ✗ token verify failed err=${e?.message} device=${this.fmtDevice(device)}`,
      );
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload || !payload.sub) {
      this.logger.warn(`[GOOGLE] ✗ empty payload device=${this.fmtDevice(device)}`);
      throw new UnauthorizedException('Invalid Google token');
    }

    this.logger.log(
      `[GOOGLE] token ok sub=${payload.sub} email=${payload.email} name="${payload.given_name ?? ''} ${payload.family_name ?? ''}" emailVerified=${payload.email_verified}`,
    );

    let user = await this.prisma.user.findUnique({ where: { googleId: payload.sub } });
    let action: 'login' | 'linked' | 'registered' = 'login';

    if (!user && payload.email) {
      user = await this.prisma.user.findUnique({ where: { email: payload.email } });
      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.sub },
        });
        action = 'linked';
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
      action = 'registered';
    }

    if (!user.isActive) {
      this.logger.warn(
        `[GOOGLE] ✗ deactivated userId=${user.id} email=${user.email}`,
      );
      throw new UnauthorizedException('Account deactivated');
    }

    const tokens = await this.issueTokensAndPersistSession(user.id, device);
    this.logger.log(
      `[GOOGLE] ✓ ${action} userId=${user.id} email=${user.email} sub=${payload.sub} device=${this.fmtDevice(device)}`,
    );
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
      this.logger.warn(
        `[REFRESH] ✗ invalid/expired jwt device=${this.fmtDevice(device)}`,
      );
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

    if (!matched) {
      this.logger.warn(
        `[REFRESH] ✗ no session match userId=${payload.sub} device=${this.fmtDevice(device)}`,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.session.delete({ where: { id: matched.id } });
    this.logger.log(
      `[REFRESH] ✓ userId=${payload.sub} sessionId=${matched.id} device=${this.fmtDevice(device)}`,
    );
    return this.issueTokensAndPersistSession(payload.sub, device);
  }

  async logout(userId: number) {
    const res = await this.prisma.session.deleteMany({ where: { userId } });
    this.logger.log(`[LOGOUT] userId=${userId} sessionsRemoved=${res.count}`);
  }

  // ─── Admin-only login (STRICT: never creates a user) ─────────
  /**
   * Admin login by phone + password. Unlike user sign-in flows, this NEVER
   * auto-creates a user and NEVER upgrades anyone. The account must already
   * exist with role ADMIN, otherwise 401 is returned.
   */
  async adminLogin(
    dto: { phone?: string; email?: string; password: string },
    device: DeviceInfo,
  ) {
    if (!dto.phone && !dto.email) {
      throw new UnauthorizedException('Provide phone or email');
    }

    const user = dto.email
      ? await this.prisma.user.findUnique({
          where: { email: dto.email },
          include: { role: true },
        })
      : await this.prisma.user.findUnique({
          where: { phone: dto.phone! },
          include: { role: true },
        });

    const identifier = dto.email ?? dto.phone;

    if (!user || !user.password) {
      this.logger.warn(
        `[ADMIN-LOGIN] ✗ not found identifier=${identifier} device=${this.fmtDevice(device)}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      this.logger.warn(`[ADMIN-LOGIN] ✗ deactivated userId=${user.id}`);
      throw new UnauthorizedException('Account deactivated');
    }
    if (user.role?.name !== 'ADMIN') {
      this.logger.warn(
        `[ADMIN-LOGIN] ✗ not an admin userId=${user.id} role=${user.role?.name}`,
      );
      throw new UnauthorizedException('Admin access required');
    }

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) {
      this.logger.warn(
        `[ADMIN-LOGIN] ✗ wrong password userId=${user.id} device=${this.fmtDevice(device)}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokensAndPersistSession(user.id, device);
    this.logger.log(
      `[ADMIN-LOGIN] ✓ userId=${user.id} via=${dto.email ? 'email' : 'phone'} identifier=${identifier} device=${this.fmtDevice(device)}`,
    );
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  /**
   * Admin Google login. Verifies the ID token, then requires the resolved
   * user to already exist with role ADMIN. Will NOT create a new user and
   * will NOT promote a regular user — unknown emails are rejected outright.
   */
  async adminGoogleAuth(dto: GoogleAuthDto, device: DeviceInfo) {
    this.logger.log(
      `[ADMIN-GOOGLE] attempt device=${this.fmtDevice(device)}`,
    );

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: this.googleAdminClientId,
      });
      payload = ticket.getPayload();
    } catch (e: any) {
      this.logger.warn(
        `[ADMIN-GOOGLE] ✗ token verify failed err=${e?.message}`,
      );
      throw new UnauthorizedException({
        error: 'INVALID_GOOGLE_TOKEN',
        message: 'Invalid or expired Google token',
      });
    }
    if (!payload?.sub) {
      throw new UnauthorizedException({
        error: 'INVALID_GOOGLE_TOKEN',
        message: 'Invalid Google token',
      });
    }

    // Strict lookup — googleId first, then email fallback. Never create.
    let user = await this.prisma.user.findUnique({
      where: { googleId: payload.sub },
      include: { role: true },
    });
    if (!user && payload.email) {
      user = await this.prisma.user.findUnique({
        where: { email: payload.email },
        include: { role: true },
      });
    }

    if (!user) {
      this.logger.warn(
        `[ADMIN-GOOGLE] ✗ unknown account email=${payload.email} sub=${payload.sub}`,
      );
      throw new UnauthorizedException({
        error: 'ADMIN_NOT_FOUND',
        message: 'No admin account linked to this Google account',
      });
    }
    if (!user.isActive) {
      this.logger.warn(`[ADMIN-GOOGLE] ✗ deactivated userId=${user.id}`);
      throw new UnauthorizedException({
        error: 'ACCOUNT_DEACTIVATED',
        message: 'Account deactivated',
      });
    }
    if (user.role?.name !== 'ADMIN') {
      this.logger.warn(
        `[ADMIN-GOOGLE] ✗ not an admin userId=${user.id} role=${user.role?.name} email=${user.email}`,
      );
      throw new ForbiddenException({
        error: 'NOT_ADMIN',
        message: 'This account does not have admin access',
      });
    }

    // Link googleId on the admin account if this is the first Google login.
    if (!user.googleId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub },
      });
      this.logger.log(
        `[ADMIN-GOOGLE] linked google sub to admin userId=${user.id}`,
      );
    }

    const tokens = await this.issueTokensAndPersistSession(user.id, device);
    this.logger.log(
      `[ADMIN-GOOGLE] ✓ userId=${user.id} email=${user.email} device=${this.fmtDevice(device)}`,
    );
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ─── Password forgot / reset ─────────────────────────────────

  async forgotPassword(_dto: ForgotPasswordEmailDto) {
    // TODO: add PasswordResetToken model to Prisma schema (not in baseline).
    // For now, password reset via email is not available; clients should use phone + OTP flow.
    throw new BadRequestException('Password reset via email is not enabled yet — use phone OTP');
  }

  async resetPassword(_dto: ResetPasswordTokenDto) {
    // TODO: add PasswordResetToken model to Prisma schema (not in baseline).
    throw new BadRequestException('Password reset via email is not enabled yet — use phone OTP');
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

/**
 * Decode a Google id_token's payload WITHOUT verifying signature, just to
 * extract the `aud` claim for diagnostic logging. Never trust this value for
 * auth decisions — the real verification happens via google-auth-library.
 */
function peekIdTokenAud(idToken: string): string | null {
  try {
    const parts = idToken.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf8'),
    );
    return typeof payload?.aud === 'string' ? payload.aud : null;
  } catch {
    return null;
  }
}
