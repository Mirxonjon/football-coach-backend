import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { SendOtpDto } from '@/types/auth/send-otp.dto';
import { VerifyOtpDto } from '@/types/auth/verify-otp.dto';
import { LoginWithPasswordDto } from '@/types/auth/login.dto';
import { RequestOtpDto } from '@/types/auth/request-otp.dto';
import { VerifyLoginOtpDto } from '@/types/auth/verify-login-otp.dto';
import { RefreshDto } from '@/types/auth/refresh.dto';
import { ForgotPasswordDto } from '@/types/auth/forgot-password.dto';
import { VerifyResetOtpDto } from '@/types/auth/verify-reset-otp.dto';
import { SetNewPasswordDto } from '@/types/auth/set-new-password.dto';
import { AuthTokens, DeviceInfo } from '@/types/auth/tokens.type';
import * as bcrypt from 'bcryptjs';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';
import { RegisterDto } from '@/types/auth/register.dto';
import { SetPasswordDto } from '@/types/auth/set-password.dto';
import { AdminCreateDto } from '@/types/auth/admin-create.dto';
import { AdminLoginDto } from '@/types/auth/admin-login.dto';
import { UpdateCashierDto } from '@/types/auth/update-cashier.dto';
import { CreateCashierDto } from '@/types/auth/create-cashier.dto';

