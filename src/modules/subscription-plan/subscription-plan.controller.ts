import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { SubscriptionPlanService } from './subscription-plan.service';
import { CreateSubscriptionPlanDto } from '@/types/subscription-plan/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from '@/types/subscription-plan/update-subscription-plan.dto';

@ApiTags('Subscription Plans')
@Controller()
export class SubscriptionPlanController {
  constructor(private readonly planService: SubscriptionPlanService) {}

  @Public()
  @Get('plans')
  findAll() {
    return this.planService.findAllActive();
  }

  @Public()
  @Get('plans/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.planService.findById(id);
  }

  @ApiBearerAuth()
  @Post('admin/plans')
  create(@Body() dto: CreateSubscriptionPlanDto) {
    return this.planService.create(dto);
  }

  @ApiBearerAuth()
  @Patch('admin/plans/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    return this.planService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete('admin/plans/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.planService.softDelete(id);
  }
}
