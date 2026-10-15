ALTER TABLE "Court" ADD COLUMN "sharedCourtGroupId" TEXT;

CREATE INDEX "Court_sharedCourtGroupId_idx" ON "Court"("sharedCourtGroupId");
