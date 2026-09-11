-- Card.id qo'lda `Date.now()` bilan berilardi, lekin ustun INTEGER (int4, maks 2147483647),
-- Date.now() esa ~1.79e12 — har bir yangi karta "integer out of range" bilan yiqilardi.
-- Boshqa jadvallardagi kabi avtomatik ketma-ketlikka o'tkazamiz.
CREATE SEQUENCE IF NOT EXISTS "Card_id_seq" AS INTEGER;
ALTER TABLE "Card" ALTER COLUMN "id" SET DEFAULT nextval('"Card_id_seq"');
ALTER SEQUENCE "Card_id_seq" OWNED BY "Card"."id";
SELECT setval('"Card_id_seq"', COALESCE((SELECT MAX("id") FROM "Card"), 0) + 1, false);
