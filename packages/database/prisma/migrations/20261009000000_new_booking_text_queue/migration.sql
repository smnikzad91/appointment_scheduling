-- The stylist's "new booking" SMS now goes out from the reminder job (respecting quiet hours);
-- this marks when it was sent. Bookings that already exist were texted at booking time (the old
-- behaviour), so mark them as done rather than texting them again after the deploy.
ALTER TABLE "appointments" ADD COLUMN "newBookingTextedAt" TIMESTAMP(3);
UPDATE "appointments" SET "newBookingTextedAt" = "createdAt";
