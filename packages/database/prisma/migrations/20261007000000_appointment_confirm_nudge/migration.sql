-- One reminder SMS to the stylist when an online booking is still PENDING hours later.
ALTER TABLE "appointments" ADD COLUMN "confirmNudgedAt" TIMESTAMP(3);
