import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseType } from '@/types/global';

@Injectable()
export class HttpExceptionInterceptor<T> implements NestInterceptor {
  private logger = new Logger(HttpExceptionInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<ApiResponseType<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    this.logger.debug(`Processing ${request.method} ${request.url}`);

    return next.handle().pipe(
      map((data) => {
        const status = response?.status_code || HttpStatus.OK;

        if (data?.error) {
          return {
            status: data.error.code,
            result: null,
            error: {
              message:
                typeof data.error.error == 'object'
                  ? data.error.error[0]
                  : data.error.error,
            },
          };
        }

        return {
          status,
          result: data,
          error: null,
        };
      }),
      catchError((error) => {
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        this.logger.error(
          `Status: ${status} Error: ${error.message}`,
          error.stack
        );

        return throwError(() => ({
          status,
          result: null,
          error: {
            message: error.message,
          },
        }));
      })
    );
  }
}
