-- Add lat/lng to units for geolocation validation
ALTER TABLE "units"
  ADD COLUMN IF NOT EXISTS "lat" DECIMAL,
  ADD COLUMN IF NOT EXISTS "lng" DECIMAL;

-- Create provider_tokens table
CREATE TABLE IF NOT EXISTS "provider_tokens" (
  "id"             TEXT NOT NULL,
  "serviceOrderId" TEXT NOT NULL,
  "token"          TEXT NOT NULL,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "usedAt"         TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "provider_tokens_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
ALTER TABLE "provider_tokens"
  ADD CONSTRAINT "provider_tokens_serviceOrderId_key" UNIQUE ("serviceOrderId"),
  ADD CONSTRAINT "provider_tokens_token_key"          UNIQUE ("token");

-- Foreign key
ALTER TABLE "provider_tokens"
  ADD CONSTRAINT "provider_tokens_serviceOrderId_fkey"
  FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
