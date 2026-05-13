import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Standard envelope: `{ status_code, data, [meta] }`.
 *
 * Convention: a service that returns pagination uses the exact shape
 * `{ data: [...], meta: {...} }`. The interceptor recognises that pair and
 * hoists `meta` to the top level so the frontend gets:
 *   { status_code, data: [...], meta: {...} }
 * instead of `data` being nested twice.
 *
 * Services with `all=true` style "no-meta" responses return `{ data: [...] }`
 * (no `meta`) — which is also recognised and unwrapped to top-level `data`.
 *
 * Any other return shape is wrapped untouched into `data` (backwards-compat).
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((value) => {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse();
        const status_code = response.statusCode;

        if (isPaginatedShape(value)) {
          const v = value as { data: unknown; meta?: unknown };
          const envelope: Record<string, unknown> = {
            status_code,
            data: v.data,
          };
          if ('meta' in v) envelope.meta = v.meta;
          return envelope;
        }

        return { status_code, data: value };
      }),
    );
  }
}

/**
 * Recognise the exact opt-in shape used by paginated services:
 *   { data: <array>, meta?: <object> }
 *
 * Strict guard prevents accidental unwrapping of unrelated payloads that just
 * happen to contain a `data` field.
 */
function isPaginatedShape(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.data)) return false;
  if ('meta' in v) {
    if (!v.meta || typeof v.meta !== 'object') return false;
    const m = v.meta as Record<string, unknown>;
    return 'total' in m && 'page' in m && 'limit' in m;
  }
  // `{ data: [...] }` without meta is fine — typical for `all=true` responses.
  return true;
}
