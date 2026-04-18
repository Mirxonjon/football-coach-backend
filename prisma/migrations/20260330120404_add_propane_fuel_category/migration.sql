-- CreateEnum
CREATE TYPE "FuelCategory" AS ENUM ('PETROL', 'GAS', 'PROPANE', 'ELECTRICITY');

-- AlterTable
ALTER TABLE "FuelType" ADD COLUMN     "category" "FuelCategory" NOT NULL DEFAULT 'PETROL';
