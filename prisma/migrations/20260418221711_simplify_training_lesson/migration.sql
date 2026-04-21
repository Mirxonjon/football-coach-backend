/*
  Warnings:

  - You are about to drop the column `descriptionRu` on the `TrainingLesson` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionUz` on the `TrainingLesson` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `TrainingLesson` table. All the data in the column will be lost.
  - You are about to drop the column `sequenceOrder` on the `TrainingLesson` table. All the data in the column will be lost.
  - You are about to drop the column `tacticHintImg` on the `TrainingLesson` table. All the data in the column will be lost.
  - You are about to drop the column `videoUrl` on the `TrainingLesson` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "TrainingLesson_sequenceOrder_idx";

-- AlterTable
ALTER TABLE "TrainingLesson" DROP COLUMN "descriptionRu",
DROP COLUMN "descriptionUz",
DROP COLUMN "duration",
DROP COLUMN "sequenceOrder",
DROP COLUMN "tacticHintImg",
DROP COLUMN "videoUrl";
