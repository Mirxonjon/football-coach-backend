# MIGRATION PLAN — Phase-by-phase

> Phases are strictly ordered. Do not open a phase until the previous one's exit criteria are met. Sage gates each phase.

## Phase 0 — Alignment (½ day, no code)

**Owner:** Sage. **Participants:** all leaders.

- Read `00_MISSION_BRIEF.md` and `01_SCHEMA.md`.
- Clarify any schema ambiguity with Sage; Sage updates `01_SCHEMA.md` if needed.
- Leaders confirm their module ownership in `02_AGENT_ASSIGNMENTS.md` and fork subtasks for their juniors/seniors.

**Exit:** every leader has opened at least one subtask for their team inside Claw Empire.

---

## Phase 1 — Demolition & Schema

**Owners:** Aria (dev leader), Vault (devsecops), Bolt (senior dev).

### 1.1 Delete obsolete code (Bolt)
Delete, do not comment out, from `src/modules/`:
- `click/`
- `fuel-pump/`, `fuel-pump-fuel/`, `fuel-pump-status-log/`
- `fuel-session/`, `fuel-station/`, `fuel-station-like/`, `fuel-type/`
- `legal/` (if it's fuel-station specific — Sage confirm)
- `ocpp/`
- `operator/`, `operator-payout/`
- `vehicle/`
- `telegram/` (only if strictly tied to fuel-station flows — otherwise keep and re-scope)

Also delete related:
- References in `app.module.ts` imports
- Seed data in `prisma/seed.ts` that references deleted models
- Any leftover test specs

Keep, but expect re-shape in later phases: `auth/`, `users/`, `notification/`, `socket/`, `prisma/`.

### 1.2 Rewrite `prisma/schema.prisma` (Aria + Bolt)
- Replace the entire `schema.prisma` with models defined in `01_SCHEMA.md`.
- Keep `generator client` and the `postgresql` datasource.
- Drop the `migrations/` folder entirely (we are re-baselining).
- Run `npx prisma format` — must be clean.
- Run `npx prisma migrate dev --name init_football_coach` against a fresh local DB.
- Run `npx prisma generate` — must succeed.

### 1.3 Migration safety review (Vault)
- Confirm indexes on all FKs.
- Confirm cascade rules are intentional (User deletion cascades to their data; Book/Plan deletion must **not** cascade transactions — keep historical).
- Verify no PII is stored in clear (password, OTP, refresh tokens).

**Exit:** fresh `npm install`, fresh DB, `prisma migrate dev` succeeds, `prisma generate` succeeds, `npm run build` passes.

---

## Phase 2 — Core platform modules

**Owner:** Aria. Runs in parallel across Bolt/Nova/Pipe.

### 2.1 Auth (Bolt + Pipe)
- Endpoints:
  - `POST /auth/phone/request-otp`
  - `POST /auth/phone/verify-otp`
  - `POST /auth/email/register`, `POST /auth/email/login`
  - `POST /auth/google` (ID-token verification)
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `POST /auth/password/forgot`
  - `POST /auth/password/reset`
- JWT access (15 min) + refresh (30 days, stored hashed in `Session`).
- OTP codes are stored hashed; expire in 5 minutes; max 5 attempts per phone per hour.
- Google: verify ID token via `google-auth-library`, upsert `User.googleId`.
- Guards: `JwtAuthGuard`, `RolesGuard` with `@Roles('ADMIN')`.

### 2.2 Users (Bolt)
- `GET /users/me`, `PATCH /users/me`.
- `GET /admin/users`, `PATCH /admin/users/:id`, `DELETE /admin/users/:id` (ADMIN only).
- Returns DTO excluding `password`, `googleId`.

### 2.3 Notifications + Devices (Nova, assisted by Pipe)
- `POST /devices` — upsert FCM token for current user.
- `DELETE /devices/:id`.
- `GET /notifications?type=...&unread=1` — paginated, ordered by `createdAt desc`.
- `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`.
- Internal `NotificationService.sendToUser(userId, payload)` fans out via FCM to active devices and stores the row.

**Exit:** phone-OTP login round-trip works locally; JWT refresh rotates; admin can read user list; a manual test FCM push reaches a stubbed device.

---

## Phase 3 — Domain modules

**Owner:** Aria. Dependencies: Phase 2 complete.

### 3.1 Subscriptions + Plans (Bolt)
- Public: `GET /plans`, `GET /plans/:id`.
- User: `GET /subscriptions/me`, `POST /subscriptions/me` (initiates purchase → creates `WalletTransaction` in PENDING, returns provider checkout info).
- Admin: CRUD over `SubscriptionPlan`.
- Service computes active subscription window from `Subscription.startDate/endDate` + `isActive`.

### 3.2 Payments (Bolt + Pipe)
- `GET /cards`, `POST /cards` (saves provider token only), `DELETE /cards/:id`.
- `GET /wallet/transactions` — paginated.
- `POST /wallet/transactions/:id/confirm` (admin/webhook endpoint) — transitions PENDING → SUCCESS/FAILED and, on SUCCESS, either creates Subscription or creates UserBook depending on what the tx is for.
- Provider adapters live in `src/modules/payments/providers/` — stub one provider (`internal`) that always returns SUCCESS for dev.
- **Never log the full card token or the raw PAN.** Vault will code-review.

### 3.3 Books (Nova)
- Public: `GET /books?category=...`, `GET /books/:id`.
- Admin: CRUD on Book + BookCategory.
- User: `GET /me/books`, `POST /me/books/:id/purchase` (creates WalletTransaction PENDING for the book), `GET /me/books/:id/progress`, `PATCH /me/books/:id/progress` (update `lastPageRead`, set `isCompleted` when equal to last page).

### 3.4 Training (Nova)
- Public: `GET /age-categories`, `GET /training-categories?ageCategoryId=`, `GET /lessons?trainingCategoryId=`, `GET /lessons/:id` (returns lesson + ordered blocks).
- Admin: CRUD on AgeCategory, TrainingCategory, TrainingLesson, LessonBlock.
- Access control: all reads require active `Subscription` unless the lesson is flagged free (add `isFree Boolean @default(false)` on TrainingLesson via a mini-migration — log in `01_SCHEMA.md` after Sage approves).

### 3.5 AI Chat (Bolt + Pipe)
- `GET /ai/chats`, `POST /ai/chats` (creates empty chat), `GET /ai/chats/:id` (chat + messages).
- `POST /ai/chats/:id/messages` — accepts text and optional image uploads (MinIO), writes `AiMessage(role=user)`, calls OpenAI, writes `AiMessage(role=assistant)`, notifies via `NotificationService` with type `AI_CHAT`.
- Rate limiting: per `(userId, ip)` — 30 messages per hour (configurable via env). Store counts in `AiRateLimit`, reset via a scheduled job (`@nestjs/schedule`) every hour.
- Images stored in MinIO under `ai-chat/<userId>/<uuid>.<ext>`; URLs saved in `AiMessageImage`.

**Exit:** all endpoints above return 200 with valid JSON in Swagger; Jest specs for happy paths pass for each module; a subscribed user can list lessons, read a book, chat with AI.

---

## Phase 4 — Hardening

**Owner:** Hawk (QA) + Vault (security) + Atlas (ops).

- Test coverage: lines ≥ 70%, branches ≥ 60% across the new modules (Hawk tracks in `TEST_STATUS.md`).
- Swagger: every route has description, request body example, response schema, error codes (Pixel).
- Error shape: every controller uses a global `HttpExceptionFilter` returning `{ error: { code, message, details? } }` (Aria).
- Validation: every DTO uses `class-validator`; `main.ts` registers a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` (Bolt).
- Security: `helmet()` enabled, CORS locked to env-configured origins, rate limiting via `@nestjs/throttler` on auth and AI endpoints (Vault).
- Logging: structured JSON logger (Pino) with request IDs; secrets redacted (Pipe).

**Exit:** CI matrix passes (lint + build + test); Swagger manually reviewed; Vault signs off.

---

## Phase 5 — Deployment readiness

**Owner:** Atlas.

- `Dockerfile` re-validated for Node 20 LTS; multi-stage build.
- `docker-compose.yml` spins up: `api`, `postgres`, `minio` (with healthchecks).
- `.env.example` documents every required env var: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `OTP_SALT`, `GOOGLE_CLIENT_ID`, `MINIO_*`, `FIREBASE_*`, `OPENAI_API_KEY`.
- `README.md` rewritten: product description, local setup in 5 commands, scripts table, environment reference.

**Exit:** `docker compose up --build` starts the stack; health endpoint `/health` returns ok; fresh seed runs inside the container.

---

## Reporting cadence

- Sage posts `docs/mission/REPORT_<date>.md` at end of each working block with: completed items, next items, blockers, agents needing attention.
- Hawk updates `TEST_STATUS.md` after each phase gate.
- Vault posts `docs/mission/SECURITY_NOTES.md` with any issues found during reviews.
