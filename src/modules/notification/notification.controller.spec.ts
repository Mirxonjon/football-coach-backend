import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  beforeEach(async () => {
    const mockNotificationService = {
      registerDevice: jest.fn().mockResolvedValue({ success: true }),
      sendToUser: jest.fn().mockResolvedValue({ success: true }),
    };

    const mockPrismaService = {
      userDevice: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { sub: 1 };
          return true;
        },
      })
      .compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register a device token', async () => {
    const dto = { deviceToken: 'test-device-token', platform: 'ios' };
    const req = { user: { sub: 1 } };
    
    const result = await controller.registerDevice(req, dto as any);
    
    expect(service.registerDevice).toHaveBeenCalledWith(1, 'test-device-token', 'ios');
    expect(result).toEqual({ success: true });
  });

  it('should send a notification to a user', async () => {
    const dto = { userId: 2, title: 'Test', body: 'Test body', type: 'SYSTEM' };
    const result = await controller.sendToUser(dto as any);

    expect(service.sendToUser).toHaveBeenCalledWith(2, {
      title: 'Test',
      body: 'Test body',
      type: 'SYSTEM',
      data: undefined,
    });
    expect(result).toEqual({ success: true });
  });
});
