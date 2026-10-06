-- CreateTable
CREATE TABLE "app_releases" (
    "id" TEXT NOT NULL,
    "versionCode" INTEGER NOT NULL,
    "versionName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "certSha256" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,

    CONSTRAINT "app_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_store_links" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "bazaarUrl" TEXT,
    "bazaarComingSoon" BOOLEAN NOT NULL DEFAULT true,
    "myketUrl" TEXT,
    "myketComingSoon" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_store_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_releases_versionCode_key" ON "app_releases"("versionCode");

-- CreateIndex
CREATE UNIQUE INDEX "app_releases_fileName_key" ON "app_releases"("fileName");

-- CreateIndex
CREATE INDEX "app_releases_published_versionCode_idx" ON "app_releases"("published", "versionCode");

