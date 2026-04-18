import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { FirebaseAdminService } from './firebase-admin.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import * as admin from 'firebase-admin';

export type NotificationPayload = {
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseAdminService,
  ) {}

  private toMessagingData(
    data?: Record<string, any>,
  ): Record<string, string> | undefined {
    if (!data) return undefined;
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [String(k), String(v ?? '')]),
    );
  }

  // ─── Device management ───

  async registerDevice(userId: number, fcmToken: string, deviceType: string) {
    return this.prisma.userDevice.upsert({
      where: { deviceToken: fcmToken },
      update: { userId, platform: deviceType, isActive: true },
      create: {
        userId,
        deviceToken: fcmToken,
        platform: deviceType,
        isActive: true,
      },
    });
  }

  async removeDeviceById(userId: number, id: number) {
    const device = await this.prisma.userDevice.findUnique({ where: { id } });
    if (!device || device.userId !== userId) {
      throw new NotFoundException('Device not found');
    }
    await this.prisma.userDevice.delete({ where: { id } });
    return { success: true };
  }

  // ─── Notification queries ───

  async listMy(userId: number, query: NotificationQueryDto) {
    const { type, unread, cursor, limit = 20 } = query;

    const where: any = { userId };
    if (type) where.type = type;
    if (unread === true) where.isRead = false;

    const items = await this.prisma.notification.findMany({
      where: {
        ...where,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { id: 'desc' },
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  async markRead(userId: number, id: number) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // ─── Push sending (used by other modules) ───

  async sendToUser(userId: number, payload: NotificationPayload) {
    const devices = await this.prisma.userDevice.findMany({
      where: { userId, isActive: true },
      select: { deviceToken: true },
    });

    await this.prisma.notification.create({
      data: {
        userId,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        data: payload.data as any,
      },
    });

    if (devices.length === 0) return { success: true, sent: 0 };

    const tokens = devices.map((d) => d.deviceToken);
    const res = await this.sendMulticast(
      tokens,
      payload.title,
      payload.body,
      payload.data,
    );
    return { success: true, sent: res?.successCount ?? 0 };
  }

  async sendToMany(userIds: number[], payload: NotificationPayload) {
    const devices = await this.prisma.userDevice.findMany({
      where: { userId: { in: userIds }, isActive: true },
      select: { deviceToken: true },
    });

    await this.prisma.$transaction(
      userIds.map((uid) =>
        this.prisma.notification.create({
          data: {
            userId: uid,
            title: payload.title,
            body: payload.body,
            type: payload.type,
            data: payload.data as any,
          },
        }),
      ),
    );

    if (devices.length === 0) return { success: true, sent: 0 };

    const tokens = devices.map((d) => d.deviceToken);
    const res = await this.sendMulticast(
      tokens,
      payload.title,
      payload.body,
      payload.data,
    );
    return { success: true, sent: res?.successCount ?? 0 };
  }

  async broadcast(payload: NotificationPayload) {
    const devices = await this.prisma.userDevice.findMany({
      where: { isActive: true },
      select: { deviceToken: true, userId: true },
    });

    const uniqueUserIds = [...new Set(devices.map((d) => d.userId))];

    await this.prisma.$transaction(
      uniqueUserIds.map((uid) =>
        this.prisma.notification.create({
          data: {
            userId: uid,
            title: payload.title,
            body: payload.body,
            type: payload.type,
            data: payload.data as any,
          },
        }),
      ),
    );

    if (devices.length === 0) return { success: true, sent: 0 };

    const tokens = devices.map((d) => d.deviceToken);
    const res = await this.sendMulticast(
      tokens,
      payload.title,
      payload.body,
      payload.data,
    );
    return { success: true, sent: res?.successCount ?? 0 };
  }

  // ─── FCM transport ───

  private async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    if (!this.firebase.messaging) {
      this.logger.warn('Firebase not initialized — push skipped');
      return null;
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: { title, body },
        data: this.toMessagingData(data),
        android: { notification: { sound: 'default' } },
        apns: { payload: { aps: { sound: 'default' } } },
      };

      const response =
        await this.firebase.messaging.sendEachForMulticast(message);

      if (response.failureCount > 0) {
        await this.deactivateInvalidTokens(tokens, response.responses);
      }

      return response;
    } catch (e: any) {
      this.logger.error('Multicast send error', e?.message);
      return null;
    }
  }

  private async deactivateInvalidTokens(
    tokens: string[],
    responses: admin.messaging.SendResponse[],
  ) {
    for (let i = 0; i < responses.length; i++) {
      const resp = responses[i];
      if (resp.success) continue;

      const code = (resp.error as any)?.code as string | undefined;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        try {
          await this.prisma.userDevice.update({
            where: { deviceToken: tokens[i] },
            data: { isActive: false },
          });
        } catch {}
      }
    }
  }
}
