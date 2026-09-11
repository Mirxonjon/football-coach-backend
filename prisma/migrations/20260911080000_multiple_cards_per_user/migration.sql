-- Foydalanuvchi bir nechta karta saqlashi mumkin bo'lsin.
-- Unikal cheklov o'rniga oddiy indeks qo'yamiz (qidiruv tezligi saqlanadi).
DROP INDEX IF EXISTS "Card_userId_key";
CREATE INDEX IF NOT EXISTS "Card_userId_idx" ON "Card"("userId");
