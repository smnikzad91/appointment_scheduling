-- CreateTable
CREATE TABLE "home_banner" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "title" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_salons" (
    "salonId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_salons_pkey" PRIMARY KEY ("salonId")
);

-- CreateTable
CREATE TABLE "featured_stylists" (
    "stylistId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_stylists_pkey" PRIMARY KEY ("stylistId")
);

-- CreateIndex
CREATE UNIQUE INDEX "featured_salons_priority_key" ON "featured_salons"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "featured_stylists_priority_key" ON "featured_stylists"("priority");

-- AddForeignKey
ALTER TABLE "featured_salons" ADD CONSTRAINT "featured_salons_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_stylists" ADD CONSTRAINT "featured_stylists_stylistId_fkey" FOREIGN KEY ("stylistId") REFERENCES "stylists"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "featured_salons" ADD CONSTRAINT "featured_salons_priority_range" CHECK ("priority" BETWEEN 1 AND 3);
ALTER TABLE "featured_stylists" ADD CONSTRAINT "featured_stylists_priority_range" CHECK ("priority" BETWEEN 1 AND 3);
