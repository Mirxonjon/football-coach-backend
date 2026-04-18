import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { FuelPumpStatusLogService } from './fuel-pump-status-log.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreateFuelPumpStatusLogDto } from '@/types/fuel-pump-status-log/create-fuel-pump-status-log.dto';
import { FilterFuelPumpStatusLogDto } from '@/types/fuel-pump-status-log/filter-fuel-pump-status-log.dto';

@ApiTags('FuelPumpStatusLog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pump-status-logs')
export class FuelPumpStatusLogController {
  constructor(private readonly service: FuelPumpStatusLogService) {}

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create fuel pump status log (ADMIN)' })
  @ApiBody({ type: CreateFuelPumpStatusLogDto })
  create(@Body() dto: CreateFuelPumpStatusLogDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List fuel pump status logs (ADMIN)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'fuelPumpId', required: false, example: 1 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['AVAILABLE', 'OCCUPIED', 'OUT_OF_SERVICE'],
  })
  @ApiQuery({ name: 'from', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2024-12-31' })
  findAll(@Query() query: FilterFuelPumpStatusLogDto) {
    return this.service.findAll(query);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete fuel pump status log (ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
