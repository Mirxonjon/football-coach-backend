-- Book-Specific RAG migration (safe / idempotent)
-- ─────────────────────────────────────────────────────────────

-- 1) pgvector kengaytmasi
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Book jadvaliga 2 ta yangi ustun (bilingual PDF support)
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "fileUrlUz" TEXT;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "fileUrlRu" TEXT;

-- 3) BookEmbedding — kitob chunk + vector
CREATE TABLE IF NOT EXISTS "BookEmbedding" (
  "id"          SERIAL PRIMARY KEY,
  "bookId"      INTEGER      NOT NULL,
  "language"    VARCHAR(2)   NOT NULL,
  "chunkIndex"  INTEGER      NOT NULL,
  "content"     TEXT         NOT NULL,
  "tokens"      INTEGER,
  "embedding"   vector(768)  NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookEmbedding_bookId_fkey"
    FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "BookEmbedding_bookId_language_idx"
  ON "BookEmbedding"("bookId", "language");

CREATE INDEX IF NOT EXISTS "BookEmbedding_embedding_hnsw_idx"
  ON "BookEmbedding" USING hnsw ("embedding" vector_cosine_ops);

-- 4) AiBookChat — kitobga bog'langan suhbatlar
CREATE TABLE IF NOT EXISTS "AiBookChat" (
  "id"        SERIAL PRIMARY KEY,
  "userId"    INTEGER      NOT NULL,
  "bookId"    INTEGER      NOT NULL,
  "title"     VARCHAR(200),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiBookChat_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiBookChat_bookId_fkey"
    FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AiBookChat_userId_bookId_idx"
  ON "AiBookChat"("userId", "bookId");

-- 5) AiBookMessage — suhbat xabarlari
CREATE TABLE IF NOT EXISTS "AiBookMessage" (
  "id"        SERIAL PRIMARY KEY,
  "chatId"    INTEGER         NOT NULL,
  "role"      "AiMessageRole" NOT NULL,
  "language"  VARCHAR(2),
  "content"   TEXT            NOT NULL,
  "tokensIn"  INTEGER,
  "tokensOut" INTEGER,
  "createdAt" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiBookMessage_chatId_fkey"
    FOREIGN KEY ("chatId") REFERENCES "AiBookChat"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AiBookMessage_chatId_idx"
  ON "AiBookMessage"("chatId");
