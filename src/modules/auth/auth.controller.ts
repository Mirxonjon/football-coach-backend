import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  Get,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from '@/types/auth/send-otp.dto';
import { VerifyOtpDto } from '@/types/auth/verify-otp.dto';
import { LoginWithPasswordDto } from '@/types/auth/login.dto';
import { RequestOtpDto } from '@/types/auth/request-otp.dto';
import { VerifyLoginOtpDto } from '@/types/auth/verify-login-otp.dto';
import { RefreshDto } from '@/types/auth/refresh.dto';
import { ForgotPasswordDto } from '@/types/auth/forgot-password.dto';
import { VerifyResetOtpDto } from '@/types/auth/verify-reset-otp.dto';
import { SetNewPasswordDto } from '@/types/auth/set-new-password.dto';
import { Public } from '@/common/decorators/public.decorator';
import { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MeResponseDto } from '@/types/auth/me-response.dto';
import { UpdateMeDto } from '@/types/auth/update-me.dto';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { RegisterDto } from '@/types/auth/register.dto';
import { SetPasswordDto } from '@/types/auth/set-password.dto';


@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register by phone - send OTP' })
  @ApiBody({ type: RegisterDto })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'STEP 2 — Verify OTP and issue registrationToken' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    schema: { example: { registrationToken: 'a3bf...' } },
  })
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.verifyOtpForRegistration(dto, {
      ip,
      userAgent: userAgent as string,
    });
  }

  // LOGIN OTP FLOW
  // @Public()
  // @Post('login/request-otp')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Login — STEP 1: Request OTP (send SMS)' })
  // @ApiBody({ type: RequestOtpDto })
  // @ApiResponse({ status: 200, schema: { example: { message: 'OTP sent' } } })
  // requestLoginOtp(@Body() dto: RequestOtpDto) {
  //   return this.authService.requestLoginOtp(dto);
  // }

  // @Public()
  // @Post('login/verify-otp')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Login — STEP 2: Verify OTP and login' })
  // @ApiBody({ type: VerifyLoginOtpDto })
  // @ApiResponse({
  //   status: 200,
  //   schema: { example: { accessToken: 'eyJ...', refreshToken: 'eyJ...' } },
  // })
  // verifyLoginOtp(@Body() dto: VerifyLoginOtpDto, @Req() req: Request) {
  //   const ip = req.ip;
  //   const userAgent = req.headers['user-agent'];
  //   return this.authService.verifyLoginOtp(dto, {
  //     ip,
  //     userAgent: userAgent as string,
  //   });
  // }

  // @Public()
  // @Post('login/password')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Login using phone + password' })
  // @ApiBody({ type: LoginWithPasswordDto })
  // loginWithPassword(@Body() dto: LoginWithPasswordDto, @Req() req: Request) {
  //   const ip = req.ip;
  //   const userAgent = req.headers['user-agent'];
  //   return this.authService.loginWithPassword(dto, {
  //     ip,
  //     userAgent: userAgent as string,
  //   });
  // }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshDto })
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.refresh(dto.refreshToken, {
      ip,
      userAgent: userAgent as string,
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Logout and revoke refresh token (all sessions for current device)',
  })
  logout(@Req() req: any) {
    const userId = req.user.sub;
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;
    return this.authService.logout(userId, {
      ip,
      userAgent: userAgent as string,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user (safe fields only)' })
  @ApiResponse({ status: 200, type: MeResponseDto })
  me(@Req() req: any): Promise<MeResponseDto> {
    const userId = req.user.sub as number;
    return this.authService.getMe(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile (firstName, lastName, wasBorn)' })
  @ApiBody({ type: UpdateMeDto })
  @ApiResponse({ status: 200, type: MeResponseDto })
  updateMe(@Req() req: any, @Body() dto: UpdateMeDto): Promise<MeResponseDto> {
    const userId = req.user.sub as number;
    return this.authService.updateMe(userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  @ApiBearerAuth()
  @Get('my-stations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get stations assigned to the current cashier (CASHIER only)' })
  myCashierStations(@Req() req: any) {
    const userId = req.user.sub as number;
    return this.authService.getMyCashierStations(userId);
  }

  // @Public()
  // @Post('forgot-password')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Send OTP for password reset' })
  // @ApiBody({ type: ForgotPasswordDto })
  // @ApiResponse({ status: 200, schema: { example: { success: true } } })
  // forgotPassword(@Body() dto: ForgotPasswordDto) {
  //   return this.authService.forgotPassword(dto);
  // }

  // @Public()
  // @Post('verify-reset-otp')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'STEP 1 — Verify reset OTP and issue resetToken' })
  // @ApiBody({ type: VerifyResetOtpDto })
  // @ApiResponse({
  //   status: 200,
  //   schema: { example: { resetToken: '1f2e3d4c...' } },
  // })
  // verifyResetOtp(@Body() dto: VerifyResetOtpDto) {
  //   return this.authService.verifyResetOtp(dto);
  // }

  // @Public()
  // @Post('set-password')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'STEP 3 — Set password and login (issue tokens)' })
  // @ApiBody({ type: SetPasswordDto })
  // @ApiResponse({
  //   status: 200,
  //   schema: {
  //     example: {
  //       accessToken: 'eyJ...',
  //       refreshToken: 'eyJ...',
  //       expiresIn: 900,
  //     },
  //   },
  // })
  // setPassword(@Body() dto: SetPasswordDto, @Req() req: Request) {
  //   const ip = req.ip;
  //   const userAgent = req.headers['user-agent'];
  //   return this.authService.setPasswordAndLogin(dto, {
  //     ip,
  //     userAgent: userAgent as string,
  //   });
  // }

  // @Public()
  // @Post('reset-password')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'STEP 3 — Set password and login (issue tokens)' })
  // @ApiBody({ type: SetNewPasswordDto })
  // @ApiResponse({
  //   status: 200,
  //   schema: {
  //     example: {
  //       accessToken: 'eyJ...',
  //       refreshToken: 'eyJ...',
  //       expiresIn: 900,
  //     },
  //   },
  // })
  // resetPassword(@Body() dto: SetNewPasswordDto, @Req() req: Request) {
  //   const ip = req.ip;
  //   const userAgent = req.headers['user-agent'];
  //   return this.authService.resetPasswordAndLogin(dto, {
  //     ip,
  //     userAgent: userAgent as string,
  //   });
  // }
}
