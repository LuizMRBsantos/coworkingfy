-- CreateEnum
CREATE TYPE "UnitChecklistItemType" AS ENUM (
  'UNIT_CONTRACT',
  'CLEANING_CONTRACT',
  'INTERNET_CONTRACT',
  'EQUIPMENT_INVENTORY',
  'LEASE_CONTRACT',
  'PRINTER_CONTRACT'
);

-- CreateTable
CREATE TABLE "unit_checklist_items" (
    "id"          TEXT NOT NULL,
    "unitId"      TEXT NOT NULL,
    "itemType"    "UnitChecklistItemType" NOT NULL,
    "documentUrl" TEXT,
    "fileName"    TEXT,
    "uploadedAt"  TIMESTAMP(3),
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unit_checklist_items_unitId_itemType_key"
    ON "unit_checklist_items"("unitId", "itemType");

-- CreateIndex
CREATE INDEX "unit_checklist_items_unitId_idx"
    ON "unit_checklist_items"("unitId");

-- AddForeignKey
ALTER TABLE "unit_checklist_items"
    ADD CONSTRAINT "unit_checklist_items_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
