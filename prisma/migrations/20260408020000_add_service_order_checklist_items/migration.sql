-- Cria tabela de itens de checklist de OS (estava no schema mas sem migration)

CREATE TABLE IF NOT EXISTS "service_order_checklist_items" (
    "id"             TEXT      NOT NULL,
    "serviceOrderId" TEXT      NOT NULL,
    "item"           TEXT      NOT NULL,
    "isCompleted"    BOOLEAN   NOT NULL DEFAULT false,
    "completedAt"    TIMESTAMP(3),

    CONSTRAINT "service_order_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "service_order_checklist_items_serviceOrderId_idx"
  ON "service_order_checklist_items"("serviceOrderId");

ALTER TABLE "service_order_checklist_items"
  DROP CONSTRAINT IF EXISTS "service_order_checklist_items_serviceOrderId_fkey";

ALTER TABLE "service_order_checklist_items"
  ADD CONSTRAINT "service_order_checklist_items_serviceOrderId_fkey"
  FOREIGN KEY ("serviceOrderId")
  REFERENCES "service_orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
