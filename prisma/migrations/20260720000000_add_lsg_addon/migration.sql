-- Addon LifeSync-Games: vínculo + outbox de eventos conductuales.
-- Solo crea tablas nuevas; ninguna tabla existente se modifica.

-- CreateTable
CREATE TABLE "LsgConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lsgPlayerId" INTEGER NOT NULL,
    "lsgEmail" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "disabledEvents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "LsgConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LsgEventOutbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "clientRef" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LsgEventOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LsgConnection_userId_key" ON "LsgConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LsgEventOutbox_clientRef_key" ON "LsgEventOutbox"("clientRef");

-- CreateIndex
CREATE UNIQUE INDEX "LsgEventOutbox_userId_eventType_periodKey_key" ON "LsgEventOutbox"("userId", "eventType", "periodKey");

-- CreateIndex
CREATE INDEX "LsgEventOutbox_status_createdAt_idx" ON "LsgEventOutbox"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "LsgConnection" ADD CONSTRAINT "LsgConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LsgEventOutbox" ADD CONSTRAINT "LsgEventOutbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
