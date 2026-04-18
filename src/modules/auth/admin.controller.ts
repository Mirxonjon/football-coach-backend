import { Body, Controller, Delete, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AdminCreateDto } from '@/types/auth/admin-create.dto';
import { AdminLoginDto } from '@/types/auth/admin-login.dto';
import { CreateCashierDto } from '@/types/auth/create-cashier.dto';
import { UpdateCashierDto } from '@/types/auth/update-cashier.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly authService: AuthService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create admin user (ADMIN only)' })
  @ApiBody({ type: AdminCreateDto })
  createAdmin(@Body() dto: AdminCreateDto) {
    return this.authService.createAdmin(dto);
  }

  @Post('create-cashier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create cashier user (ADMIN only)' })
  @ApiBody({ type: CreateCashierDto })
  createCashier(@Body() dto: CreateCashierDto) {
    return this.authService.createCashier(dto);
  }

  @Patch('update-cashier/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update cashier user (ADMIN only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateCashierDto })
  updateCashier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCashierDto,
  ) {
    return this.authService.updateCashier(id, dto);
  }

  @Delete('delete-cashier/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete cashier user (ADMIN only)' })
  @ApiParam({ name: 'id', type: Number })
  deleteCashier(@Param('id', ParseIntPipe) id: number) {
    return this.authService.deleteCashier(id);
  }

  @Delete('delete-admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete admin user (ADMIN only)' })
  @ApiParam({ name: 'id', type: Number })
  deleteAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.authService.deleteAdmin(id);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login with phone + password' })
  @ApiBody({ type: AdminLoginDto })
  adminLogin(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.authService.adminLogin(dto, { ip: req.ip, userAgent: req.headers['user-agent'] as string });
  }
}
