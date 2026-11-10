-- Public «نظرات و پیشنهادات» form (/feedback): messages read by the platform admin at /admin/feedback.

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "role" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_createdAt_idx" ON "feedback"("createdAt");

