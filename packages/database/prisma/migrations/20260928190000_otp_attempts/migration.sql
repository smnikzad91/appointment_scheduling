-- Wrong guesses per OTP code, so a 5-digit code can't be brute-forced (burned after 5).
ALTER TABLE "otp_codes" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
