import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FuelStationService } from './fuel-station.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { OptionalJwtAuthGuard } from '@/modules/auth/guards/optional-jwt-auth.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreateFuelStationDto } from '@/types/fuel-station/create-fuel-station.dto';
import { UpdateFuelStationDto } from '@/types/fuel-station/update-fuel-station.dto';
import { FilterFuelStationDto } from '@/types/fuel-station/filter-fuel-station.dto';

@ApiTags('FuelStation')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stations')
export class FuelStationController {
  constructor(private readonly service: FuelStationService) {}

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create fuel station (ADMIN)' })
  @ApiBody({ type: CreateFuelStationDto })
  create(@Body() dto: CreateFuelStationDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List fuel stations' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, example: 'desc' })
  @ApiQuery({ name: 'operatorId', required: false, example: 1 })
  @ApiQuery({ name: 'isActive', required: false, example: true })
  @ApiQuery({ name: 'from', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2024-12-31' })
  @ApiQuery({ name: 'lat', required: false, example: 40.7128 })
  @ApiQuery({ name: 'lng', required: false, example: -74.006 })
  @ApiQuery({ name: 'radiusKm', required: false, example: 5 })
  findAll(@Query() query: FilterFuelStationDto, @Req() req: any) {
    const userId: number | undefined = req?.user?.sub ? Number(req.user.sub) : undefined;
    
    return this.service.findAll(query, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fuel station by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update fuel station (ADMIN)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFuelStationDto
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete fuel station (ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
