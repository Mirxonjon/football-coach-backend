import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from '@/types/subscription/create-subscription.dto';
import { AutoPayDto } from '@/types/subscription/auto-pay.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('me')
  @ApiOperation({ summary: 'List my subscriptions' })
  getMySubscriptions(@Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.subscriptionService.getMySubscriptions(userId);
  }

  @Post('me')
  @ApiOperation({
    summary: 'Subscribe to a plan. Pass cardId to charge an existing Click card immediately.',
  })
  subscribe(@Req() req: Request, @Body() dto: CreateSubscriptionDto) {
    const userId = (req as any).user.sub as number;
    return this.subscriptionService.subscribe(userId, dto);
  }

  @Patch('me/auto-pay')
  @ApiOperation({ summary: 'Enable or disable auto-renewal for the current subscription' })
  setAutoPay(@Req() req: Request, @Body() dto: AutoPayDto) {
    const userId = (req as any).user.sub as number;
    return this.subscriptionService.setAutoPay(userId, dto);
  }

  @Post('me/dev-activate/:planId')
  @ApiOperation({
    summary:
      'DEV-ONLY: activate a subscription without charging a card. Disabled when NODE_ENV=production.',
  })
  devActivate(
    @Req() req: Request,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    const userId = (req as any).user.sub as number;
    return this.subscriptionService.devActivate(userId, planId);
  }
}
