CREATE TABLE "ImeiLookup" (
 "id" TEXT PRIMARY KEY,
 "historyId" TEXT,
 "result" JSONB,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "lockedUntil" TIMESTAMP(3) NOT NULL,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "ContactRequest" (
 "id" TEXT PRIMARY KEY,
 "payloadHash" TEXT NOT NULL,
 "data" JSONB NOT NULL,
 "acceptedRecipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 "sentAt" TIMESTAMP(3),
 "lockedUntil" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
