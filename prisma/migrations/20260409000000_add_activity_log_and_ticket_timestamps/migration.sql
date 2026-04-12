-- Add startedAt and resolvedAt to tickets for BI metrics
ALTER TABLE "tickets"
  ADD COLUMN IF NOT EXISTS "startedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resolvedAt"  TIMESTAMP(3);

-- Create ActivityEntityType enum
CREATE TYPE "ActivityEntityType" AS ENUM ('TICKET', 'SERVICE_ORDER');

-- Create activity_logs table (write-once, imutable audit trail)
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id"              TEXT         NOT NULL,
  "entityType"      "ActivityEntityType" NOT NULL,
  "entityId"        TEXT         NOT NULL,
  "action"          TEXT         NOT NULL,
  "fromStatus"      TEXT,
  "toStatus"        TEXT,
  "performedById"   TEXT,
  "performedByName" TEXT,
  "lat"             DECIMAL,
  "lng"             DECIMAL,
  "metadata"        JSONB,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- Composite index for real-time UI feed queries (entityType + entityId)
CREATE INDEX "activity_logs_entityType_entityId_idx"
  ON "activity_logs"("entityType", "entityId");