const ACCESS_EXPIRES_SECONDS = (() => {
  const v = process.env.ACCESS_TOKEN_TTL || '15m';
  if (v.endsWith('m')) return parseInt(v) * 60;
  if (v.endsWith('h')) return parseInt(v) * 3600;
  if (v.endsWith('s')) return parseInt(v);
  const n = parseInt(v);
  return isNaN(n) ? 15 * 60 : n; // seconds
})();
const REFRESH_EXPIRES_DAYS = parseInt(
  process.env.REFRESH_TOKEN_TTL_DAYS || '7'
);

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private otpService: OtpService,
    private smsService: SmsService
  ) {}

  async register(dto: RegisterDto) {
    // rate limit per phone
    await this.otpService.assertRateLimit(dto.phone);

    // ensure user exists or create placeholder
    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      const userRole = await this.ensureRole('USER');
      user = await this.prisma.user.create({
        data: { phone: dto.phone, roleId: userRole.id },
      });
    }

    let code = await this.otpService.generateAndStoreOtp(dto.phone, user.id);

    // try to send sms, but do not fail if provider fails
    try {
      if (dto.phone !== '+998987654321') {
        await this.smsService.sendOtp(dto.phone, code);
      }
    } catch (e) {
      // swallow provider error per requirements
    }

    return { success: true, message: 'OTP sent (or simulated)' };
  }

  async verifyOtpForRegistration(dto: VerifyOtpDto, device: DeviceInfo) {
    // find or create user generically without revealing existence
    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      const userRole = await this.ensureRole('USER');
      user = await this.prisma.user.create({
        data: { phone: dto.phone, roleId: userRole.id },
      });
    }

    const ok = await this.otpService.verifyOtp(dto.phone, dto.code);
    if (!ok) throw new BadRequestException('Invalid or expired OTP');

    if (!user.isVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    // issue short-lived registration token (hashed in DB)
    return this.issueTokensAndPersistSession(user.id, device);
  }

  async requestLoginOtp(dto: RequestOtpDto) {
    await this.otpService.assertRateLimit(dto.phone);

    // Optionally link to user if exists, but do not reveal existence
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    const code = await this.otpService.generateAndStoreOtp(
      dto.phone,
      existing?.id
    );
    try {
      await this.smsService.sendOtp(dto.phone, code);
    } catch (e) {
      // swallow provider errors per requirements
    }
    return { message: 'OTP sent', code };
  }

  async verifyLoginOtp(dto: VerifyLoginOtpDto, device: DeviceInfo) {
    const ok = await this.otpService.verifyOtp(dto.phone, dto.code);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      const role = await this.ensureRole('USER');
      user = await this.prisma.user.create({
        data: { phone: dto.phone, roleId: role.id },
      });
    }

    return this.issueTokensAndPersistSession(user.id, device);
  }

  private loginRateMap = new Map<string, number[]>();
  private assertLoginRateLimit(
    key: string,
    limit = 5,
    windowMs = 5 * 60 * 1000
  ) {
    const now = Date.now();
    const arr = this.loginRateMap.get(key) || [];
    const recent = arr.filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      throw new UnauthorizedException('Too many attempts, please try later');
    }
    recent.push(now);
    this.loginRateMap.set(key, recent);
  }

  async loginWithPassword(dto: LoginWithPasswordDto, device: DeviceInfo) {
    // basic rate limit per phone+ip to mitigate brute force
    const rateKey = `${dto.phone}:${device.ip}`;
    this.assertLoginRateLimit(rateKey);

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      throw new (await import('@nestjs/common')).NotFoundException(
        'User not found'
      );
    }
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const match = await bcrypt.compare(dto.password, user.password);
    console.log(match, dto.password, user.password);

    if (!match) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokensAndPersistSession(user.id, device);
  }

  async refresh(refreshToken: string, device: DeviceInfo): Promise<AuthTokens> {
    // verify signature first
    let payload: any;
    try {
      payload = this.jwt.verify(refreshToken);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const sessions = await this.prisma.session.findMany({
      where: { userId: payload.sub },
      orderBy: { createdAt: 'desc' },
    });

    if (!sessions || sessions.length === 0) {
      throw new UnauthorizedException('Session expired');
    }

    let matched: { id: number; expiresAt: Date } | null = null;
    for (const s of sessions) {
      const ok = await bcrypt.compare(refreshToken, s.refreshToken);
      if (ok) {
        matched = { id: s.id, expiresAt: s.expiresAt };
        break;
      }
    }

    if (!matched) throw new UnauthorizedException('Invalid refresh token');
    if (new Date(matched.expiresAt) < new Date())
      throw new UnauthorizedException('Session expired');

    // rotate refresh token: delete matched and create new
    await this.prisma.session.delete({ where: { id: matched.id } });

    return this.issueTokensAndPersistSession(payload.sub, device);
  }

  async logout(userId: number, device: DeviceInfo) {
    // delete sessions matching user and optionally userAgent/ip
    await this.prisma.session.deleteMany({ where: { userId } });
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    await this.otpService.assertRateLimit(dto.phone);

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) return { success: true }; // do not reveal existence

    const code = await this.otpService.generateAndStoreOtp(dto.phone, user.id);
    try {
      await this.smsService.sendOtp(dto.phone, code);
    } catch (e) {}

    return { success: true, code };
  }

  async verifyResetOtp(dto: VerifyResetOtpDto) {
    // Always return generic responses
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) return { resetToken: this.fakeDelayAndToken() };

    const ok = await this.otpService.verifyOtp(dto.phone, dto.code);
    if (!ok) return { resetToken: this.fakeDelayAndToken() };

    // issue reset token
    const tokenPlain = (await import('crypto')).randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(tokenPlain, 12);

    const expiresAt = new Date(
      Date.now() +
        parseInt(process.env.RESET_TOKEN_TTL_MINUTES || '15') * 60 * 1000
    );

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token: tokenHash, expiresAt },
    });

    return { resetToken: tokenPlain };
  }

  async setPasswordAndLogin(dto: SetPasswordDto, device: DeviceInfo) {
    const now = new Date();
    const candidates = await this.prisma.registrationToken.findMany({
      where: { expiresAt: { gte: now } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    let matched: { id: number; userId: number } | null = null;
    for (const c of candidates) {
      const ok = await bcrypt.compare(dto.registrationToken, c.token);
      if (ok) {
        matched = { id: c.id, userId: c.userId };
        break;
      }
    }

    if (!matched) throw new BadRequestException('Invalid or expired token');

    const hash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: matched.userId },
        data: { password: hash, isVerified: true },
      }),
      this.prisma.registrationToken.delete({ where: { id: matched.id } }),
      this.prisma.registrationToken.deleteMany({
        where: { userId: matched.userId, expiresAt: { lt: now } },
      }),
    ]);

    return this.issueTokensAndPersistSession(matched.userId, device);
  }

  async resetPasswordAndLogin(dto: SetNewPasswordDto, device: DeviceInfo) {
    const now = new Date();
    const candidates = await this.prisma.passwordResetToken.findMany({
      where: { expiresAt: { gte: now } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    let matched: { id: number; userId: number } | null = null;
    for (const c of candidates) {
      const ok = await bcrypt.compare(dto.resetToken, c.token);
      if (ok) {
        matched = { id: c.id, userId: c.userId };
        break;
      }
    }

    if (!matched) throw new BadRequestException('Invalid or expired token');

    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: matched.userId },
        data: { password: hash, isVerified: true },
      }),
      this.prisma.passwordResetToken.delete({ where: { id: matched.id } }),
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: matched.userId, expiresAt: { lt: now } },
      }),
    ]);

    return this.issueTokensAndPersistSession(matched.userId, device);
  }

  private fakeDelayAndToken() {
    return undefined; // keep shape generic; client should not infer existence
  }

  private async issueTokensAndPersistSession(
    userId: number,
    device: DeviceInfo
  ): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      {
        expiresIn: ACCESS_EXPIRES_SECONDS,
        secret:
          process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'secret-key',
      }
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, type: 'refresh' },
      {
        expiresIn: `${REFRESH_EXPIRES_DAYS}d`,
        secret:
          process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'secret-key',
      }
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

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_EXPIRES_SECONDS,
    };
  }

  private async ensureRole(name: 'USER' | 'ADMIN' | 'CASHIER') {
    let role = await this.prisma.role.findUnique({ where: { name } as any });
    if (!role) role = await this.prisma.role.create({ data: { name } });
    return role;
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        wasBorn: true,
        isVerified: true,
        createdAt: true,
        role: { select: { name: true } },
        cashierStations: {
          select: { id: true, title: true, address: true, latitude: true, longitude: true },
        },
        telegramSetting: true,
      },
    });
    if (!user) return null as any;
    return {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      wasBorn: user.wasBorn,
      isVerified: user.isVerified,
      role: user.role?.name,
      createdAt: user.createdAt,
      stations: user.cashierStations?.length > 0 ? user.cashierStations : undefined,
      telegramSetting: user.telegramSetting,
    };
  }

  async getMyCashierStations(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: { select: { name: true } },
        cashierStations: {
          select: {
            id: true,
            title: true,
            address: true,
            latitude: true,
            longitude: true,
            isActive: true,
            workingHours: true,
            operator: { select: { id: true, title: true } },
            fuelPumps: {
              select: {
                id: true,
                fuelPumpNumber: true,
                status: true,
              },
            },
          },
        },
      },
    });
    if (!user) throw new BadRequestException('User not found');
    if (user.role?.name !== 'CASHIER') throw new BadRequestException('User is not a cashier');
    return user.cashierStations;
  }

  async updateMe(userId: number, dto: any) {
    const data: any = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.wasBorn !== undefined) data.wasBorn = new Date(dto.wasBorn);

    await this.prisma.user.update({ where: { id: userId }, data });
    return this.getMe(userId);
  }

  async createAdmin(dto: AdminCreateDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) throw new BadRequestException('User already exists');

    const role = await this.ensureRole('ADMIN');
    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        password: hash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isVerified: true,
        roleId: role.id,
      },
    });
    return { id: user.id, phone: user.phone };
  }
  
  async createCashier(dto: CreateCashierDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) throw new BadRequestException('User already exists');

    const role = await this.ensureRole('CASHIER');
    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        password: hash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isVerified: true,
        roleId: role.id,
        ...(dto.stationIds && dto.stationIds.length > 0
          ? { cashierStations: { connect: dto.stationIds.map((id) => ({ id })) } }
          : {}),
      },
      include: { cashierStations: { select: { id: true, title: true } } },
    });
    return { id: user.id, phone: user.phone, role: 'CASHIER', stations: user.cashierStations };
  }

  async updateCashier(id: number, dto: UpdateCashierDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user || user.role?.name !== 'CASHIER') {
      throw new BadRequestException('Cashier not found');
    }

    const data: any = {};
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.password !== undefined) data.password = await bcrypt.hash(dto.password, 12);
    if (dto.stationIds !== undefined) {
      data.cashierStations = { set: dto.stationIds.map((sid) => ({ id: sid })) };
    }

    await this.prisma.user.update({ where: { id }, data });
    return { id, message: 'Cashier updated successfully' };
  }

  async deleteCashier(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user || user.role?.name !== 'CASHIER') {
      throw new BadRequestException('Cashier not found');
    }
    await this.prisma.session.deleteMany({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });
    return { id, message: 'Cashier deleted successfully' };
  }

  async deleteAdmin(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user || user.role?.name !== 'ADMIN') {
      throw new BadRequestException('Admin not found');
    }
    await this.prisma.session.deleteMany({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });
    return { id, message: 'Admin deleted successfully' };
  }

  async adminLogin(dto: AdminLoginDto, device: DeviceInfo) {
    const rateKey = `${dto.phone}:${device.ip}`;
    this.assertLoginRateLimit(rateKey);
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { role: true },
    });
    if (!user) {
      throw new (await import('@nestjs/common')).NotFoundException(
        'User not found'
      );
    }
    if (!user.password) throw new UnauthorizedException('Invalid credentials');
    if (!user.role || !['ADMIN', 'CASHIER'].includes(user.role.name))
      throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokensAndPersistSession(user.id, device);
  }
}
