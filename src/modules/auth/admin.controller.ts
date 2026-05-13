import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AdminLoginDto } from '@/types/auth/admin-login.dto';
import { GoogleAuthDto } from '@/types/auth/google-auth.dto';

@ApiTags('Admin Auth')
@Controller('admin')
export class AdminController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Admin login with phone + password — existing ADMIN only, never creates a user',
  })
  @ApiBody({ type: AdminLoginDto })
  adminLogin(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.authService.adminLogin(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Admin login with Google ID token — existing ADMIN only. Unknown accounts return 401, no user is created.',
  })
  @ApiBody({ type: GoogleAuthDto })
  adminGoogleLogin(@Body() dto: GoogleAuthDto, @Req() req: Request) {
    return this.authService.adminGoogleAuth(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }
}
