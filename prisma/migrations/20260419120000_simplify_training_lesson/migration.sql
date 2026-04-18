-- AlterTable: Remove content fields from TrainingLesson (moved to LessonBlock)
ALTER TABLE "TrainingLesson" DROP COLUMN "videoUrl",
DROP COLUMN "duration",
DROP COLUMN "sequenceOrder",
DROP COLUMN "descriptionRu",
DROP COLUMN "descriptionUz",
DROP COLUMN "tacticHintImg";

-- DropIndex
DROP INDEX IF EXISTS "TrainingLesson_sequenceOrder_idx";
