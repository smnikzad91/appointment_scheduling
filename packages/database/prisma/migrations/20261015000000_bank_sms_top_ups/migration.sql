-- CreateEnum
CREATE TYPE "TopUpStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BankSmsStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'NOT_DEPOSIT', 'IGNORED');

-- AlterTable
ALTER TABLE "admin_cards" ADD COLUMN     "smsSender" TEXT,
ADD COLUMN     "smsTemplate" TEXT;

-- CreateTable
CREATE TABLE "wallet_top_ups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminCardId" TEXT NOT NULL,
    "amountToman" INTEGER NOT NULL,
    "offsetRial" INTEGER NOT NULL,
    "payableRial" BIGINT NOT NULL,
    "status" "TopUpStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "creditedToman" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_top_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_sms" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "adminCardId" TEXT,
    "amountRial" BIGINT,
    "balanceRial" BIGINT,
    "status" "BankSmsStatus" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "topUpId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_sms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_sms_devices" (
    "id" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "signal" INTEGER,
    "info" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_sms_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_top_ups_adminCardId_status_payableRial_idx" ON "wallet_top_ups"("adminCardId", "status", "payableRial");

-- CreateIndex
CREATE INDEX "wallet_top_ups_userId_createdAt_idx" ON "wallet_top_ups"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bank_sms_hash_key" ON "bank_sms"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "bank_sms_topUpId_key" ON "bank_sms"("topUpId");

-- CreateIndex
CREATE INDEX "bank_sms_status_createdAt_idx" ON "bank_sms"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "wallet_top_ups" ADD CONSTRAINT "wallet_top_ups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_top_ups" ADD CONSTRAINT "wallet_top_ups_adminCardId_fkey" FOREIGN KEY ("adminCardId") REFERENCES "admin_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_sms" ADD CONSTRAINT "bank_sms_adminCardId_fkey" FOREIGN KEY ("adminCardId") REFERENCES "admin_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_sms" ADD CONSTRAINT "bank_sms_topUpId_fkey" FOREIGN KEY ("topUpId") REFERENCES "wallet_top_ups"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Two pending top-ups on one card can never share an exact amount: the amount is what identifies the
-- payer in the bank SMS. (A partial index Prisma's schema can't express — keep it if migrations are
-- regenerated.)
CREATE UNIQUE INDEX "wallet_top_ups_pending_amount_key" ON "wallet_top_ups"("adminCardId", "payableRial") WHERE "status" = 'PENDING';
