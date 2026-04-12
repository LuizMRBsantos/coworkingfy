-- Sprint: Compras de Insumos
-- Cria enum PurchaseCategory e tabela purchases

CREATE TYPE "PurchaseCategory" AS ENUM (
  'CLEANING',
  'COFFEE',
  'OFFICE_SUPPLIES'
);

CREATE TABLE IF NOT EXISTS "purchases" (
  "id"          TEXT             NOT NULL,
  "unitId"      TEXT             NOT NULL,
  "category"    "PurchaseCategory" NOT NULL,
  "description" TEXT             NOT NULL,
  "value"       DECIMAL(10,2)    NOT NULL,
  "purchasedAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT             NOT NULL,
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "purchases_unitId_idx"      ON "purchases"("unitId");
CREATE INDEX IF NOT EXISTS "purchases_category_idx"    ON "purchases"("category");
CREATE INDEX IF NOT EXISTS "purchases_purchasedAt_idx" ON "purchases"("purchasedAt");

ALTER TABLE "purchases" DROP CONSTRAINT IF EXISTS "purchases_unitId_fkey";
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchases" DROP CONSTRAINT IF EXISTS "purchases_createdById_fkey";
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
