import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StatsRangeDto, StatsTopQueryDto } from './dto/stats-range.dto';

@ApiTags('Admin - Statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/stats')
export class StatsAdminController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Top-line KPIs across users, subscriptions, revenue, content and engagement' })
  overview() {
    return this.statsService.getOverview();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Daily revenue buckets (SUCCESS transactions). Defaults to last 30 days.' })
  revenue(@Query() dto: StatsRangeDto) {
    return this.statsService.getRevenue(dto.from, dto.to);
  }

  @Get('users-growth')
  @ApiOperation({ summary: 'Daily new user signups. Defaults to last 30 days.' })
  usersGrowth(@Query() dto: StatsRangeDto) {
    return this.statsService.getUsersGrowth(dto.from, dto.to);
  }

  @Get('top-lessons')
  @ApiOperation({ summary: 'Most engaged lessons by LessonProgress count' })
  topLessons(@Query() dto: StatsTopQueryDto) {
    return this.statsService.getTopLessons(dto.limit ?? 10);
  }

  @Get('top-books')
  @ApiOperation({ summary: 'Most purchased books by UserBook count' })
  topBooks(@Query() dto: StatsTopQueryDto) {
    return this.statsService.getTopBooks(dto.limit ?? 10);
  }

  @Get('subscriptions-by-plan')
  @ApiOperation({ summary: 'Subscription distribution and revenue by plan' })
  subscriptionsByPlan() {
    return this.statsService.getSubscriptionsByPlan();
  }

  @Get('notifications-summary')
  @ApiOperation({ summary: 'Notifications totals and breakdown by type' })
  notificationsSummary() {
    return this.statsService.getNotificationsSummary();
  }
}
