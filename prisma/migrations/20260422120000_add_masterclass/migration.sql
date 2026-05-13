-- MasterclassCategory
CREATE TABLE "MasterclassCategory" (
  "id"            SERIAL       NOT NULL,
  "titleUz"       VARCHAR(200) NOT NULL,
  "titleRu"       VARCHAR(200) NOT NULL,
  "descriptionUz" TEXT         NOT NULL,
  "descriptionRu" TEXT         NOT NULL,
  "imageUrl"      TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MasterclassCategory_pkey" PRIMARY KEY ("id")
);

-- Masterclass
CREATE TABLE "Masterclass" (
  "id"                    SERIAL       NOT NULL,
  "masterclassCategoryId" INTEGER      NOT NULL,
  "titleUz"               VARCHAR(200) NOT NULL,
  "titleRu"               VARCHAR(200) NOT NULL,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Masterclass_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Masterclass_masterclassCategoryId_idx" ON "Masterclass"("masterclassCategoryId");

ALTER TABLE "Masterclass"
  ADD CONSTRAINT "Masterclass_masterclassCategoryId_fkey"
  FOREIGN KEY ("masterclassCategoryId") REFERENCES "MasterclassCategory"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- MasterclassBlock
CREATE TABLE "MasterclassBlock" (
  "id"            SERIAL       NOT NULL,
  "masterclassId" INTEGER      NOT NULL,
  "blockType"     "BlockType"  NOT NULL,
  "contentUz"     TEXT         NOT NULL,
  "contentRu"     TEXT         NOT NULL,
  "duration"      INTEGER,
  "sequenceOrder" INTEGER      NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MasterclassBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MasterclassBlock_masterclassId_idx" ON "MasterclassBlock"("masterclassId");
CREATE INDEX "MasterclassBlock_sequenceOrder_idx" ON "MasterclassBlock"("sequenceOrder");

ALTER TABLE "MasterclassBlock"
  ADD CONSTRAINT "MasterclassBlock_masterclassId_fkey"
  FOREIGN KEY ("masterclassId") REFERENCES "Masterclass"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
