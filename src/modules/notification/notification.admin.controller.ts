import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AdminBroadcastDto,
  AdminSendManyDto,
  AdminSendUserDto,
} from './dto/admin-send-user.dto';

@ApiTags('Admin - Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/notifications')
export class NotificationAdminController {
  constructor(private readonly service: NotificationService) {}

  @Post('send-user')
  @ApiOperation({ summary: 'Send notification to a single user' })
  sendUser(@Body() dto: AdminSendUserDto) {
    const { userId, ...payload } = dto;
    return this.service.adminSendToUser(userId, payload);
  }

  @Post('send-many')
  @ApiOperation({ summary: 'Send notification to multiple users' })
  sendMany(@Body() dto: AdminSendManyDto) {
    const { userIds, ...payload } = dto;
    return this.service.adminSendToMany(userIds, payload);
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast notification to all active users' })
  broadcast(@Body() dto: AdminBroadcastDto) {
    return this.service.adminBroadcast(dto);
  }
}
