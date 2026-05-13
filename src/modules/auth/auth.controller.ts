import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { PhoneRequestOtpDto } from '@/types/auth/phone-request-otp.dto';
import { PhoneVerifyOtpDto } from '@/types/auth/phone-verify-otp.dto';
import { EmailRegisterDto } from '@/types/auth/email-register.dto';
import { EmailLoginDto } from '@/types/auth/email-login.dto';
import { GoogleAuthDto } from '@/types/auth/google-auth.dto';
import { RefreshDto } from '@/types/auth/refresh.dto';
import { ForgotPasswordEmailDto } from '@/types/auth/forgot-password-email.dto';
import { ResetPasswordTokenDto } from '@/types/auth/reset-password-token.dto';
import { Public } from '@/common/decorators/public.decorator';
import { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private device(req: Request) {
    return { ip: req.ip, userAgent: req.headers['user-agent'] as string };
  }

  @Public()
  @Post('phone/request-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP for phone auth' })
  @ApiBody({ type: PhoneRequestOtpDto })
  @ApiResponse({ status: 200, schema: { example: { ttlSec: 300 } } })
  phoneRequestOtp(@Body() dto: PhoneRequestOtpDto) {
    return this.authService.phoneRequestOtp(dto);
  }

  @Public()
  @Post('phone/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and get tokens' })
  @ApiBody({ type: PhoneVerifyOtpDto })
  @ApiResponse({ status: 200, schema: { example: { accessToken: 'eyJ...', refreshToken: 'eyJ...', user: {} } } })
  phoneVerifyOtp(@Body() dto: PhoneVerifyOtpDto, @Req() req: Request) {
    return this.authService.phoneVerifyOtp(dto, this.device(req));
  }

  @Public()
  @Post('email/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register with email + password' })
  @ApiBody({ type: EmailRegisterDto })
  @ApiResponse({ status: 201 })
  emailRegister(@Body() dto: EmailRegisterDto, @Req() req: Request) {
    return this.authService.emailRegister(dto, this.device(req));
  }

  @Public()
  @Post('email/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + password' })
  @ApiBody({ type: EmailLoginDto })
  emailLogin(@Body() dto: EmailLoginDto, @Req() req: Request) {
    return this.authService.emailLogin(dto, this.device(req));
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Sign in or register with Google — single endpoint handles both flows',
    description:
      'Send the Google ID token (audience must match GOOGLE_WEB_CLIENT_ID).\n\n' +
      'Resolution order:\n' +
      '1. If a user with this googleId already exists → log in.\n' +
      '2. Else if a user with this email exists → link googleId to that account and log in.\n' +
      '3. Else → create a new USER (isVerified=true) and log in.\n\n' +
      'Returns { accessToken, refreshToken, user } in every case.',
  })
  @ApiBody({ type: GoogleAuthDto })
  googleAuth(@Body() dto: GoogleAuthDto, @Req() req: Request) {
    return this.authService.googleAuth(dto, this.device(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshDto })
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, this.device(req));
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (revoke all sessions)' })
  @ApiResponse({ status: 204 })
  async logout(@Req() req: any) {
    await this.authService.logout(req.user.sub);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({ type: ForgotPasswordEmailDto })
  @ApiResponse({ status: 204 })
  async forgotPassword(@Body() dto: ForgotPasswordEmailDto) {
    await this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordTokenDto })
  @ApiResponse({ status: 204 })
  async resetPassword(@Body() dto: ResetPasswordTokenDto) {
    await this.authService.resetPassword(dto);
  }
}
