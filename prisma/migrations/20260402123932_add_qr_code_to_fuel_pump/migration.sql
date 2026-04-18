/*
  Warnings:

  - A unique constraint covering the columns `[qrCode]` on the table `FuelPump` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FuelPump" ADD COLUMN     "qrCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FuelPump_qrCode_key" ON "FuelPump"("qrCode");

-- CreateIndex
CREATE INDEX "FuelPump_qrCode_idx" ON "FuelPump"("qrCode");
