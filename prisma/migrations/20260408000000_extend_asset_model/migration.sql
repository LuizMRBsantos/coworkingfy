-- =============================================================================
-- Sprint 2: Asset Management
-- Cria enums AssetType, AssetStatus, PlanFrequency e tabelas assets,
-- maintenance_plans, plan_checklist_items do zero (nunca foram migradas antes).
-- Também garante que service_orders.assetId existe com FK correta.
-- =============================================================================

-- CreateEnum: AssetType
CREATE TYPE "AssetType" AS ENUM (
  'AC', 'ELECTRONIC', 'HYDRAULIC', 'CLEANING',
  'HVAC', 'FIRE_SAFETY', 'ELECTRICAL', 'PLUMBING',
  'ELEVATOR', 'APPLIANCE', 'IT_INFRA', 'FURNITURE', 'OTHER'
);

-- CreateEnum: AssetStatus
CREATE TYPE "AssetStatus" AS ENUM (
  'ACTIVE', 'INACTIVE', 'MAINTENANCE', 'UNDER_MAINTENANCE', 'DECOMMISSIONED'
);

-- CreateEnum: PlanFrequency
CREATE TYPE "PlanFrequency" AS ENUM (
  'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY'
);

-- CreateTable: assets
CREATE TABLE IF NOT EXISTS "assets" (
    "id"                TEXT         NOT NULL,
    "unitId"            TEXT         NOT NULL,
    "spaceId"           TEXT,
    "code"              TEXT         NOT NULL,
    "name"              TEXT         NOT NULL,
    "description"       TEXT,
    "type"              "AssetType"  NOT NULL,
    "brand"             TEXT,
    "assetModel"        TEXT,
    "serialNumber"      TEXT,
    "purchasedAt"       TIMESTAMP(3),
    "warrantyExpiresAt" TIMESTAMP(3),
    "notes"             TEXT,
    "status"            "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: maintenance_plans
CREATE TABLE IF NOT EXISTS "maintenance_plans" (
    "id"          TEXT            NOT NULL,
    "unitId"      TEXT            NOT NULL,
    "assetId"     TEXT,
    "spaceId"     TEXT,
    "name"        TEXT            NOT NULL,
    "description" TEXT,
    "frequency"   "PlanFrequency" NOT NULL,
    "serviceType" "ServiceType"   NOT NULL,
    "priority"    "Priority"      NOT NULL DEFAULT 'MEDIUM',
    "lastRunAt"   TIMESTAMP(3),
    "nextRunAt"   TIMESTAMP(3)    NOT NULL,
    "isActive"    BOOLEAN         NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: plan_checklist_items
CREATE TABLE IF NOT EXISTS "plan_checklist_items" (
    "id"         TEXT    NOT NULL,
    "planId"     TEXT    NOT NULL,
    "item"       TEXT    NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plan_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex: assets.code
CREATE UNIQUE INDEX IF NOT EXISTS "assets_code_key" ON "assets"("code");

-- CreateIndexes: assets
CREATE INDEX IF NOT EXISTS "assets_unitId_idx"  ON "assets"("unitId");
CREATE INDEX IF NOT EXISTS "assets_spaceId_idx" ON "assets"("spaceId");

-- CreateIndexes: maintenance_plans
CREATE INDEX IF NOT EXISTS "maintenance_plans_unitId_idx"  ON "maintenance_plans"("unitId");
CREATE INDEX IF NOT EXISTS "maintenance_plans_assetId_idx" ON "maintenance_plans"("assetId");
CREATE INDEX IF NOT EXISTS "maintenance_plans_spaceId_idx" ON "maintenance_plans"("spaceId");

-- CreateIndex: plan_checklist_items
CREATE INDEX IF NOT EXISTS "plan_checklist_items_planId_idx" ON "plan_checklist_items"("planId");

-- Add assetId to service_orders (may not exist if schema was never pushed)
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "assetId" TEXT;
CREATE INDEX IF NOT EXISTS "service_orders_assetId_idx" ON "service_orders"("assetId");

-- AddForeignKeys: assets
ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "assets_unitId_fkey";
ALTER TABLE "assets" ADD CONSTRAINT "assets_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "assets_spaceId_fkey";
ALTER TABLE "assets" ADD CONSTRAINT "assets_spaceId_fkey"
    FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKeys: maintenance_plans
ALTER TABLE "maintenance_plans" DROP CONSTRAINT IF EXISTS "maintenance_plans_unitId_fkey";
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "maintenance_plans" DROP CONSTRAINT IF EXISTS "maintenance_plans_assetId_fkey";
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "maintenance_plans" DROP CONSTRAINT IF EXISTS "maintenance_plans_spaceId_fkey";
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_spaceId_fkey"
    FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKeys: plan_checklist_items
ALTER TABLE "plan_checklist_items" DROP CONSTRAINT IF EXISTS "plan_checklist_items_planId_fkey";
ALTER TABLE "plan_checklist_items" ADD CONSTRAINT "plan_checklist_items_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "maintenance_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: service_orders → assets
ALTER TABLE "service_orders" DROP CONSTRAINT IF EXISTS "service_orders_assetId_fkey";
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
