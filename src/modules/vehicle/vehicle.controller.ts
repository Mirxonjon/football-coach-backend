import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateCarDto } from '@/types/vehicle/create-car.dto';
import { UpdateCarDto } from '@/types/vehicle/update-car.dto';
import { CarFilterDto } from '@/types/vehicle/car-filter.dto';
import { AddUserCarDto } from '@/types/vehicle/add-user-car.dto';
import { UpdateUserCarDto } from '@/types/vehicle/update-user-car.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Vehicle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cars')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) { }

  // Admin-only CRUD
  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create car (ADMIN only)' })
  @ApiBody({ type: CreateCarDto })
  create(@Body() dto: CreateCarDto, @Req() req: any) {
    const userId = req.user?.sub;
    return this.vehicleService.create(dto, userId);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update car (ADMIN only)' })
  update(@Param('id') id: string, @Body() dto: UpdateCarDto) {
    return this.vehicleService.update(+id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete car (ADMIN only)' })
  remove(@Param('id') id: string) {
    return this.vehicleService.remove(+id);
  }

  // Public read (but still behind auth, per project defaults); could add @Public if desired
  @Get(':id')
  @ApiOperation({ summary: 'Get car by id' })
  findOne(@Param('id') id: string) {
    return this.vehicleService.findOne(+id);
  }

  @Get()
  @ApiOperation({ summary: 'List cars with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of cars' })
  findAll(@Query() query: CarFilterDto) {
    return this.vehicleService.findAll(query);
  }

  // User car management
  @Post('me')
  @Roles('USER', 'ADMIN')
  @ApiOperation({ summary: 'Add car to current user (from catalog or custom)' })
  @ApiBody({ type: AddUserCarDto })
  addToMe(@Body() dto: AddUserCarDto, @Req() req: any) {
    const userId = req.user?.sub;
    return this.vehicleService.addToUser(userId, dto);
  }

  @Delete('me/:userCarId')
  @Roles('USER', 'ADMIN')
  @ApiOperation({ summary: 'Remove car from current user' })
  removeFromMe(@Param('userCarId') userCarId: string, @Req() req: any) {
    const userId = req.user?.sub;
    return this.vehicleService.removeFromUser(userId, +userCarId);
  }

  @Patch('me/:userCarId')
  @Roles('USER', 'ADMIN')
  @ApiOperation({ summary: 'Update your user car details' })
  @ApiBody({ type: UpdateUserCarDto })
  updateMyCar(
    @Param('userCarId') userCarId: string,
    @Body() dto: UpdateUserCarDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    return this.vehicleService.updateUserCar(userId, +userCarId, dto);
  }

  @Get('me/list')
  @Roles('USER', 'ADMIN')
  @ApiOperation({ summary: 'Get my cars' })
  myCars(@Req() req: any) {
    const userId = req.user?.sub;
    return this.vehicleService.getUserCars(userId);
  }

  // External sync (ADMIN only)
  @Post('sync')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Sync cars from external API (ADMIN only)' })
  sync() {
    return this.vehicleService.syncExternal();
  }
}
