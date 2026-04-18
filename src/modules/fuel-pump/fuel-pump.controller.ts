import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FuelPumpService } from './fuel-pump.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreateFuelPumpDto } from '@/types/fuel-pump/create-fuel-pump.dto';
import { UpdateFuelPumpDto } from '@/types/fuel-pump/update-fuel-pump.dto';
import { FilterFuelPumpDto } from '@/types/fuel-pump/filter-fuel-pump.dto';

@ApiTags('FuelPump')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pumps')
export class FuelPumpController {
  constructor(private readonly service: FuelPumpService) { }

  @Post()
  // @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create fuel pump (ADMIN)' })
  @ApiBody({ type: CreateFuelPumpDto })
  create(@Body() dto: CreateFuelPumpDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List fuel pumps' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, example: 'desc' })
  @ApiQuery({ name: 'stationId', required: false, example: 1 })
  @ApiQuery({ name: 'status', required: false, enum: ['AVAILABLE', 'OCCUPIED', 'OUT_OF_SERVICE'] })
  findAll(@Query() query: FilterFuelPumpDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fuel pump by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  // @Roles('ADMIN')
  @ApiOperation({ summary: 'Update fuel pump (ADMIN)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFuelPumpDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  // @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete fuel pump (ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Get(':id/qr-code')
  @ApiOperation({ summary: 'Download QR code image for a pump' })
  @Header('Content-Type', 'image/png')
  @Header('Content-Disposition', 'attachment; filename=qr-code.png')
  async getQrCode(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const buffer = await this.service.generateQrCodeImage(id);
    res.send(buffer);
  }

  @Get('scan/:qrCode')
  @ApiOperation({ summary: 'Scan QR code and get pump details (Mobile App)' })
  async scan(@Param('qrCode') qrCode: string) {
    return this.service.findByQrCode(qrCode);
  }
}
