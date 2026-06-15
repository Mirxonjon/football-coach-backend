# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Football Coaching backend — NestJS 10 + Prisma 5.22 (PostgreSQL) REST API for an Uzbek football education platform (bilingual UZ/RU content). Despite `package.json` name `crm`, the active domain is football training: training lessons, books, masterclasses, subscriptions, Click payments, push notifications, AI chat over book content.

**Global API prefix `/v1`**, Swagger at `/docs`, default port `4021`.

## Commands

Always use the npm scripts below for Prisma — they wrap the CLI through `scripts/prisma.js`, which builds `DATABASE_URL` at runtime from `DB_*` env vars in `.env`. `npx prisma <cmd>` directly will fail with `P1012: Environment variable not found: DATABASE_URL` because the `.env` only carries `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DATABASE`.

```bash
npm run start:dev          # watch-mode dev server
npm run start:prod         # node dist/src/main.js (output path is dist/src — see Build output note)
npm run build              # nest build
npm run lint               # eslint --fix
npm test                   # jest, *.spec.ts colocated under src/
npm test -- path/to/file.spec.ts
npm run test:e2e

npm run prisma:migrate     # migrate dev (uses wrapper → builds DATABASE_URL)
npm run prisma:deploy      # migrate deploy (production / docker entrypoint)
npm run prisma:generate    # regenerate client after schema.prisma edits
npm run prisma:push        # db push (skip migrations — drift recovery only)
npm run prisma:seed        # tsx prisma/seed.ts (idempotent, resets sequences)
npm run prisma:reset       # migrate reset --force + reseed (DESTRUCTIVE)
```

### Build output note

`tsconfig.json` has `outDir: "./dist"` with `nest-cli.json` `sourceRoot: "src"`, so compiled output lives at **`dist/src/main.js`** (not `dist/main.js`). Both `start:prod` and the Docker `CMD` reflect this.

### Docker

```bash
docker compose up -d --build      # build + run on Ubuntu server
docker compose logs -f api
docker compose exec api node scripts/prisma.js db seed
```

`docker-compose.yml` uses `network_mode: host` — the container talks to host Postgres at `localhost:5432` directly. Migration runs at container start via Dockerfile `CMD`.

## Architecture

### Bootstrap order (critical)

`src/main.ts` runs **before any Nest imports**:

1. `dotenv.config()`
2. Synchronously builds `process.env.DATABASE_URL` from `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DATABASE` (URL-encoded).
3. Only then imports `AppModule` and bootstraps Nest.

This is why `.env` keeps `DATABASE_URL` commented out — Prisma reads it at module init, after main.ts has set it. If you `import { PrismaService }` indirectly before this block runs, Prisma fails to connect. Don't move imports above the IIFE.

Global wiring in `bootstrap()`: `/v1` prefix, `helmet`, 10mb body limit, `ValidationPipe`, `AllExceptionFilter`, `ResponseInterceptor`, CORS from `appConfig.cors_domains` (defaults to `*`), Swagger bearer auth, `useContainer(AppModule)` so class-validator constraints can inject Nest providers.

### Response envelope

`ResponseInterceptor` wraps every controller return as `{ status_code, data, [meta] }`. **Controllers return raw payloads** — never pre-wrap. For paginated responses, services return `{ data: T[], meta: { page, limit, total, totalPages } }` and the interceptor hoists `meta` to the top of the envelope (it detects the shape `{data: array, meta: {page, limit, total}}` and unwraps it).

### Modules (`src/modules/<name>/`)

| Domain | Modules |
|---|---|
| **Auth + users** | `auth` (JWT, Google OAuth with separate web/admin client IDs, phone OTP via Eskiz, email register/login, refresh, admin login), `users` (profile, avatar upload to R2, language pref) |
| **Training content** | `age-category`, `training-category`, `training`, `lesson` (TrainingLesson + LessonBlock with two-level paywall: `isFree` on both lesson and block; unsubscribed users get `isLocked: true` with content stripped) |
| **Books** | `books` (categories, browsing with filters/pagination, purchase via Click with atomic WalletTransaction+UserBook, lifetime signed download URL) |
| **Masterclasses** | `masterclass-category`, `masterclass` (no paywall) |
| **Subscriptions** | `subscription-plan` (with bilingual `features: Json` array), `subscription` (autoPay + daily 02:00 cron in `subscription.cron.ts` for renewals + 3d/1d expiry pushes) |
| **Payments** | `payments` (Click.uz provider with sha1 auth in `providers/click.provider.ts`, 2-step card add returning only `cardId` to FE, charge via saved card token) |
| **Notifications** | `notification` (in-app + FCM via `firebase-admin.service.ts`, devices via `device.controller.ts`) |
| **AI** | `ai-chat` (general OpenAI chat), `book-rag` (per-book RAG: Gemini embeddings + Weaviate vector store + Gemini chat — see RAG section below) |
| **Legal** | `legal` (Privacy/Terms/Offer/Requisites with versioning + per-user consent tracking) |
| **Infra** | `prisma`, `health`, `socket`, `telegram`, `upload`, `stats` |

Cross-cutting code lives under `src/common/` (`config`, `filter`, `guards`, `interceptors`, `decorators`, `cron`, `services/storage`).

### Book RAG — split data model (important)

The RAG feature splits storage between Postgres and Weaviate:

