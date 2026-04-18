# Security Review — Phase 4

**Date:** 2026-04-19  
**Reviewer:** Vault (DevSecOps)  
**Scope:** Auth, Payments (Click), AI config, global middleware

---

## CRITICAL — Fixed

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `auth.service.ts:175` | `console.log(dto.password, user.password)` — plaintext password + hash logged | Removed |
| 2 | `sms.service.ts:20` | `console.log(email, password)` — Eskiz SMS provider credentials logged | Removed |
| 3 | `auth.guard.ts:59` | `console.log(payload, token)` — raw JWT logged on every authenticated request | Removed |
| 4 | `click.service.ts:312` | Auth headers + card_token logged in Click payment request | Redacted to URL-only log |
| 5 | `click.service.ts:320-322` | `console.log(data)` — full Click payment response logged | Removed |
| 6 | `click.service.ts:205` | Full card registration response JSON logged | Redacted to error_code only |
| 7 | `sms.service.ts:84,91` | Debug `console.log` of phone numbers | Removed |

## HIGH — Fixed

| # | File | Issue | Fix |
|---|------|-------|-----|
| 8 | `otp.service.ts:40` | OTP codes stored **plaintext** in DB | Now bcrypt-hashed (cost 10); verify uses `bcrypt.compare` |
| 9 | `otp.service.ts:32` | Hardcoded test backdoor: phone `+998987654321` always gets OTP `12345` | Removed entirely |
| 10 | `app.config.ts:16` | CORS fallback `'*'` with `credentials: true` | Changed default to `http://localhost:3000` |

## MEDIUM — Warning Only (no code changes)

| # | File | Issue | Recommendation |
|---|------|-------|----------------|
| 11 | `app.config.ts:83` | `JWT_SECRET_KEY` falls back to `'secret-key'` | Remove fallback; crash on missing secret in production |
| 12 | `app.config.ts:33-34` | MinIO `accessKey`/`secretKey` fall back to `'admin'` | Remove fallback or use env-only |
| 13 | `click.service.ts:214-222` | Card tokens stored plaintext in `Card.token` column | Encrypt at rest (AES-256) or use Click's vault reference instead |
| 14 | `app.module.ts` | No global `APP_GUARD` for `AuthGuard` — easy to forget auth on new routes | Register `AuthGuard` globally + use `@Public()` decorator for open routes |
| 15 | `auth.service.ts:141-155` | In-memory rate limiter (`loginRateMap`) resets on restart, not cluster-safe | Add `@nestjs/throttler` with Redis store |
| 16 | `app.module.ts` | No `ThrottlerModule` — no global rate limiting | Install `@nestjs/throttler`, register globally, apply stricter limits on auth + payment endpoints |

## LOW — Warning Only

| # | File | Issue | Recommendation |
|---|------|-------|----------------|
| 17 | `app.config.ts:90` | Proxy token falls back to `'token'` | Remove fallback |
| 18 | AI config | `openAIConfig` loaded but no AI module exists yet | When implemented: sanitize prompts, never interpolate user input directly, load key from env only (already configured) |

---

## Summary

- **7 critical credential/secret logging vulnerabilities** removed
- **OTP codes** now hashed with bcrypt before DB storage; backdoor test number removed
- **CORS** no longer falls back to wildcard
- **6 medium/low** items flagged as warnings for follow-up hardening
