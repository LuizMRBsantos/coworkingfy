-- AlterTable: add providerId to maintenance_plans
ALTER TABLE "maintenance_plans"
    ADD COLUMN IF NOT EXISTS "providerId" TEXT;

-- AddForeignKey
ALTER TABLE "maintenance_plans"
    ADD CONSTRAINT "maintenance_plans_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "maintenance_plans_providerId_idx"
    ON "maintenance_plans"("providerId");
