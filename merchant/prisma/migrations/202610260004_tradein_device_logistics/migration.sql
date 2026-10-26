-- Add fields used by the simulator; preserve existing requests.
ALTER TABLE "TradeIn"
 ADD COLUMN IF NOT EXISTS "returnLabelUrl" TEXT,
 ADD COLUMN IF NOT EXISTS "trackingCode" TEXT,
 ADD COLUMN IF NOT EXISTS "carrier" TEXT,
 ADD COLUMN IF NOT EXISTS "imei" TEXT,
 ADD COLUMN IF NOT EXISTS "imeiChecked" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS "imeiBlocked" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS "imeiCheckResult" JSONB,
 ADD COLUMN IF NOT EXISTS "photos" JSONB,
 ADD COLUMN IF NOT EXISTS "logisticsProvider" TEXT,
 ADD COLUMN IF NOT EXISTS "reverseAuthorizationCode" TEXT,
 ADD COLUMN IF NOT EXISTS "reverseLabelUrl" TEXT,
 ADD COLUMN IF NOT EXISTS "webhookLastEvent" JSONB;
