-- Site live chat: visitor conversations answered from a Telegram bot or /admin/live-chat.
CREATE TYPE "LiveChatSender" AS ENUM ('VISITOR', 'ADMIN', 'SYSTEM');

CREATE TABLE "live_chats" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "contact" TEXT,
    "userId" TEXT,
    "page" TEXT,
    "country" TEXT,
    "city" TEXT,
    "closedAt" TIMESTAMP(3),
    "endedByVisitor" BOOLEAN NOT NULL DEFAULT false,
    "supportReadAt" TIMESTAMP(3),
    "visitorReadAt" TIMESTAMP(3),
    "visitorSeenAt" TIMESTAMP(3),
    "supportTypingAt" TIMESTAMP(3),
    "imagesPurgedAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_chats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_chat_messages" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "sender" "LiveChatSender" NOT NULL,
    "text" TEXT NOT NULL,
    "image" JSONB,
    "author" TEXT,
    "tgMessageId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "live_chats_tokenHash_key" ON "live_chats"("tokenHash");
CREATE UNIQUE INDEX "live_chats_code_key" ON "live_chats"("code");
CREATE INDEX "live_chats_lastMessageAt_idx" ON "live_chats"("lastMessageAt");
CREATE INDEX "live_chat_messages_chatId_createdAt_idx" ON "live_chat_messages"("chatId", "createdAt");
CREATE INDEX "live_chat_messages_tgMessageId_idx" ON "live_chat_messages"("tgMessageId");

ALTER TABLE "live_chat_messages" ADD CONSTRAINT "live_chat_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "live_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
