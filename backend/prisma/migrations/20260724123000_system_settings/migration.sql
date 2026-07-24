-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "firmName" TEXT NOT NULL DEFAULT 'LegalTrack',
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Accra',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SystemSettings" ("id", "firmName", "timezone", "updatedAt")
VALUES ('default', 'LegalTrack', 'Africa/Accra', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
