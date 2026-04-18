import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../../common/services/minio/minio.service';
import { NotificationService } from '../notification/notification.service';
import { OpenAIConfig, CONFIG_OPENAI_TOKEN } from '../../common/config/app.config';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private readonly openai: OpenAI;
  private readonly model: string;
  private readonly rateLimitMax: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {
    const openaiConfig = this.configService.get<OpenAIConfig>(CONFIG_OPENAI_TOKEN);
    this.openai = new OpenAI({ apiKey: openaiConfig.apiKey });
    this.model = openaiConfig.model;
    this.rateLimitMax = parseInt(
      this.configService.get<string>('AI_RATE_LIMIT_MAX') || '30',
      10,
    );
  }

  async findAllChats(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.aiChat.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.aiChat.count({ where: { userId } }),
    ]);
    return { data, total, page, limit };
  }

  async createChat(userId: number, title: string) {
    return this.prisma.aiChat.create({
      data: { userId, title },
    });
  }

  async findChatById(userId: number, chatId: number) {
    const chat = await this.prisma.aiChat.findFirst({
      where: { id: chatId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { images: true },
        },
      },
    });
    if (!chat) throw new NotFoundException('Chat not found');
    return chat;
  }

  async sendMessage(
    userId: number,
    chatId: number,
    text: string,
    ip: string,
    images?: Express.Multer.File[],
  ) {
    const chat = await this.prisma.aiChat.findFirst({
      where: { id: chatId, userId },
    });
    if (!chat) throw new NotFoundException('Chat not found');

    await this.checkRateLimit(userId, ip);

    const imageUrls: string[] = [];
    if (images?.length) {
      for (const file of images) {
        const ext = path.extname(file.originalname) || '.jpg';
        const folder = `ai-chat/${userId}`;
        const fileName = `${uuidv4()}${ext}`;
        file.originalname = fileName;
        const url = await this.minio.uploadFile(file, folder);
        imageUrls.push(url);
      }
    }

    const userMessage = await this.prisma.aiMessage.create({
      data: {
        chatId,
        role: 'user',
        messageText: text,
        images: imageUrls.length
          ? { create: imageUrls.map((url) => ({ imageUrl: url })) }
          : undefined,
      },
      include: { images: true },
    });

    const history = await this.prisma.aiMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'You are a professional football coach assistant. Help users with training advice, tactics, player development, and football knowledge.',
      },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.messageText,
      })),
    ];

    let assistantText: string;
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
      });
      assistantText = completion.choices[0]?.message?.content || '';
    } catch (err) {
      this.logger.error('OpenAI API error', err);
      throw new HttpException(
        'AI service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const assistantMessage = await this.prisma.aiMessage.create({
      data: {
        chatId,
        role: 'assistant',
        messageText: assistantText,
      },
    });

    await this.prisma.aiChat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    this.sendNotification(userId, chatId).catch(() => {});

    return { userMessage, assistantMessage };
  }

  async deleteChat(userId: number, chatId: number) {
    const chat = await this.prisma.aiChat.findFirst({
      where: { id: chatId, userId },
    });
    if (!chat) throw new NotFoundException('Chat not found');

    await this.prisma.aiChat.delete({ where: { id: chatId } });
    return { deleted: true };
  }

  private async checkRateLimit(userId: number, ip: string) {
    const normalizedIp = ip || '0.0.0.0';
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const rateLimit = await this.prisma.aiRateLimit.findUnique({
      where: { userId_ipAddress: { userId, ipAddress: normalizedIp } },
    });

    if (rateLimit) {
      if (rateLimit.lastRequest > oneHourAgo) {
        if (rateLimit.requestCount >= this.rateLimitMax) {
          throw new HttpException(
            'Rate limit exceeded. Try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        await this.prisma.aiRateLimit.update({
          where: { id: rateLimit.id },
          data: {
            requestCount: { increment: 1 },
            lastRequest: new Date(),
          },
        });
      } else {
        await this.prisma.aiRateLimit.update({
          where: { id: rateLimit.id },
          data: { requestCount: 1, lastRequest: new Date() },
        });
      }
    } else {
      await this.prisma.aiRateLimit.create({
        data: { userId, ipAddress: normalizedIp, requestCount: 1 },
      });
    }
  }

  private async sendNotification(userId: number, chatId: number) {
    try {
      await this.notificationService.sendToUser(userId, {
        title: 'AI Coach',
        body: 'You have a new reply from AI Coach',
        type: 'AI_CHAT',
        data: { chatId: String(chatId) },
      });
    } catch (err) {
      this.logger.warn('Failed to send AI_CHAT notification', err);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async resetRateLimits() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await this.prisma.aiRateLimit.deleteMany({
      where: { lastRequest: { lt: oneHourAgo } },
    });
  }
}
