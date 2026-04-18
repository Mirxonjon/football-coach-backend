import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { BroadcastDto } from './dto/broadcast.dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ListQueryDto } from '@/types/global/dto/list-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private service: NotificationService) { }

  @Post('register-device')
  @ApiOperation({ summary: 'Register device token' })
  async registerDevice(@Req() req: any, @Body() dto: RegisterDeviceDto) {
    const userId = (req as any).user.sub as number;
    console.log(dto, userId, 'body');
    // const userId = this.getUserIdFromReq(req);

    return this.service.registerDevice(userId, dto.deviceToken, dto.platform);
  }

  @Delete('remove-device')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove device token (logout)' })
  async removeDevice(
    @Req() req: any,
    @Headers('device-token') deviceTokenHeader: string,
    @Body('deviceToken') deviceTokenBody?: string
  ) {
    const userId = (req as any).user.sub as number;
    const token = deviceTokenBody || deviceTokenHeader;
    return this.service.removeDevice(userId, token);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send notification to a specific user' })
  async sendToUser(@Body() dto: SendNotificationDto) {
    return this.service.sendToUser(dto.userId, {
      title: dto.title,
      body: dto.body,
      type: dto.type,
      data: dto.data,
    });
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast notification to all active devices' })
  async broadcast(@Body() dto: BroadcastDto) {
    return this.service.broadcast({
      title: dto.title,
      body: dto.body,
      type: dto.type,
      data: dto.data,
    });
  }

  @Get('my')
  @ApiOperation({ summary: 'My notification history' })
  async my(@Req() req: any, @Query() query: ListQueryDto) {
    const userId = (req as any).user.sub as number;
    const { page = 1, limit = 10 } = query;
    return this.service.listMy(userId, page, limit);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@Req() req: any) {
    const userId = (req as any).user.sub as number;
    return this.service.markAllRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@Req() req: any, @Param('id') id: string) {
    const userId = (req as any).user.sub as number;
    return this.service.markRead(userId, Number(id));
  }
}
