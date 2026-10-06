-- AlterEnum
ALTER TYPE "WalletTxKind" ADD VALUE 'SMS_COST';

-- AlterTable
ALTER TABLE "wallet_transactions" ADD COLUMN     "note" TEXT;

