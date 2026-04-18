import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DeviceController {
  constructor(private service: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Register / upsert FCM device token' })
  async register(@Req() req: any, @Body() dto: RegisterDeviceDto) {
    const userId = req.user.sub as number;
    return this.service.registerDevice(userId, dto.fcmToken, dto.deviceType);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove device' })
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.sub as number;
    return this.service.removeDeviceById(userId, id);
  }
}
