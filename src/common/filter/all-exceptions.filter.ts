import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal Server Error';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      code = 'RATE_LIMITED';
      message = 'Too many requests, please try again later';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (
        exception instanceof BadRequestException &&
        typeof res !== 'string' &&
        Array.isArray((res as any).message)
      ) {
        code = 'VALIDATION_ERROR';
        message = (res as any).message[0];
        details = { errors: (res as any).message };
      } else {
        message =
          typeof res === 'string'
            ? res
            : Array.isArray((res as any).message)
              ? (res as any).message[0]
              : (res as any).message || 'Bad request';
        code = (typeof res !== 'string' && (res as any).error)
          ? String((res as any).error).toUpperCase().replace(/\s+/g, '_')
          : this.statusToCode(status);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error('Unknown error type:', exception);
    }

    const errorResponse: Record<string, unknown> = {
      error: {
        code,
        message,
        ...(details && { details }),
      },
    };

    response.status(status).json(errorResponse);
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
    };
    return map[status] || 'UNKNOWN_ERROR';
  }
}