- **Postgres** (Prisma): `Book` (with `fileUrl`, `fileUrlUz?`, `fileUrlRu?`), `UserBook`, `AiBookChat`, `AiBookMessage`. Chat history is relational and stays here.
- **Weaviate** (separate Docker container at `localhost:8080`, REST + gRPC `:50051`, API key auth): the `BookChunk` collection — `bookId`, `language`, `chunkIndex`, `content`, `tokens`, plus the 768-dim Gemini `text-embedding-004` vector. `WeaviateService` owns this collection (auto-creates on boot via `ensureBookChunkCollection`).

`BookRagService` (`src/modules/book-rag/`) orchestrates:

1. `ensureOwnsBook(userId, bookId)` → 403 if no active `UserBook`.
2. `detectLanguage(message)` → `'uz'|'ru'` by Cyrillic ratio.
3. `gemini.embed(message)` → 768-dim vector.
4. `weaviate.searchChunks({bookId, language, queryVec, limit: 6})` → top-K with `bookId` (and optionally `language`) filter; falls back to all-language search if zero hits.
5. `gemini.chat({systemInstruction, history (last 10), userMessage})` with a strict "answer only from these chunks" prompt (`prompts.ts`).
6. Persists user+assistant messages to `AiBookMessage` in a single Prisma transaction.

Admin re-embed flow (`POST /v1/admin/books/:id/embed`): clean-restart — `weaviate.deleteByBook(bookId)` → for each available `fileUrlUz/Ru/fileUrl`, download PDF via `PdfExtractorService` (`pdf-parse`), chunk via `ChunkingService` (~500 tokens, 50 overlap, sentence-aware), embed each chunk and insert into Weaviate. Synchronous, 30–90s per book.

Health check at `GET /v1/admin/book-rag/weaviate/ping` returns `{ok, ready, version, bookChunkCollection}`. The `BookEmbedding` Prisma model and pgvector extension have been removed — don't reintroduce them; the migration history reflects this.

### Storage / signed URLs

`StorageService` in `src/common/services/storage/` wraps an S3 client pointed at Cloudflare R2 (`R2_*` env). Lesson video URLs and book downloads use `signIfOurR2()` / `getSignedDownloadUrl()` — public R2 paths are signed on each request with short TTLs (lessons 2h, book downloads 1h). External URLs pass through unchanged. **URLs are never persisted as signed** — `Book.fileUrl` etc. hold the public key form; signing happens at serve time. If frontend caches a signed URL, that's a frontend bug, not a backend issue.

### Auth specifics

- Two Google client IDs: `GOOGLE_WEB_CLIENT_ID` (user web + mobile `serverClientId`) and `GOOGLE_ADMIN_CLIENT_ID` (admin panel only). `AuthService.googleAuth` and `adminGoogleAuth` verify the `aud` claim strictly against the correct one.
- Admin login is strict: never auto-creates users, never auto-promotes. Structured error codes: `INVALID_GOOGLE_TOKEN`, `ADMIN_NOT_FOUND`, `NOT_ADMIN`, `ACCOUNT_DEACTIVATED`.
- Access token 15min, refresh token 30 days, refresh stored bcrypt-hashed in `Session` (rotation on each refresh).
- Use `OptionalJwtAuthGuard` for public-but-user-aware endpoints (e.g. training-categories with `progressStatus` filter that silently skips for anonymous calls).

### Conventions

- Add features as `src/modules/<name>/` and register in `app.module.ts`. Co-locate DTOs under `src/types/<domain>/` (existing pattern, not under the module).
- DB changes go through `prisma/schema.prisma` + a migration (idempotent SQL — `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`). Production migrations are applied at container start.
- Jest `rootDir` is `src/`; tests must be colocated as `*.spec.ts` under `src/`.
- Seed (`prisma/seed.ts`) is idempotent — uses `upsert` with explicit IDs, then resets autoincrement sequences via a `DO $$` SQL block that uses `oid::regclass::text` to handle PascalCase table names correctly.
- Seed credentials: admin `+998900000000 / Admin123!`, users `+99890{1..5}{1..5}5 / User123!`.

### Environment

Required env groups (see `.env` for full list):

- DB: `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DATABASE` (DATABASE_URL is built at runtime; keep the line in `.env` commented for clarity).
- JWT: `JWT_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS`.
- Firebase: `FIREBASE_CREDENTIALS_PATH` pointing to a service-account JSON (mounted as read-only volume in Docker, never baked into the image).
- Google OAuth: `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_ADMIN_CLIENT_ID`.
- Click: `CLICK_MERCHANT_ID/SERVICE_ID/SECRET_KEY/MERCHANT_USER_ID` (when unset, `ClickProvider.charge()` returns `{success: false, errorCode: 'click_not_configured'}`; use `POST /v1/subscriptions/me/dev-activate/:planId` and `POST /v1/me/books/:bookId/dev-grant` for testing — both refuse to run when `NODE_ENV=production`).
- Gemini: `GEMINI_API_KEY`, `GEMINI_EMBED_MODEL=text-embedding-004`, `GEMINI_CHAT_MODEL=gemini-flash-latest`.
- Weaviate: `WEAVIATE_HOST/HTTP_PORT/GRPC_PORT/SCHEME/API_KEY` (defaults wired to a local Docker container — see `weaviate/docker-compose.yml` in the parent `football v-2/` folder).
- R2: `R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/ENDPOINT/REGION/BUCKET_NAME/PUBLIC_URL`.
- Eskiz SMS (phone OTP): `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`.
