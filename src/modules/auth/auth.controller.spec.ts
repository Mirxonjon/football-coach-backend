import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  phoneRequestOtp: jest.fn(),
  phoneVerifyOtp: jest.fn(),
  emailRegister: jest.fn(),
  emailLogin: jest.fn(),
  googleAuth: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
};

const mockReq: any = {
  ip: '127.0.0.1',
  headers: { 'user-agent': 'jest' },
  user: { sub: 1 },
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('POST /auth/phone/request-otp', async () => {
    mockAuthService.phoneRequestOtp.mockResolvedValue({ ttlSec: 300 });
    const result = await controller.phoneRequestOtp({ phone: '+998901234567' });
    expect(result).toEqual({ ttlSec: 300 });
    expect(mockAuthService.phoneRequestOtp).toHaveBeenCalledWith({ phone: '+998901234567' });
  });

  it('POST /auth/phone/verify-otp', async () => {
    const tokens = { accessToken: 'a', refreshToken: 'r', user: { id: 1 } };
    mockAuthService.phoneVerifyOtp.mockResolvedValue(tokens);
    const result = await controller.phoneVerifyOtp({ phone: '+998901234567', code: '12345' }, mockReq);
    expect(result).toEqual(tokens);
  });

  it('POST /auth/email/register', async () => {
    const tokens = { accessToken: 'a', refreshToken: 'r', user: { id: 1 } };
    mockAuthService.emailRegister.mockResolvedValue(tokens);
    const dto = { email: 'a@b.com', password: 'Pass1234', firstName: 'A', lastName: 'B' };
    const result = await controller.emailRegister(dto, mockReq);
    expect(result).toEqual(tokens);
  });

  it('POST /auth/email/login', async () => {
    const tokens = { accessToken: 'a', refreshToken: 'r', user: { id: 1 } };
    mockAuthService.emailLogin.mockResolvedValue(tokens);
    const result = await controller.emailLogin({ email: 'a@b.com', password: 'Pass1234' }, mockReq);
    expect(result).toEqual(tokens);
  });

  it('POST /auth/google', async () => {
    const tokens = { accessToken: 'a', refreshToken: 'r', user: { id: 1 } };
    mockAuthService.googleAuth.mockResolvedValue(tokens);
    const result = await controller.googleAuth({ idToken: 'tok' }, mockReq);
    expect(result).toEqual(tokens);
  });

  it('POST /auth/refresh', async () => {
    const tokens = { accessToken: 'a', refreshToken: 'r', expiresIn: 900 };
    mockAuthService.refresh.mockResolvedValue(tokens);
    const result = await controller.refresh({ refreshToken: 'old' }, mockReq);
    expect(result).toEqual(tokens);
  });

  it('POST /auth/logout returns 204', async () => {
    mockAuthService.logout.mockResolvedValue(undefined);
    await controller.logout(mockReq);
    expect(mockAuthService.logout).toHaveBeenCalledWith(1);
  });

  it('POST /auth/password/forgot', async () => {
    mockAuthService.forgotPassword.mockResolvedValue(undefined);
    await controller.forgotPassword({ email: 'a@b.com' });
    expect(mockAuthService.forgotPassword).toHaveBeenCalledWith({ email: 'a@b.com' });
  });

  it('POST /auth/password/reset', async () => {
    mockAuthService.resetPassword.mockResolvedValue(undefined);
    await controller.resetPassword({ token: 'tok', newPassword: 'NewPass1' });
    expect(mockAuthService.resetPassword).toHaveBeenCalledWith({ token: 'tok', newPassword: 'NewPass1' });
  });
});
