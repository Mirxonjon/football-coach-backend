import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthController', () => {
  let controller: AuthController;
  const mockAuthService = {
    register: jest.fn().mockResolvedValue({ message: 'OTP sent' }),
    verifyOtpForRegistration: jest.fn().mockResolvedValue({ registrationToken: 'tok' }),
    refresh: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }),
    logout: jest.fn().mockResolvedValue({ message: 'logged out' }),
    getMe: jest.fn().mockResolvedValue({ id: 1, phone: '+998901234567' }),
    updateMe: jest.fn().mockResolvedValue({ id: 1, firstName: 'Test' }),
    getMyCashierStations: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register', async () => {
      const dto = { phone: '+998901234567', firstName: 'A', lastName: 'B' } as any;
      const result = await controller.register(dto);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'OTP sent' });
    });
  });

  describe('verifyOtp', () => {
    it('should call verifyOtpForRegistration', async () => {
      const dto = { phone: '+998901234567', code: '1234' } as any;
      const req = { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any;
      await controller.verifyOtp(dto, req);
      expect(mockAuthService.verifyOtpForRegistration).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh', async () => {
      const dto = { refreshToken: 'rt' } as any;
      const req = { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any;
      await controller.refresh(dto, req);
      expect(mockAuthService.refresh).toHaveBeenCalledWith('rt', {
        ip: '127.0.0.1',
        userAgent: 'jest',
      });
    });
  });

  describe('logout', () => {
    it('should call authService.logout', async () => {
      const req = { user: { sub: 1 }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any;
      await controller.logout(req);
      expect(mockAuthService.logout).toHaveBeenCalledWith(1, {
        ip: '127.0.0.1',
        userAgent: 'jest',
      });
    });
  });

  describe('me', () => {
    it('should return user profile', async () => {
      const req = { user: { sub: 1 } } as any;
      const result = await controller.me(req);
      expect(mockAuthService.getMe).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty('id', 1);
    });
  });

  describe('updateMe', () => {
    it('should update and return profile', async () => {
      const req = { user: { sub: 1 } } as any;
      const dto = { firstName: 'Test' } as any;
      const result = await controller.updateMe(req, dto);
      expect(mockAuthService.updateMe).toHaveBeenCalledWith(1, dto);
      expect(result).toHaveProperty('firstName', 'Test');
    });
  });
});
