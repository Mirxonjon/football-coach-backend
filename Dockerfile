# ─── build ──────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Prisma engine uchun OpenSSL kerak (Debian slim'da default'da yo'q)
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ─── production ─────────────────────────────────────────
FROM node:20-slim
WORKDIR /app

# OpenSSL + wget (healthcheck uchun) + ca-certificates
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

EXPOSE 4021

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4021/v1/health || exit 1

# Wrapper script DB_* parametrlardan DATABASE_URL ni o'zi quradi,
# keyin migration + server.
CMD ["sh", "-c", "node scripts/prisma.js migrate deploy && node dist/main.js"]
