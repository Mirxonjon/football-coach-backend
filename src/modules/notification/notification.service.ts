import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { FirebaseAdminService } from './firebase-admin.service';
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
    private readonly firebase: FirebaseAdminService
  ) { }

  // Helper: structured logging wrappers to ensure JSON-like output
  private log(payload: Record<string, any>) {
    this.logger.log(payload as any);
  }
  private warn(payload: Record<string, any>) {
    this.logger.warn(payload as any);
  }
  private error(payload: Record<string, any>) {
    this.logger.error(payload as any);
  }
  private debug(payload: Record<string, any>) {
    this.logger.debug(payload as any);
  }

  // Helper: normalize data to string key/value pairs as required by FCM
  private toMessagingData(
    data?: Record<string, any>
  ): Record<string, string> | undefined {
    if (!data) return undefined;
    const entries = Object.entries(data).map(([k, v]) => [
      String(k),
      String(v ?? ''),
    ]);
    return Object.fromEntries(entries);
  }

  async registerDevice(userId: number, deviceToken: string, platform: string) {
    this.log({ action: 'REGISTER_DEVICE', userId, platform });
    try {
      const result = await this.prisma.userDevice.upsert({
        where: { deviceToken },
        update: { userId, platform, isActive: true },
        create: { userId, deviceToken, platform, isActive: true },
      });

      this.log({
        action: 'REGISTER_DEVICE_COMPLETED',
        userId,
        platform,
        deviceToken,
      });
      return result;
    } catch (e: any) {
      this.error({
        action: 'REGISTER_DEVICE_ERROR',
        userId,
        platform,
        deviceToken,
        error: e?.message,
        stack: e?.stack,
      });
      throw e;
    }
  }

  async removeDevice(userId: number, deviceToken: string) {
    this.log({ action: 'REMOVE_DEVICE', userId });
    try {
      const existing = await this.prisma.userDevice.findUnique({
        where: { deviceToken },
      });

      if (!existing || existing.userId !== userId) {
        this.log({
          action: 'REMOVE_DEVICE_SKIPPED',
          reason: 'NOT_FOUND_OR_MISMATCH',
          userId,
          deviceToken,
        });
        return { success: true } as const;
      }

      await this.prisma.userDevice.update({
        where: { deviceToken },
        data: { isActive: false },
      });
      this.log({ action: 'REMOVE_DEVICE_COMPLETED', userId, deviceToken });
      return { success: true } as const;
    } catch (e: any) {
      this.error({
        action: 'REMOVE_DEVICE_ERROR',
        userId,
        deviceToken,
        error: e?.message,
        stack: e?.stack,
      });
      throw e;
    }
  }

  async sendToUser(userId: number, payload: NotificationPayload) {
    this.log({ action: 'SEND_TO_USER', userId, title: payload.title });
    this.debug({ action: 'SEND_TO_USER_DEBUG', userId, payload });
    const start = Date.now();
    try {
      const devices = await this.prisma.userDevice.findMany({
        where: { userId, isActive: true },
        select: { deviceToken: true },
      });

      const deviceCount = devices.length;
      this.log({ action: 'SEND_TO_USER_DEVICES', userId, deviceCount });

      // await this.prisma.notification.create({
      //   data: {
      //     userId,
      //     title: payload.title,
      //     body: payload.body,
      //     type: payload.type,
      //     data: payload.data as any,
      //   },
      // });

      if (deviceCount === 0) {
        const durationMs = Date.now() - start;
        this.log({
          action: 'SEND_TO_USER_COMPLETED',
          userId,
          durationMs,
          sentCount: 0,
          deviceCount,
        });
        return { success: true, sent: 0 } as const;
      }

      const tokens = devices.map((d) => d.deviceToken);
      const res = await this.sendMulticast(
        tokens,
        payload.title,
        payload.body,
        payload.data
      );
      const sentCount = res?.successCount ?? 0;
      const durationMs = Date.now() - start;
      this.log({
        action: 'SEND_TO_USER_COMPLETED',
        userId,
        durationMs,
        sentCount,
        deviceCount,
      });
      return { success: true, sent: sentCount } as const;
    } catch (e: any) {
      this.error({
        action: 'SEND_TO_USER_ERROR',
        userId,
        error: e?.message,
        stack: e?.stack,
      });
      throw e;
    }
  }

  async sendToMany(userIds: number[], payload: NotificationPayload) {
    this.log({
      action: 'SEND_TO_MANY',
      userCount: userIds.length,
      title: payload.title,
    });
    this.debug({ action: 'SEND_TO_MANY_DEBUG', userIds, payload });
    const start = Date.now();
    try {
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
          })
        )
      );

      const deviceCount = devices.length;
      if (deviceCount === 0) {
        const durationMs = Date.now() - start;
        this.log({
          action: 'SEND_TO_MANY_COMPLETED',
          durationMs,
          sentCount: 0,
          userCount: userIds.length,
          deviceCount,
        });
        return { success: true, sent: 0 } as const;
      }

      const tokens = devices.map((d) => d.deviceToken);
      const res = await this.sendMulticast(
        tokens,
        payload.title,
        payload.body,
        payload.data
      );
      const sentCount = res?.successCount ?? 0;
      const durationMs = Date.now() - start;
      this.log({
        action: 'SEND_TO_MANY_COMPLETED',
        durationMs,
        sentCount,
        userCount: userIds.length,
        deviceCount,
      });
      return { success: true, sent: sentCount } as const;
    } catch (e: any) {
      this.error({
        action: 'SEND_TO_MANY_ERROR',
        userCount: userIds.length,
        error: e?.message,
        stack: e?.stack,
      });
      throw e;
    }
  }

  async broadcast(payload: NotificationPayload) {
    this.log({ action: 'BROADCAST', title: payload.title });
    this.debug({ action: 'BROADCAST_DEBUG', payload });
    const start = Date.now();
    try {
      const devices = await this.prisma.userDevice.findMany({
        where: { isActive: true },
        select: { deviceToken: true, userId: true },
      });

      const totalDevices = devices.length;
      const userIds = devices
        .filter((d) => !!d.userId)
        .map((d) => d.userId!) as number[];
      const uniqueUsers = new Set(userIds);
      const totalUsers = uniqueUsers.size;

      await this.prisma.$transaction(
        Array.from(uniqueUsers).map((uid) =>
          this.prisma.notification.create({
            data: {
              userId: uid,
              title: payload.title,
              body: payload.body,
              type: payload.type,
              data: payload.data as any,
            },
          })
        )
      );

      if (totalDevices === 0) {
        const durationMs = Date.now() - start;
        this.log({
          action: 'BROADCAST_COMPLETED',
          durationMs,
          totalDevices,
          totalUsers,
          successCount: 0,
          failureCount: 0,
        });
        return { success: true, sent: 0 } as const;
      }

      const tokens = devices.map((d) => d.deviceToken);
      const res = await this.sendMulticast(
        tokens,
        payload.title,
        payload.body,
        payload.data
      );
      const durationMs = Date.now() - start;
      const successCount = res?.successCount ?? 0;
      const failureCount = res?.failureCount ?? 0;

      this.log({
        action: 'BROADCAST_COMPLETED',
        durationMs,
        totalDevices,
        totalUsers,
        successCount,
        failureCount,
      });

      return { success: true, sent: successCount } as const;
    } catch (e: any) {
      this.error({
        action: 'BROADCAST_ERROR',
        error: e?.message,
        stack: e?.stack,
      });
      throw e;
    }
  }

  async listMy(userId: number, page = 1, limit = 10) {
    return this.prisma
      .$transaction([
        this.prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.notification.count({ where: { userId } }),
      ])
      .then(([items, total]) => ({ items, total, page, limit }));
  }

  async markRead(userId: number, id: number) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId)
      throw new NotFoundException('Notification not found');
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

  async sendPush(
    token: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ) {
    this.log({ action: 'SEND_PUSH', token, title });
    this.debug({
      action: 'SEND_PUSH_DEBUG',
      token,
      payload: { title, body, data },
    });

    if (!this.firebase.messaging) {
      this.warn({
        action: 'SEND_PUSH_SKIPPED',
        reason: 'FIREBASE_NOT_INITIALIZED',
        token,
      });
      return null;
    }

    try {
      const message: admin.messaging.TokenMessage = {
        token,
        notification: { title, body },
        data: this.toMessagingData(data),
        android: { notification: { sound: 'default' } },
        apns: { payload: { aps: { sound: 'default' } } },
      };

      const response = await this.firebase.messaging.send(message);
      this.log({ action: 'SEND_PUSH_COMPLETED', token, messageId: response });
      return response;
    } catch (e: any) {
      const code = e?.code;
      this.error({
        action: 'SEND_PUSH_ERROR',
        token,
        error: e?.message,
        code,
        stack: e?.stack,
      });
      return null;
    }
  }

  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, any>
  ) {
    this.log({ action: 'SEND_MULTICAST', tokenCount: tokens.length, title });
    this.debug({
      action: 'SEND_MULTICAST_DEBUG',
      tokensPreview: tokens.slice(0, 5),
      payload: { title, body, data },
    });

    if (!this.firebase.messaging) {
      this.warn({
        action: 'SEND_MULTICAST_SKIPPED',
        reason: 'FIREBASE_NOT_INITIALIZED',
        tokenCount: tokens.length,
      });
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

      this.log({
        action: 'SEND_MULTICAST_COMPLETED',
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      if (response.failureCount > 0) {
        await Promise.all(
          response.responses.map(async (resp, idx) => {
            if (resp.success) return;
            const token = tokens[idx];
            const code = (resp.error as any)?.code as string | undefined;
            const message = resp.error?.message;

            this.error({
              action: 'SEND_MULTICAST_ITEM_ERROR',
              token,
              code,
              message,
            });

            if (
              code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token'
            ) {
              try {
                await this.prisma.userDevice.update({
                  where: { deviceToken: token },
                  data: { isActive: false },
                });
                this.warn({ action: 'TOKEN_DEACTIVATED', token, reason: code });
              } catch (dbErr: any) {
                this.error({
                  action: 'TOKEN_DEACTIVATE_DB_ERROR',
                  token,
                  reason: code,
                  error: dbErr?.message,
                  stack: dbErr?.stack,
                });
              }
            }
          })
        );
      }

      return response;
    } catch (e: any) {
      const code = e?.code;
      this.error({
        action: 'SEND_MULTICAST_ERROR',
        error: e?.message,
        code,
        stack: e?.stack,
      });
      return null;
    }
  }
}
