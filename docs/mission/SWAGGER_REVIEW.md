# Swagger / OpenAPI Review — Phase 4

## Summary

Audited all active controllers and applied consistent Swagger decorators across the codebase.

## Changes Made

### Shared Error Response DTOs (NEW)
- `src/types/global/dto/error-response.dto.ts` — `ErrorResponseDto`, `UnauthorizedResponseDto`, `ForbiddenResponseDto`, `NotFoundResponseDto`
- Matches the `{ status_code, message }` shape returned by `AllExceptionFilter`

### Auth Controller (`src/modules/auth/auth.controller.ts`)
| Before | After |
|--------|-------|
| Missing `@ApiResponse` for error cases | Added 400/401/403/429 responses with typed DTOs |
| Commented-out dead routes cluttered Swagger | Removed dead commented routes (login/password, forgot-password, reset-password, set-password) |
| Unused DTO imports (`SendOtpDto`, `LoginWithPasswordDto`, etc.) | Cleaned up imports |

### Admin Controller (`src/modules/auth/admin.controller.ts`)
| Before | After |
|--------|-------|
| No `@ApiResponse` on any route | Added 200/400/401/403/404/409 responses per route |
| Missing import for `ApiResponse` | Added import |

### Notification Controller (`src/modules/notification/notification.controller.ts`)
| Before | After |
|--------|-------|
| No `@ApiResponse` decorators | Added 200/201/400/401/404 per route |
| `console.log(dto, userId, 'body')` in registerDevice | Removed debug log |
| `@Param('id') id: string` with manual `Number()` cast | Changed to `@Param('id', ParseIntPipe) id: number` |
| Missing `@ApiParam` on `:id` route | Added `@ApiParam` |

### Legal Controller (`src/modules/legal/legal.controller.ts`)
| Before | After |
|--------|-------|
| No `@ApiResponse` decorators | Added 200/201/400/401/403/404 per route |
| Commented-out auth guard on `GET /legal` | Left as-is (public listing is intentional) |
| Redundant `@ApiQuery` decorators duplicating DTO | Removed (DTO `@ApiPropertyOptional` handles Swagger query params) |
| Missing `@ApiParam` on `:id` routes | Added `@ApiParam` |

### Telegram Controller (`src/modules/telegram/telegram.controller.ts`)
| Before | After |
|--------|-------|
| No `@ApiResponse` decorators | Added 200/400/401/403 per route |

## DTO Audit

All request/response DTOs already have `@ApiProperty` / `@ApiPropertyOptional` decorators with examples. No changes needed.

## Consistent Error Shape

All error responses follow the shape from `AllExceptionFilter`:
```json
{
  "status_code": 400,
  "message": "Validation failed"
}
```

## Build Status

`npm run build` — passes cleanly after all changes.
