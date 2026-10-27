-- AlterTable
ALTER TABLE "LsgConnection" ADD COLUMN     "credentialConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "credentialState" TEXT NOT NULL DEFAULT 'NONE';
