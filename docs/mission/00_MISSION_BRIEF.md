# MISSION BRIEF — Football Coach Backend (Pivot from Fuel-Station CRM)

> **READ THIS FIRST. Everything else depends on it.**

## 1. Situation

The codebase at `D:\project 2\shaxsiy-project\football v-2\football-coach-backend` was copy-pasted from a fuel-station / car-wash CRM. The stack is kept on purpose:

- **NestJS 10** (modular monolith, Express adapter)
- **Prisma 5** ORM against **PostgreSQL**
- **Passport / JWT** auth
- **class-validator / class-transformer** for DTOs
- **Swagger** at `/api`
- **MinIO** (object storage), **Firebase Admin** (FCM), **Telegraf** (Telegram bot), **OpenAI** SDK, **Socket.IO**

The **current Prisma models** are about fuel pumps, fuel stations, vehicles, operators, Click/Payme payments, etc. Those models and their NestJS modules are **obsolete** and must be replaced.

## 2. Target — Football Coaching Platform

We are building the backend for a **football coaching e-learning platform**. Users subscribe, buy coaching books, watch training lessons grouped by age category, and chat with an AI coach assistant. Admins manage content.

### Feature pillars

| # | Pillar | What it delivers |
|---|--------|------------------|
| 1 | **Auth & Users** | Phone + OTP, email + Google OAuth, JWT refresh sessions, password reset, roles (`USER`, `ADMIN`). |
| 2 | **Books** | Coaching books catalog, categories (`BOOK`, `KONSPEKT`), discounts, purchase, reading progress. |
| 3 | **Training** | Training lessons grouped by training-category and age-category. Each lesson contains ordered blocks (TITLE/TEXT/VIDEO/IMAGE/FILE/HINT). |
| 4 | **Subscriptions** | Subscription plans with `NONE` / `PERCENTAGE` / `FIXED_PRICE` discount, active periods, renewals. |
| 5 | **Payments** | Saved cards (`Card`), wallet transactions with `PENDING`/`SUCCESS`/`FAILED` status, provider linkage (Click/Payme kept — renamed if needed). |
| 6 | **Notifications** | Per-user notifications with types `SYSTEM`/`LESSON`/`BOOK`/`SUBSCRIPTION`/`AI_CHAT`, FCM push via `user_devices`. |
| 7 | **AI Chat** | Chat sessions, messages (role `user`/`assistant`), optional image attachments, per-user + per-IP rate limiting. |
| 8 | **Admin** | CRUD over books, lessons, plans, notifications, users. Simple dashboard metrics. |

### Target Prisma schema (authoritative)

The canonical schema is defined in [`01_SCHEMA.md`](01_SCHEMA.md). Every model, field, enum and relation listed there must exist in the new `prisma/schema.prisma`.

## 3. Out of scope (DO NOT build)

- Fuel pumps, fuel stations, connectors, OCPP, cashier roles, operator payouts.
- Vehicle / UserCar / FuelSession anything.
- Click / Payme specific fuel-station callbacks (we keep Card/Wallet generic; a dedicated billing provider decision comes later).
- Weaviate / transformers / embeddings (OpenAI direct is enough).
- Telegram bot features that depend on fuel-station flows.

## 4. Definition of Done for the overall mission

- [ ] `prisma/schema.prisma` matches [`01_SCHEMA.md`](01_SCHEMA.md) exactly (names, types, relations, enums, indexes).
- [ ] A fresh migration runs cleanly against an empty Postgres: `npx prisma migrate dev --name init_football_coach`.
- [ ] All modules in `src/modules/` belong to the target feature set listed above. Obsolete modules are deleted, not left orphaned.
- [ ] `package.json` `name` is `football-coach-backend`, description reflects the product.
- [ ] `npm run build` passes with zero TypeScript errors.
- [ ] `npm run lint` passes.
- [ ] Core Jest specs for each new module pass (auth, users, books, training, subscriptions, payments, notifications, ai-chat).
- [ ] Swagger at `/api` shows the full new API surface, grouped by tag per module.
- [ ] `seed.ts` inserts: roles (USER/ADMIN), one admin user, 3 age categories, 2 training categories, 1 sample lesson with all block types, 2 subscription plans, 2 books.

## 5. Working agreements

1. **Never leave the repo in a broken state overnight.** If a task can't complete, open a follow-up task and revert the half-finished work.
2. **Prisma migrations are append-only once merged.** During this mission, squash all migrations into `init_football_coach` — a fresh baseline is expected.
3. **Keep the `crm` package name change in one commit** so it's easy to see.
4. **All new DTOs must use `class-validator`** decorators and be wired to the NestJS `ValidationPipe`.
5. **All new controllers must have Swagger decorators** (`@ApiTags`, `@ApiOperation`, `@ApiResponse`).
6. **Agent ownership** is described in [`02_AGENT_ASSIGNMENTS.md`](02_AGENT_ASSIGNMENTS.md). Leaders may re-delegate; cross-department work goes through Sage (Planning).
7. **Every module must ship with a README** at `src/modules/<module>/README.md` describing its endpoints, DTOs, and dependencies.

## 6. File map of this mission folder

| File | Purpose |
|------|---------|
| `00_MISSION_BRIEF.md` | This file. Why, what, boundaries. |
| `01_SCHEMA.md` | Target Prisma schema — the contract. |
| `02_AGENT_ASSIGNMENTS.md` | Who owns which module. |
| `03_MIGRATION_PLAN.md` | Ordered phases and exit criteria per phase. |
| `04_API_SURFACE.md` | REST endpoint list the new modules must expose. |
| `05_DELETION_LIST.md` | Fuel-station files/modules to delete. |

## 7. Starting point

Sage (Planning team leader) owns phase coordination. The first task any agent should read is `03_MIGRATION_PLAN.md`. Agents must not start coding modules until the schema is migrated and `prisma generate` is clean — that's Phase 1 and it's Aria's (Development leader) responsibility with Vault (DevSecOps leader) for the migration safety review.
