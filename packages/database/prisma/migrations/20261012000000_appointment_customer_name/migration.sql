-- Staff can set the customer's first/last name on a single booking (salon or stylist edit sheet).
-- Null = show the customer's account name, so existing bookings are unchanged.
ALTER TABLE "appointments" ADD COLUMN "customerFirstName" TEXT,
ADD COLUMN "customerLastName" TEXT;
