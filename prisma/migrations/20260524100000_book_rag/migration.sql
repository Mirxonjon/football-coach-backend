-- Book-Specific RAG migration (Weaviate variant — no pgvector)
-- Vector chunks live in Weaviate (BookChunk collection).
-- This migration only adds the Postgres tables we still need:
--   - 2 columns on Book (bilingual PDF urls)
--   - AiBookChat (per user+book chat session)
--   - AiBookMessage (chat messages, language tag, token usage)
-- ─────────────────────────────────────────────────────────────

-- 1) Book jadvaliga 2 ta yangi ustun (bilingual PDF support)
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "fileUrlUz" TEXT;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "fileUrlRu" TEXT;

-- 2) AiBookChat — kitobga bog'langan suhbatlar
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

-- 3) AiBookMessage — suhbat xabarlari
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
