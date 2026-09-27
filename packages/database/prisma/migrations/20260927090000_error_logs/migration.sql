-- CreateEnum
CREATE TYPE "ErrorSource" AS ENUM ('API', 'WEB_SERVER', 'WEB_CLIENT');

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "source" "ErrorSource" NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "method" TEXT,
    "path" TEXT,
    "statusCode" INTEGER,
    "userId" TEXT,
    "userAgent" TEXT,
    "context" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "error_logs_createdAt_idx" ON "error_logs"("createdAt");

-- CreateIndex
CREATE INDEX "error_logs_resolved_createdAt_idx" ON "error_logs"("resolved", "createdAt");

