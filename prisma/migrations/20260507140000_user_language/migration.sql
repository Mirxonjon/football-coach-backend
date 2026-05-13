-- CreateEnum
CREATE TYPE "UserLanguage" AS ENUM ('UZ', 'RU', 'EN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "language" "UserLanguage" NOT NULL DEFAULT 'UZ';
