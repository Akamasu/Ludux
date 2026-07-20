-- CreateTable
CREATE TABLE "ExternalGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "playSessionId" TEXT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceTitle" TEXT,
    "sourceCoverUrl" TEXT,
    "lastPlaytimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExternalGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExternalGame_playSessionId_fkey" FOREIGN KEY ("playSessionId") REFERENCES "PlaySession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalGame_provider_externalId_key" ON "ExternalGame"("provider", "externalId");

-- CreateIndex
CREATE INDEX "ExternalGame_gameId_idx" ON "ExternalGame"("gameId");

-- CreateIndex
CREATE INDEX "ExternalGame_playSessionId_idx" ON "ExternalGame"("playSessionId");

-- CreateIndex
CREATE INDEX "ExternalGame_provider_idx" ON "ExternalGame"("provider");
