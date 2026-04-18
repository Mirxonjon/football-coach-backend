# Test Status — Per Module Coverage Tracker

> Updated: 2026-04-19 | Target: lines ≥70%, branches ≥60%

## Summary

| Module / Area | Spec File | Tests | Status |
|---|---|---|---|
| **common/filter** | `all-exceptions.filter.spec.ts` | 5 | ✅ |
| **common/interceptors** | `response.interceptor.spec.ts` | 2 | ✅ |
| **auth** | `auth.controller.spec.ts` | 7 | ✅ |
| **users** | `users.service.spec.ts` | 3 | ✅ |
| notification | — | 0 | ⏳ Phase 2 branch |
| subscription-plan | — | 0 | ⏳ Phase 3 branch |
| books | — | 0 | ⏳ Phase 3 branch |
| training | — | 0 | ⏳ Phase 3 |
| ai-chat | — | 0 | ⏳ Phase 3 |
| payments / wallet | — | 0 | ⏳ Phase 3 |
| legal | — | 0 | 🔲 Needs spec |
| prisma | — | N/A | Wrapper only |
| telegram | — | 0 | 🔲 Needs spec |

## QA Hardening Checklist

- [x] `ValidationPipe` — `whitelist: true`, `forbidNonWhitelisted: true`
- [x] `AllExceptionFilter` — returns `{ error: { code, message, details? } }` per API surface spec
- [x] `@nestjs/throttler` installed and configured globally (short/medium/long tiers)
- [x] Auth endpoints rate-limited: `register` 5/min, `verify-otp` 10/min, `refresh` 10/min
- [x] Jest `moduleNameMapper` added for `@/` path alias
- [x] 18 tests passing (4 suites)

## Coverage Gaps (to be addressed as Phase 3 modules land)

- Auth service (complex OTP/token logic) needs dedicated service-level specs
- AI chat endpoints need throttler once module exists
- E2E tests not yet written (blocked on DB fixture setup)

## How to run

```bash
npm test                      # all specs
npm test -- --coverage        # with coverage report
npm test -- path/to/file.spec.ts  # single file
```
