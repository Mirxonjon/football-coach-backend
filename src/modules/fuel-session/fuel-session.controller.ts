import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { FuelSessionService } from './fuel-session.service';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { CreateFuelSessionDto } from '@/types/fuel-session/create-fuel-session.dto';
import { UpdateFuelSessionDto } from '@/types/fuel-session/update-fuel-session.dto';
import { FilterFuelSessionDto } from '@/types/fuel-session/filter-fuel-session.dto';
import { RemoteStartSessionDto } from '@/types/fuel-session/remote-start-session.dto';
import { UpdateFuelSessionStatusDto } from '@/types/fuel-session/update-fuel-session-status.dto';
import { CashierStatsFilterDto } from '@/types/fuel-session/cashier-stats-filter.dto';
import { PayAndCreateSessionDto } from '@/types/fuel-session/pay-and-create-session.dto';

import { Request } from 'express';

@ApiTags('FuelSession')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fuel-sessions')
export class FuelSessionController {
  constructor(private readonly service: FuelSessionService) { }

  // USER create own session purely locally (deprecated but kept for compatibility)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create fuel session (USER creates own)' })
  @ApiBody({ type: CreateFuelSessionDto })
  create(@Body() dto: CreateFuelSessionDto, @Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.service.createForUser(userId, dto);
  }

  // ATOMIC: pay with saved Click card AND create fuel session in ONE request
  @Post('pay-and-create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Atomically charge saved card and create fuel session (single API)',
    description:
      'Accepts cardId, amount and session details. Creates the session in PENDING, charges the Click card, then confirms. On payment failure the session is marked CANCELLED — paymentId is never lost.',
  })
  @ApiBody({ type: PayAndCreateSessionDto })
  payAndCreate(@Body() dto: PayAndCreateSessionDto, @Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.service.payAndCreate(userId, dto);
  }

  // TRIGGER REMOTE START
  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger remote start on an station' })
  @ApiBody({ type: RemoteStartSessionDto })
  remoteStart(@Body() dto: RemoteStartSessionDto, @Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.service.remoteStartSession(userId, dto);
  }

  // TRIGGER REMOTE STOP
  @Post('stop/:id')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger remote stop on an station' })
  remoteStop(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.service.remoteStopSession(userId, id);
  }

  // CASHIER create for any user
  @Post('cashier')
  @Roles('CASHIER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create fuel session (CASHIER for any user)' })
  @ApiBody({ type: CreateFuelSessionDto })
  cashierCreate(@Body() dto: CreateFuelSessionDto) {
    return this.service.adminCreate(dto);
  }

  // USER get own stats (total fuel consumption summary)
  @Get('my-stats')
  @ApiOperation({
    summary: 'Get current user fuel consumption statistics (totals by fuel type, unit, category)',
  })
  getMyStats(@Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.service.getUserStats(userId);
  }

  // CASHIER get station stats
  @Get('cashier/stats')
  @Roles('CASHIER')
  @ApiOperation({
    summary: 'Get fuel station statistics for cashier (revenue, volume, peak hours, top customers)',
  })
  getCashierStats(@Query() query: CashierStatsFilterDto, @Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.service.getCashierStats(userId, query);
  }

  // USER list own
  @Get()
  @ApiOperation({ summary: 'List own fuel sessions (USER)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'FAILED'],
  })
  @ApiQuery({ name: 'from', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2024-12-31' })
  findAll(@Query() query: FilterFuelSessionDto, @Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.service.findAllForUser(userId, query);
  }


  // ADMIN list all
  @Get('admin')
  @Roles('ADMIN', 'CASHIER')
  @ApiOperation({ summary: 'List all fuel sessions (ADMIN/CASHIER)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'DISPENSING', 'COMPLETED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'userId', required: false, example: 1 })
  @ApiQuery({ name: 'fuelPumpId', required: false, example: 1 })
  @ApiQuery({ name: 'from', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2024-12-31' })
  adminFindAll(@Query() query: FilterFuelSessionDto) {
    return this.service.adminFindAll(query);
  }

  // CONFIRM SESSION
  @Post(':id/confirm')
  @Roles('ADMIN', 'CASHIER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a fuel session (ADMIN/CASHIER)' })
  @ApiQuery({ name: 'paymentId', required: false, example: 1 })
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @Query('paymentId') paymentId?: number
  ) {
    return this.service.confirmSession(id, paymentId);
  }

  // CASHIER update status
  @Patch(':id/status')
  @Roles('CASHIER')
  @ApiOperation({ summary: 'Update fuel session status (CASHIER only)' })
  @ApiBody({ type: UpdateFuelSessionStatusDto })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFuelSessionStatusDto
  ) {
    return this.service.updateStatus(id, dto.status);
  }

  // USER get own by id
  @Get(':id')
  @ApiOperation({
    summary: 'Get fuel session by id (USER owns only)',
  })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.service.findOneForUser(userId, id);
  }

  // ADMIN get by id
  @Get('admin/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get fuel session by id (ADMIN)' })
  adminFindOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminFindOne(id);
  }

  // ADMIN update
  @Patch('admin/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update fuel session (ADMIN)' })
  adminUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFuelSessionDto
  ) {
    return this.service.adminUpdate(id, dto);
  }

  // ADMIN delete
  @Delete('admin/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete fuel session (ADMIN)' })
  adminRemove(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminRemove(id);
  }
}
