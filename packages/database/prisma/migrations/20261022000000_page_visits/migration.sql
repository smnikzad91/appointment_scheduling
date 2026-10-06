-- CreateEnum
CREATE TYPE "VisitKind" AS ENUM ('VIEW', 'BOOKING_OPEN', 'BOOKING_DONE', 'DOWNLOAD');

-- CreateTable
CREATE TABLE "page_visits" (
    "id" TEXT NOT NULL,
    "kind" "VisitKind" NOT NULL DEFAULT 'VIEW',
    "path" TEXT NOT NULL,
    "salonSlug" TEXT,
    "visitorHash" TEXT NOT NULL,
    "referrerType" TEXT NOT NULL,
    "referrerSource" TEXT,
    "referrerRaw" TEXT,
    "browser" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_visits_createdAt_idx" ON "page_visits"("createdAt");

-- CreateIndex
CREATE INDEX "page_visits_kind_createdAt_idx" ON "page_visits"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "page_visits_path_createdAt_idx" ON "page_visits"("path", "createdAt");

-- CreateIndex
CREATE INDEX "page_visits_visitorHash_createdAt_idx" ON "page_visits"("visitorHash", "createdAt");

-- CreateIndex
CREATE INDEX "page_visits_salonSlug_createdAt_idx" ON "page_visits"("salonSlug", "createdAt");

