import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'secret-key',
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, SmsService, AccessTokenStrategy, RolesGuard],
  exports: [AuthService],
})
export class AuthModule {}
