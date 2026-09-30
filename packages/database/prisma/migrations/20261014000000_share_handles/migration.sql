-- Short booking links nobatet.app/book/@<handle> for salons (incl. independent stylists) and
-- stylists. Nullable: existing salons keep working through their slug; nothing is backfilled.

-- AlterTable
ALTER TABLE "salons" ADD COLUMN     "handle" TEXT;

-- AlterTable
ALTER TABLE "stylists" ADD COLUMN     "handle" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "salons_handle_key" ON "salons"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "stylists_handle_key" ON "stylists"("handle");
