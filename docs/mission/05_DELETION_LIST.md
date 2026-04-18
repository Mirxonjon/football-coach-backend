# DELETION LIST — What goes in Phase 1

> Bolt owns the delete commit. Vault reviews to make sure nothing auth/user/session/security related is thrown away.

## Modules under `src/modules/` to delete outright

- `click/`
- `fuel-pump/`
- `fuel-pump-fuel/`
- `fuel-pump-status-log/`
- `fuel-session/`
- `fuel-station/`
- `fuel-station-like/`
- `fuel-type/`
- `ocpp/`
- `operator/`
- `operator-payout/`
- `vehicle/`

## Modules to review (not delete blindly)

- `legal/` — delete only if the content is fuel-station specific. Sage decides after reading the module README and routes.
- `telegram/` — keep as a generic notification channel if it has a clean integration; otherwise delete. Pipe reviews.
- `socket/` — keep; the new platform will need sockets for AI chat streaming.
- `notification/` — keep but rewrite to match new `Notification` model (phase 2).

## Root-level files to clean up

- `ev-cars.json` — delete (fuel-station seed data).
- `test.html` — delete unless Atlas confirms it's a dev harness we still need.
- `README.md` — replace in Phase 5 (Atlas writes the new one).
- `ADMIN_DASHBOARD.md` — inspect; keep only the parts that apply to the new admin surface; delete the rest.
- `CLAUDE.md` — keep as Claude Code session notes, but edit the "what we're building" section to reference the mission folder.
- `Dockerfile` — keep but plan a rewrite in Phase 5.
- `docker-compose.yml` — keep, rewrite Phase 5.

## Prisma

- Delete `prisma/migrations/` entirely — we are baselining a new init migration.
- Replace `prisma/schema.prisma` per `01_SCHEMA.md`.
- Rewrite `prisma/seed.ts` per Phase 3 seed requirements.

## `package.json`

- Rename `"name": "crm"` → `"name": "football-coach-backend"`.
- Update `"description"` to something like `"Backend API for the football coaching e-learning platform."`.
- Remove unused deps after code deletion: `@xenova/transformers`, `weaviate-client`, `simple-statistics`, `nestjs-telegraf` (if telegram module is dropped), `minio` stays (used by AI chat + lessons), `googleapis` stays if Google OAuth uses it (else `google-auth-library` is preferred — Bolt decides during auth work).

## Commit hygiene

Split the cleanup into at least three commits to keep history readable:
1. `chore: delete fuel-station modules`
2. `chore: baseline prisma schema for football coaching platform`
3. `chore: rename package and prune unused deps`

Do **not** squash these into one commit.
