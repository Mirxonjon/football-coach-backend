import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from '@/types/subscription/create-subscription.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('me')
  getMySubscriptions(@Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.subscriptionService.getMySubscriptions(userId);
  }

  @Post('me')
  subscribe(@Req() req: Request, @Body() dto: CreateSubscriptionDto) {
    const userId = (req as any).user.sub as number;
    return this.subscriptionService.subscribe(userId, dto);
  }
}
