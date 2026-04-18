# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FuelPay backend — NestJS + Prisma (PostgreSQL) REST API for a fuel station payment/management platform. Despite the `package.json` name `crm` and README references to "Charge One"/EV charging, the active domain is **fuel** (fuel-pump, fuel-session, fuel-station, fuel-type). The EV/charging README is legacy — trust `src/modules/` over it.

## Commands

```bash
npm run start:dev         # watch mode dev server
npm run start:prod        # run built dist/main
npm run build             # nest build
npm run lint              # eslint --fix
npm test                  # jest (unit, *.spec.ts under src/)
npm test -- path/to/file.spec.ts   # single test file
npm run test:e2e          # e2e via test/jest-e2e.json
npx prisma generate       # regenerate Prisma client after schema.prisma edits
npx prisma migrate dev    # create/apply dev migration
npx prisma db push        # push schema without migration (dev only)
npm run prisma:seed       # via `prisma.seed` hook: ts-node prisma/seed.ts
```

Runtime: Node 18+, PostgreSQL. Env via `.env` (`DATABASE_URL`, `PORT`, `CORS_DOMAINS`, etc.). Global API prefix `/v1`, Swagger at `/docs`.

## Architecture

Modular NestJS monolith. Each feature lives in `src/modules/<name>/` with the usual `*.module.ts / *.controller.ts / *.service.ts / dto/`. Cross-cutting code is in `src/common/` (`config`, `filter`, `guards`, `interceptors`, `decorators`, `cron`, `helpers`, `services`, `utils`).

Key domains:
- **fuel-station / fuel-pump / fuel-pump-fuel / fuel-type / fuel-pump-status-log** — station hardware + pump/fuel inventory and telemetry.
- **fuel-session** — active fueling sessions; `FuelSessionService` handles CRUD, automated payment processing, and aggregated cashier/user stats.
- **click** — Click.uz payment provider integration (webhook handling, card tokenization) used by fuel-session payment flow.
- **payment / operator / operator-payout** — billing, station operators, revenue distribution.
- **auth / users** — JWT auth, roles, OTP.
- **telegram** — Telegraf bot (`nestjs-telegraf`).
- **ocpp / socket** — WebSocket/OCPP-style realtime channels.
- **prisma** — `PrismaService` wrapper; single source of DB access. Schema at `prisma/schema.prisma`, migrations in `prisma/migrations/`.

Bootstrap (`src/main.ts`) wires: global `/v1` prefix, `ValidationPipe` (config from `common/config/app.config.ts`), `AllExceptionFilter`, `ResponseInterceptor` (all responses pass through this — keep shape consistent), helmet, CORS from `appConfig.cors_domains`, 10mb body limit, Swagger bearer auth. `useContainer(AppModule)` is set so custom class-validator constraints can inject Nest providers.

## Conventions

- Add new features as a module under `src/modules/` and register it in `app.module.ts`.
- DB changes go through `prisma/schema.prisma` + a migration; don't bypass Prisma.
- Responses are wrapped by `ResponseInterceptor` — return plain data from controllers, not pre-wrapped envelopes.
- Jest `rootDir` is `src/`; specs must be colocated as `*.spec.ts` inside `src/`.
