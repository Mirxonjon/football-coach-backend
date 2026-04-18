import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTelegramSettingDto } from '@/types/telegram/update-telegram-setting.dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly TELEGRAM_SERVICE_URL: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.TELEGRAM_SERVICE_URL = this.config.get<string>('TELEGRAM_SERVICE_URL') || 'http://localhost:3040';
  }

  async getSettings(userId: number) {
    let settings = await this.prisma.telegramSetting.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.telegramSetting.create({
        data: { userId },
      });
    }

    return settings;
  }

  async updateSettings(userId: number, dto: UpdateTelegramSettingDto) {
    return this.prisma.telegramSetting.upsert({
      where: { userId },
      update: dto,
      create: {
        userId,
        ...dto,
      },
    });
  }

  /**
   * Sends a message to a specific Telegram Chat/Group via External API
   */
  async sendMessage(chatId: string, text: string) {
    if (!chatId) return;

    try {
      this.logger.log(`Sending Telegram message to ${chatId}: ${text}`);
      
      const response = await axios.post(`${this.TELEGRAM_SERVICE_URL}/api/notify`, {
        chatId: parseInt(chatId),
        message: text
      });
      
      this.logger.debug(`External API Response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send Telegram message to ${chatId}: ${error.message}`);
    }
  }

  /**
   * Notifies all cashiers assigned to a specific station about a successful payment
   */
  async notifyStationCashiers(fuelStationId: number, details: { amount: number; transactionId: string; fuelName: string; pumpNum: number }) {
    const station = await this.prisma.fuelStation.findUnique({
      where: { id: fuelStationId },
      include: {
        cashiers: {
          include: {
            telegramSetting: true,
          },
        },
      },
    });

    if (!station || !station.cashiers) return;

    const message = `✅ To'lov muvaffaqiyatli!\n\n` +
      `📍 Stansiya: ${station.title}\n` +
      `⛽️ Yoqilg'i: ${details.fuelName}\n` +
      `🔢 Kalonka: ${details.pumpNum}\n` +
      `💰 Summa: ${details.amount.toLocaleString()} UZS\n` +
      `🆔 Tranzaksiya: ${details.transactionId}`;

    for (const cashier of station.cashiers) {
      const settings = cashier.telegramSetting;
      if (!settings || !settings.isActive) continue;

      // Send to personal ID if set
      if (settings.telegramId) {
        await this.sendMessage(settings.telegramId, message);
      }

      // Send to group ID if set
      if (settings.telegramGroupId) {
        await this.sendMessage(settings.telegramGroupId, message);
      }
    }
  }
}
