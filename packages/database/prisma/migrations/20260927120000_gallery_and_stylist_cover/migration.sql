-- AlterTable
ALTER TABLE "stylists" ADD COLUMN     "coverImageUrl" TEXT;

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "stylistId" TEXT,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gallery_images_salonId_createdAt_idx" ON "gallery_images"("salonId", "createdAt");

-- CreateIndex
CREATE INDEX "gallery_images_stylistId_idx" ON "gallery_images"("stylistId");

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_stylistId_fkey" FOREIGN KEY ("stylistId") REFERENCES "stylists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

