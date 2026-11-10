-- Wallet top-ups through nodepass.ir: no AdminCard; the card nodepass picked is stored on the row.
-- AlterTable
ALTER TABLE "wallet_top_ups" ADD COLUMN     "cardBankName" TEXT,
ADD COLUMN     "cardNumber" TEXT,
ADD COLUMN     "cardOwnerName" TEXT,
ADD COLUMN     "nodepassPaymentId" TEXT,
ADD COLUMN     "trackingCode" TEXT,
ALTER COLUMN "adminCardId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "wallet_top_ups_nodepassPaymentId_key" ON "wallet_top_ups"("nodepassPaymentId");

