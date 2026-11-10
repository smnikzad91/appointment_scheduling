-- Who a salon / independent stylist serves (آقایان / بانوان); null for the existing ones until the admin sets it.
CREATE TYPE "ClientGender" AS ENUM ('MEN', 'WOMEN');

ALTER TABLE "salons" ADD COLUMN "clientGender" "ClientGender";

CREATE INDEX "salons_clientGender_idx" ON "salons"("clientGender");
