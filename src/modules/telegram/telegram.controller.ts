import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateTelegramSettingDto } from '@/types/telegram/update-telegram-setting.dto';

@ApiTags('Telegram')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get('settings')
  @Roles('CASHIER', 'ADMIN')
  @ApiOperation({ summary: 'Get current user Telegram settings' })
  getSettings(@Req() req: any) {
    const userId = req.user.sub;
    return this.telegramService.getSettings(userId);
  }

  @Patch('settings')
  @Roles('CASHIER', 'ADMIN')
  @ApiOperation({ summary: 'Update current user Telegram settings' })
  @ApiBody({ type: UpdateTelegramSettingDto })
  updateSettings(@Req() req: any, @Body() dto: UpdateTelegramSettingDto) {
    const userId = req.user.sub;
    return this.telegramService.updateSettings(userId, dto);
  }
}
