-- Live chat: AI answers first (mode AI / PENDING / HUMAN, sender AI, hand-over), one Telegram message per
-- conversation (thread + «🔔» alert ids), «✍️ پاسخ» state, AI cost per answer, and the AI settings (ported from mychatbot).

-- CreateEnum
CREATE TYPE "LiveChatMode" AS ENUM ('AI', 'PENDING', 'HUMAN');

-- AlterEnum
ALTER TYPE "LiveChatSender" ADD VALUE 'AI';

-- AlterTable
ALTER TABLE "live_chats" ADD COLUMN     "handoverAt" TIMESTAMP(3),
ADD COLUMN     "mode" "LiveChatMode" NOT NULL DEFAULT 'AI',
ADD COLUMN     "tgPingId" INTEGER,
ADD COLUMN     "tgThreadFrom" TIMESTAMP(3),
ADD COLUMN     "tgThreadId" INTEGER;

-- CreateTable
CREATE TABLE "live_chat_answering" (
    "tgUserId" BIGINT NOT NULL,
    "chatId" TEXT NOT NULL,
    "promptId" INTEGER,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_chat_answering_pkey" PRIMARY KEY ("tgUserId")
);

-- CreateTable
CREATE TABLE "live_chat_ai_usage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT,
    "model" TEXT NOT NULL,
    "generationId" TEXT,
    "promptTokens" INTEGER,
    "cachedTokens" INTEGER,
    "completionTokens" INTEGER,
    "costUsd" DECIMAL(14,8),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_chat_ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_chat_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "handoverPhone" TEXT NOT NULL DEFAULT '09119100991',
    "tomanPerUsd" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_chat_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_chat_answering_chatId_idx" ON "live_chat_answering"("chatId");

-- CreateIndex
CREATE INDEX "live_chat_ai_usage_createdAt_idx" ON "live_chat_ai_usage"("createdAt");

-- CreateIndex
CREATE INDEX "live_chat_ai_usage_status_createdAt_idx" ON "live_chat_ai_usage"("status", "createdAt");

-- CreateIndex
CREATE INDEX "live_chat_ai_usage_chatId_idx" ON "live_chat_ai_usage"("chatId");

-- AddForeignKey
ALTER TABLE "live_chat_answering" ADD CONSTRAINT "live_chat_answering_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "live_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_chat_ai_usage" ADD CONSTRAINT "live_chat_ai_usage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "live_chats"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Conversations support has already answered stay with a person.
UPDATE "live_chats" SET "mode" = 'HUMAN' WHERE EXISTS (SELECT 1 FROM "live_chat_messages" m WHERE m."chatId" = "live_chats"."id" AND m."sender" = 'ADMIN' AND m."author" IS DISTINCT FROM 'پاسخ خودکار');
