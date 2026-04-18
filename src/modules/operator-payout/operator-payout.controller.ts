import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OperatorPayoutService } from './operator-payout.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreateOperatorPayoutDto } from '@/types/operator-payout/create-operator-payout.dto';
import { UpdateOperatorPayoutDto } from '@/types/operator-payout/update-operator-payout.dto';
import { FilterOperatorPayoutDto } from '@/types/operator-payout/filter-operator-payout.dto';

@ApiTags('OperatorPayout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('operator-payouts')
export class OperatorPayoutController {
  constructor(private readonly service: OperatorPayoutService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create operator payout (ADMIN)' })
  @ApiBody({ type: CreateOperatorPayoutDto })
  create(@Body() dto: CreateOperatorPayoutDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List operator payouts (ADMIN)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'operatorId', required: false, example: 1 })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'SUCCESS', 'FAILED'] })
  @ApiQuery({ name: 'from', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2024-12-31' })
  findAll(@Query() query: FilterOperatorPayoutDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get operator payout by id (ADMIN)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update operator payout (ADMIN)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOperatorPayoutDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete operator payout (ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
