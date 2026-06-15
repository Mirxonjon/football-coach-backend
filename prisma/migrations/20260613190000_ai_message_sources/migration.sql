-- Persist the retrieved chunks that grounded each assistant reply.
-- Shape: [{ "n": 1, "chunkIndex": 47, "language": "uz", "preview": "..." }]
ALTER TABLE "AiBookMessage" ADD COLUMN IF NOT EXISTS "sources" JSONB;
