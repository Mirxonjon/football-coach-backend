-- Card: add provider / cardNumber / expireDate / phoneNumber / isVerified
ALTER TABLE "Card"
  ADD COLUMN "provider"    TEXT        NOT NULL DEFAULT 'click',
  ADD COLUMN "cardNumber"  VARCHAR(19),
  ADD COLUMN "expireDate"  VARCHAR(4),
  ADD COLUMN "phoneNumber" VARCHAR(20),
  ADD COLUMN "isVerified"  BOOLEAN     NOT NULL DEFAULT false;

-- Subscription: add autoPay + saved card + renewal bookkeeping
ALTER TABLE "Subscription"
  ADD COLUMN "autoPay"              BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN "cardId"               INTEGER,
  ADD COLUMN "lastRenewalAttemptAt" TIMESTAMP(3),
  ADD COLUMN "lastExpiryNoticeDay"  INTEGER;
