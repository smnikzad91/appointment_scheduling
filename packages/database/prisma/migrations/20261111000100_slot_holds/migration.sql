-- A cancelled time is held for the first customer on the waitlist for a few minutes before everyone else hears about it.
CREATE TABLE "slot_holds" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "stylistId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "waitlistEntryId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slot_holds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "slot_holds_code_key" ON "slot_holds"("code");
CREATE INDEX "slot_holds_stylistId_startAt_idx" ON "slot_holds"("stylistId", "startAt");
CREATE INDEX "slot_holds_releasedAt_expiresAt_idx" ON "slot_holds"("releasedAt", "expiresAt");
