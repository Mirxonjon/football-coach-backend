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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FuelPumpFuelService } from './fuel-pump-fuel.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreateFuelPumpFuelDto } from '@/types/fuel-pump-fuel/create-fuel-pump-fuel.dto';
import { UpdateFuelPumpFuelDto } from '@/types/fuel-pump-fuel/update-fuel-pump-fuel.dto';
import { FilterFuelPumpFuelDto } from '@/types/fuel-pump-fuel/filter-fuel-pump-fuel.dto';

@ApiTags('FuelPumpFuel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pump-fuels')
export class FuelPumpFuelController {
  constructor(private readonly service: FuelPumpFuelService) { }

  @Post()
  // @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add fuel to pump (ADMIN)' })
  @ApiBody({ type: CreateFuelPumpFuelDto })
  create(@Body() dto: CreateFuelPumpFuelDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List pump fuels (USER read-only)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'fuelPumpId', required: false, example: 1 })
  findAll(@Query() query: FilterFuelPumpFuelDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pump fuel by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  // @Roles('ADMIN')
  @ApiOperation({ summary: 'Update pump fuel (ADMIN)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFuelPumpFuelDto
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  // @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove fuel from pump (ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
