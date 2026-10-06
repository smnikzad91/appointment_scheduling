-- AlterEnum
ALTER TYPE "WalletTxKind" ADD VALUE 'PLAN_CREDIT';

-- DropForeignKey
ALTER TABLE "cards" DROP CONSTRAINT "cards_userId_fkey";

-- DropForeignKey
ALTER TABLE "deposits" DROP CONSTRAINT "deposits_cardId_fkey";

-- DropForeignKey
ALTER TABLE "deposits" DROP CONSTRAINT "deposits_userId_fkey";

-- AlterTable
ALTER TABLE "plan_purchases" ADD COLUMN     "creditedToman" INTEGER,
ADD COLUMN     "endedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "withdrawal_requests" ADD COLUMN     "decidedSmsAt" TIMESTAMP(3),
ADD COLUMN     "decidedSmsAttempts" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "cards";

-- DropTable
DROP TABLE "deposits";

-- DropEnum
DROP TYPE "DepositStatus";


-- Withdrawals decided before this feature are not texted now.
UPDATE "withdrawal_requests" SET "decidedSmsAt" = "decidedAt" WHERE "status" IN ('PAID', 'REJECTED');
