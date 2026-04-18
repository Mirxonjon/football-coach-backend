# API SURFACE — Endpoints the new backend must expose

> Swagger is the source of truth at runtime. This file is the design reference for reviews and tests. Paths follow REST conventions; all are prefixed with `/api/v1` unless noted.

## Auth

| Method | Path | Auth | Role | Body / Query | Returns |
|--------|------|------|------|--------------|---------|
| POST | `/auth/phone/request-otp` | public | — | `{ phone }` | `{ ttlSec }` |
| POST | `/auth/phone/verify-otp` | public | — | `{ phone, code }` | `{ accessToken, refreshToken, user }` |
| POST | `/auth/email/register` | public | — | `{ email, password, firstName, lastName }` | 201 + tokens |
| POST | `/auth/email/login` | public | — | `{ email, password }` | tokens + user |
| POST | `/auth/google` | public | — | `{ idToken }` | tokens + user |
| POST | `/auth/refresh` | public | — | `{ refreshToken }` | new tokens |
| POST | `/auth/logout` | JWT | — | — | 204 |
| POST | `/auth/password/forgot` | public | — | `{ email }` | 204 |
| POST | `/auth/password/reset` | public | — | `{ token, newPassword }` | 204 |

## Users

| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|
| GET | `/users/me` | JWT | USER | User DTO without password/googleId |
| PATCH | `/users/me` | JWT | USER | `{ firstName?, lastName?, birthDate?, avatarUrl? }` |
| GET | `/admin/users` | JWT | ADMIN | paginated, `?search=&isActive=` |
| GET | `/admin/users/:id` | JWT | ADMIN | full user |
| PATCH | `/admin/users/:id` | JWT | ADMIN | set isActive, role |
| DELETE | `/admin/users/:id` | JWT | ADMIN | soft-delete via isActive=false (no hard delete for audit) |

## Devices

| Method | Path | Auth | Body | Notes |
|--------|------|------|------|-------|
| POST | `/devices` | JWT | `{ fcmToken, deviceType }` | upsert by fcmToken |
| DELETE | `/devices/:id` | JWT | — | delete |

## Notifications

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/notifications` | JWT | `?type=&unread=&cursor=` paginated |
| PATCH | `/notifications/:id/read` | JWT | mark read |
| PATCH | `/notifications/read-all` | JWT | mark all read |

## Subscription Plans + Subscriptions

| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|
| GET | `/plans` | public | — | list active plans |
| GET | `/plans/:id` | public | — | |
| POST | `/admin/plans` | JWT | ADMIN | create |
| PATCH | `/admin/plans/:id` | JWT | ADMIN | update |
| DELETE | `/admin/plans/:id` | JWT | ADMIN | soft delete via `isActive=false` |
| GET | `/subscriptions/me` | JWT | USER | active + history |
| POST | `/subscriptions/me` | JWT | USER | `{ planId, cardId? }` → starts PENDING WalletTransaction |

## Payments

| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|
| GET | `/cards` | JWT | USER | list user's cards |
| POST | `/cards` | JWT | USER | `{ token, last4 }` |
| DELETE | `/cards/:id` | JWT | USER | |
| GET | `/wallet/transactions` | JWT | USER | own tx paginated |
| POST | `/wallet/transactions/:id/confirm` | JWT | ADMIN | webhook/manual: `{ status, externalId?, errorCode?, errorMessage? }` |

## Books + User books + Progress

| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|
| GET | `/book-categories` | public | — | |
| GET | `/books` | public | — | `?categoryId=&search=` |
| GET | `/books/:id` | public | — | |
| POST | `/admin/books` | JWT | ADMIN | create |
| PATCH | `/admin/books/:id` | JWT | ADMIN | |
| DELETE | `/admin/books/:id` | JWT | ADMIN | |
| POST | `/admin/book-categories` | JWT | ADMIN | |
| PATCH | `/admin/book-categories/:id` | JWT | ADMIN | |
| DELETE | `/admin/book-categories/:id` | JWT | ADMIN | |
| GET | `/me/books` | JWT | USER | owned books |
| POST | `/me/books/:bookId/purchase` | JWT | USER | `{ cardId? }` → PENDING tx |
| GET | `/me/books/:bookId/progress` | JWT | USER | |
| PATCH | `/me/books/:bookId/progress` | JWT | USER | `{ lastPageRead }` |

## Training

| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|
| GET | `/age-categories` | public | — | |
| GET | `/training-categories` | public | — | `?ageCategoryId=` |
| GET | `/lessons` | JWT* | USER | `?trainingCategoryId=` — requires active subscription |
| GET | `/lessons/:id` | JWT* | USER | lesson + blocks ordered by `sequenceOrder` |
| POST | `/admin/age-categories` | JWT | ADMIN | |
| PATCH | `/admin/age-categories/:id` | JWT | ADMIN | |
| DELETE | `/admin/age-categories/:id` | JWT | ADMIN | |
| POST | `/admin/training-categories` | JWT | ADMIN | |
| PATCH | `/admin/training-categories/:id` | JWT | ADMIN | |
| DELETE | `/admin/training-categories/:id` | JWT | ADMIN | |
| POST | `/admin/lessons` | JWT | ADMIN | |
| PATCH | `/admin/lessons/:id` | JWT | ADMIN | |
| DELETE | `/admin/lessons/:id` | JWT | ADMIN | |
| POST | `/admin/lessons/:id/blocks` | JWT | ADMIN | create block |
| PATCH | `/admin/blocks/:id` | JWT | ADMIN | |
| DELETE | `/admin/blocks/:id` | JWT | ADMIN | |

\* `JWT*` = authenticated user with active subscription, unless lesson/block is flagged free.

## AI Chat

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/ai/chats` | JWT | paginated |
| POST | `/ai/chats` | JWT | `{ title }` |
| GET | `/ai/chats/:id` | JWT | chat with messages ordered asc |
| POST | `/ai/chats/:id/messages` | JWT | multipart: `text` + optional `images[]` |
| DELETE | `/ai/chats/:id` | JWT | cascade messages |

## Errors

Global shape returned by the `HttpExceptionFilter`:

```json
{
  "error": {
    "code": "string",         // e.g. "AUTH_OTP_EXPIRED"
    "message": "string",      // human-readable
    "details": { }             // optional, object with extra context
  }
}
```

HTTP codes used: 400 bad request, 401 unauthorized, 403 forbidden, 404 not found, 409 conflict, 422 validation, 429 rate limited, 500 server error.
