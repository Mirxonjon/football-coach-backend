# AGENT ASSIGNMENTS — Who owns what

> Leaders own outcomes. Seniors and juniors own implementation. Everyone reads `00_MISSION_BRIEF.md` and `01_SCHEMA.md` before touching code.

## Leadership

| Agent | Role | Department | Scope |
|-------|------|------------|-------|
| **Sage** | team_leader | planning | Phase gates, cross-team coordination, mission progress report. |
| **Aria** | team_leader | dev | Module architecture, code quality, review final merges. |
| **Vault** | team_leader | devsecops | Auth/OTP/payment security review, Prisma migration safety, secret hygiene. |
| **Hawk** | team_leader | qa | Test plan, coverage gates, Swagger contract checks. |
| **Atlas** | team_leader | operations | Docker, env, seed script, deploy readiness. |
| **Pixel** | team_leader | design | Swagger / OpenAPI shape, response DTO consistency, error shape. |

## Module ownership

| Module / concern | Primary | Assist | QA | Security review |
|------------------|---------|--------|----|-----------------|
| **Prisma schema migration** (Phase 1) | Aria | Bolt | Lint | Vault |
| **Delete obsolete fuel-station code** (Phase 1) | Bolt | Nova | — | Vault |
| **Auth module** (phone + OTP, email + Google, JWT refresh, password reset) | Bolt | Pipe | Hawk | Vault |
| **Users module** (profile, admin CRUD) | Bolt | Nova | DORO | — |
| **Notifications module** (+ FCM devices) | Nova | Luna (notification payload shape) | DORO | Pipe |
| **Subscriptions + Plans module** | Bolt | Nova | Lint | Vault |
| **Payments module** (Card + WalletTransaction) | Bolt | Pipe | Lint | Vault |
| **Books module** (+ categories, user purchase, progress) | Nova | Bolt | DORO | — |
| **Training module** (age-cat, training-cat, lessons, blocks) | Nova | Bolt | DORO | — |
| **AI Chat module** (+ rate limiting) | Bolt | Nova | Lint | Pipe |
| **Admin module** (consolidated admin endpoints) | Aria | Bolt | Hawk | — |
| **Seed script** | Nova | — | DORO | — |
| **Docker / env / deploy** | Atlas | Turbo | — | Vault |
| **Swagger polish** | Pixel | Luna | Hawk | — |
| **Mission reporting** | Sage | Clio | — | — |

## Working model

1. **Every module** has a module folder under `src/modules/<module-name>/` with: `*.module.ts`, `*.controller.ts`, `*.service.ts`, DTOs in `dto/`, Prisma types isolated, `README.md`, and a spec file.
2. **Leaders review** PRs/commits in their domain before the task is marked done. Cross-cutting concerns (schema, auth, payments) require **two leader sign-offs** — the owning leader plus Vault.
3. **Juniors** (Nova on dev, Luna on design, DORO on QA) execute scoped subtasks handed down by their team leader. They do not make architectural decisions unilaterally.
4. **Sage** writes a daily mission report to `docs/mission/REPORT_<YYYY-MM-DD>.md` summarising completed phases, blockers, and the next-day plan.
5. **Hawk** maintains `docs/mission/TEST_STATUS.md` — module-by-module test state, coverage deltas, and flaky tests.
6. **Conflicts** (e.g., "should this belong to Books or Subscriptions?") escalate to Aria first, then Sage if Aria is unavailable. Never silently duplicate logic.
