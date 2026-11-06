-- Live chat images: reactions per side, caption edits, comments linked to an image, and a change time for polling.
ALTER TABLE "live_chat_messages" ADD COLUMN "visitorReaction" TEXT,
ADD COLUMN "supportReaction" TEXT,
ADD COLUMN "editedAt" TIMESTAMP(3),
ADD COLUMN "replyToId" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "live_chat_messages_chatId_updatedAt_idx" ON "live_chat_messages"("chatId", "updatedAt");

ALTER TABLE "live_chat_messages" ADD CONSTRAINT "live_chat_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "live_chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
