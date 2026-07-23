CREATE TABLE "IgnoredExternalGameLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceTitle" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IgnoredExternalGameLink_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "IgnoredExternalGameLink_gameId_provider_externalId_key" ON "IgnoredExternalGameLink"("gameId", "provider", "externalId");

CREATE INDEX "IgnoredExternalGameLink_gameId_idx" ON "IgnoredExternalGameLink"("gameId");

CREATE INDEX "IgnoredExternalGameLink_provider_externalId_idx" ON "IgnoredExternalGameLink"("provider", "externalId");
