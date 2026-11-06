-- Booking chat between the customer and the salon.
ALTER TYPE "NotificationType" ADD VALUE 'NEW_MESSAGE';

CREATE TYPE "AppointmentChatSide" AS ENUM ('CUSTOMER', 'SALON');

ALTER TABLE "appointments" ADD COLUMN "chatCustomerReadAt" TIMESTAMP(3),
ADD COLUMN "chatSalonReadAt" TIMESTAMP(3);

CREATE TABLE "appointment_messages" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "side" "AppointmentChatSide" NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "appointment_messages_appointmentId_createdAt_idx" ON "appointment_messages"("appointmentId", "createdAt");

ALTER TABLE "appointment_messages" ADD CONSTRAINT "appointment_messages_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
