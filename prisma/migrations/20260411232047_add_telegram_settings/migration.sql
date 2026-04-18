-- CreateTable
CREATE TABLE "TelegramSetting" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "telegramId" TEXT,
    "telegramGroupId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramSetting_userId_key" ON "TelegramSetting"("userId");

-- CreateIndex
CREATE INDEX "TelegramSetting_userId_idx" ON "TelegramSetting"("userId");

-- AddForeignKey
ALTER TABLE "TelegramSetting" ADD CONSTRAINT "TelegramSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
