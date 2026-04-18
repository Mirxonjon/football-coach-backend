import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn().mockResolvedValue({ message: 'OTP sent' }),
      verifyOtpForRegistration: jest.fn().mockResolvedValue({ registrationToken: 'token' }),
    };

    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register (send OTP)', async () => {
    const dto = { phone: '+998901234567', password: 'password123', firstName: 'John' };
    const result = await controller.register(dto as any);
    
    expect(service.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'OTP sent' });
  });
  
  it('should verify OTP and return registrationToken', async () => {
    const dto = { phone: '+998901234567', code: '123456' };
    const req = { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } };
    
    const result = await controller.verifyOtp(dto, req as any);
    
    expect(service.verifyOtpForRegistration).toHaveBeenCalledWith(dto, { ip: '127.0.0.1', userAgent: 'jest' });
    expect(result).toEqual({ registrationToken: 'token' });
  });
});
