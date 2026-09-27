-- AlterEnum: notifications for customers (booking confirmed, review approved).
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_APPROVED';
