-- Create enums if they don't exist
DO $$ BEGIN
    CREATE TYPE "B2BBuyerStatus" AS ENUM ('pending_kyc', 'approved', 'rejected', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "B2BOfferStatus" AS ENUM ('active', 'inactive', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "B2BLotStatus" AS ENUM ('open', 'closed', 'settled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "B2BSplitStatus" AS ENUM ('pending', 'paid', 'split_completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add values to existing TradeStatus enum if they don't exist
ALTER TYPE "TradeStatus" ADD VALUE IF NOT EXISTS 'sent_to_buyer';
ALTER TYPE "TradeStatus" ADD VALUE IF NOT EXISTS 'completed';

-- Create B2BBuyer table
CREATE TABLE IF NOT EXISTS "B2BBuyer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "cnpj" TEXT,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "address" JSONB,
    "status" "B2BBuyerStatus" NOT NULL DEFAULT 'pending_kyc',
    "kycData" JSONB,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "notes" TEXT,
    "commissionRateBps" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2BBuyer_pkey" PRIMARY KEY ("id")
);

-- Create B2BOffer table
CREATE TABLE IF NOT EXISTS "B2BOffer" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "storage" TEXT,
    "conditionCriteria" JSONB NOT NULL,
    "maxPriceCents" INTEGER NOT NULL,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "status" "B2BOfferStatus" NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2BOffer_pkey" PRIMARY KEY ("id")
);

-- Create B2BLot table
CREATE TABLE IF NOT EXISTS "B2BLot" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT,
    "status" "B2BLotStatus" NOT NULL DEFAULT 'open',
    "totalDevices" INTEGER NOT NULL DEFAULT 0,
    "totalValueCents" INTEGER NOT NULL DEFAULT 0,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2BLot_pkey" PRIMARY KEY ("id")
);

-- Create B2BSplitTransaction table
CREATE TABLE IF NOT EXISTS "B2BSplitTransaction" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "paymentProvider" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "chargeId" TEXT,
    "buyerPaidCents" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "merchantPayoutCents" INTEGER NOT NULL,
    "commissionRateBps" INTEGER NOT NULL,
    "status" "B2BSplitStatus" NOT NULL DEFAULT 'pending',
    "splitConfig" JSONB,
    "webhookData" JSONB,
    "paidAt" TIMESTAMP(3),
    "splitCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2BSplitTransaction_pkey" PRIMARY KEY ("id")
);

-- Add columns to TradeIn if they don't exist
DO $$ BEGIN
    ALTER TABLE "TradeIn" ADD COLUMN "lotId" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TradeIn" ADD COLUMN "b2bBuyerId" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TradeIn" ADD COLUMN "b2bOfferId" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TradeIn" ADD COLUMN "matchedAt" TIMESTAMP(3);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TradeIn" ADD COLUMN "sentToBuyerAt" TIMESTAMP(3);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create unique indexes if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS "B2BBuyer_userId_key" ON "B2BBuyer"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "B2BBuyer_cnpj_key" ON "B2BBuyer"("cnpj");
CREATE UNIQUE INDEX IF NOT EXISTS "B2BSplitTransaction_lotId_key" ON "B2BSplitTransaction"("lotId");

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "B2BBuyer_status_idx" ON "B2BBuyer"("status");
CREATE INDEX IF NOT EXISTS "B2BOffer_buyerId_status_idx" ON "B2BOffer"("buyerId", "status");
CREATE INDEX IF NOT EXISTS "B2BOffer_brand_model_idx" ON "B2BOffer"("brand", "model");
CREATE INDEX IF NOT EXISTS "B2BLot_status_idx" ON "B2BLot"("status");
CREATE INDEX IF NOT EXISTS "B2BSplitTransaction_status_idx" ON "B2BSplitTransaction"("status");
CREATE INDEX IF NOT EXISTS "B2BSplitTransaction_buyerId_idx" ON "B2BSplitTransaction"("buyerId");
CREATE INDEX IF NOT EXISTS "TradeIn_lotId_idx" ON "TradeIn"("lotId");

-- Add foreign keys if they don't exist
DO $$ BEGIN
    ALTER TABLE "B2BBuyer" ADD CONSTRAINT "B2BBuyer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "B2BOffer" ADD CONSTRAINT "B2BOffer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "B2BBuyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "B2BLot" ADD CONSTRAINT "B2BLot_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "B2BBuyer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "B2BSplitTransaction" ADD CONSTRAINT "B2BSplitTransaction_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "B2BLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "B2BSplitTransaction" ADD CONSTRAINT "B2BSplitTransaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "B2BBuyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TradeIn" ADD CONSTRAINT "TradeIn_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "B2BLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TradeIn" ADD CONSTRAINT "TradeIn_b2bBuyerId_fkey" FOREIGN KEY ("b2bBuyerId") REFERENCES "B2BBuyer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TradeIn" ADD CONSTRAINT "TradeIn_b2bOfferId_fkey" FOREIGN KEY ("b2bOfferId") REFERENCES "B2BOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
