-- AddEnumValue: ServiceOrderStatus
ALTER TYPE "ServiceOrderStatus" ADD VALUE IF NOT EXISTS 'VALIDATED';

-- AlterTable: units — add address and client info
ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "address"       TEXT;
ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "clientName"    TEXT;
ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "clientContact" TEXT;

-- AlterTable: service_orders — drop old slaDeadline, add new fields
ALTER TABLE "service_orders" DROP COLUMN IF EXISTS "slaDeadline";

ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "isRemote"              BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "specialInstructions"   TEXT;
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "executionReport"       TEXT;
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "cancellationReason"    TEXT;
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "startedAt"             TIMESTAMP(3);
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "completedAt"           TIMESTAMP(3);
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "cancelledAt"           TIMESTAMP(3);
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "validatedAt"           TIMESTAMP(3);
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "slaAttendanceDeadline" TIMESTAMP(3);
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "slaResolutionDeadline" TIMESTAMP(3);

-- CreateTable: service_order_attachments
CREATE TABLE IF NOT EXISTS "service_order_attachments" (
    "id"             TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "url"            TEXT NOT NULL,
    "uploadedById"   TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "service_order_attachments_serviceOrderId_idx"
    ON "service_order_attachments"("serviceOrderId");

-- AddForeignKey
ALTER TABLE "service_order_attachments"
    ADD CONSTRAINT "service_order_attachments_serviceOrderId_fkey"
    FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_order_attachments"
    ADD CONSTRAINT "service_order_attachments_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
