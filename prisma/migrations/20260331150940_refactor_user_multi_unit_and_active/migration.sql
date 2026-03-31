/*
  Warnings:

  - You are about to drop the column `unitId` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_unitId_fkey";

-- DropIndex
DROP INDEX "users_unitId_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "unitId",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "user_units" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,

    CONSTRAINT "user_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_units_userId_idx" ON "user_units"("userId");

-- CreateIndex
CREATE INDEX "user_units_unitId_idx" ON "user_units"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "user_units_userId_unitId_key" ON "user_units"("userId", "unitId");

-- AddForeignKey
ALTER TABLE "user_units" ADD CONSTRAINT "user_units_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_units" ADD CONSTRAINT "user_units_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
