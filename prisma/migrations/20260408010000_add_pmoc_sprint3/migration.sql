-- Sprint 3: PMOC + Motor Preventivo
-- Adiciona maintenancePlanId em service_orders e torna ticketId opcional.

-- Torna ticketId opcional (OS preventiva não tem ticket)
ALTER TABLE "service_orders" ALTER COLUMN "ticketId" DROP NOT NULL;

-- Adiciona maintenancePlanId em service_orders
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "maintenancePlanId" TEXT;

CREATE INDEX IF NOT EXISTS "service_orders_maintenancePlanId_idx"
  ON "service_orders"("maintenancePlanId");

ALTER TABLE "service_orders" DROP CONSTRAINT IF EXISTS "service_orders_maintenancePlanId_fkey";
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_maintenancePlanId_fkey"
  FOREIGN KEY ("maintenancePlanId")
  REFERENCES "maintenance_plans"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
