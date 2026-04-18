import { AllExceptionFilter } from './all-exceptions.filter';
import {
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

describe('AllExceptionFilter', () => {
  let filter: AllExceptionFilter;
  let mockResponse: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new AllExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({}),
      }),
    };
  });

  it('should return API surface error shape', () => {
    const exception = new NotFoundException('User not found');
    filter.catch(exception, mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message', 'User not found');
  });

  it('should handle validation errors with details', () => {
    const exception = new BadRequestException({
      message: ['email must be an email', 'name should not be empty'],
      error: 'Bad Request',
    });
    filter.catch(exception, mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toBeDefined();
    expect(body.error.details.errors).toHaveLength(2);
  });

  it('should handle 401', () => {
    filter.catch(new UnauthorizedException(), mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should handle 403', () => {
    filter.catch(new ForbiddenException(), mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('should handle unknown errors as 500', () => {
    filter.catch(new Error('boom'), mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
