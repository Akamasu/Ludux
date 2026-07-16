-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "releaseDate" DATETIME,
    "developer" TEXT,
    "publisher" TEXT,
    "website" TEXT,
    "status" TEXT NOT NULL DEFAULT 'BACKLOG',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "generation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GamePlatform" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "version" TEXT,
    "owned" BOOLEAN NOT NULL DEFAULT false,
    "played" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "GamePlatform_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GamePlatform_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "releaseDate" DATETIME,
    CONSTRAINT "GameVersion_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dlc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "releaseDate" DATETIME,
    "owned" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Dlc_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlockDate" DATETIME,
    "provider" TEXT,
    CONSTRAINT "Achievement_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlaySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "platformId" TEXT,
    "start" DATETIME NOT NULL,
    "end" DATETIME,
    "durationMinutes" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlaySession_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlaySession_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chronicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emotion" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chronicle_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Screenshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "chronicleId" TEXT,
    "path" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Screenshot_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Screenshot_chronicleId_fkey" FOREIGN KEY ("chronicleId") REFERENCES "Chronicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "mainMemory" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CollectionGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    CONSTRAINT "CollectionGame_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ChronicleTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chronicleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "ChronicleTag_chronicleId_fkey" FOREIGN KEY ("chronicleId") REFERENCES "Chronicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChronicleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExternalAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "username" TEXT,
    "tokenHint" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SyncData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "lastSync" DATETIME,
    "status" TEXT,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Statistics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "gamesCompleted" INTEGER NOT NULL DEFAULT 0,
    "gamesOwned" INTEGER NOT NULL DEFAULT 0,
    "achievementsUnlocked" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Backup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Game_title_idx" ON "Game"("title");

-- CreateIndex
CREATE INDEX "Game_status_idx" ON "Game"("status");

-- CreateIndex
CREATE INDEX "Game_archived_idx" ON "Game"("archived");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_name_key" ON "Platform"("name");

-- CreateIndex
CREATE INDEX "Platform_name_idx" ON "Platform"("name");

-- CreateIndex
CREATE INDEX "GamePlatform_platformId_idx" ON "GamePlatform"("platformId");

-- CreateIndex
CREATE UNIQUE INDEX "GamePlatform_gameId_platformId_version_key" ON "GamePlatform"("gameId", "platformId", "version");

-- CreateIndex
CREATE INDEX "GameVersion_gameId_idx" ON "GameVersion"("gameId");

-- CreateIndex
CREATE INDEX "Dlc_gameId_idx" ON "Dlc"("gameId");

-- CreateIndex
CREATE INDEX "Achievement_gameId_idx" ON "Achievement"("gameId");

-- CreateIndex
CREATE INDEX "Achievement_name_idx" ON "Achievement"("name");

-- CreateIndex
CREATE INDEX "PlaySession_gameId_idx" ON "PlaySession"("gameId");

-- CreateIndex
CREATE INDEX "PlaySession_platformId_idx" ON "PlaySession"("platformId");

-- CreateIndex
CREATE INDEX "PlaySession_start_idx" ON "PlaySession"("start");

-- CreateIndex
CREATE INDEX "Chronicle_gameId_idx" ON "Chronicle"("gameId");

-- CreateIndex
CREATE INDEX "Chronicle_date_idx" ON "Chronicle"("date");

-- CreateIndex
CREATE INDEX "Screenshot_gameId_idx" ON "Screenshot"("gameId");

-- CreateIndex
CREATE INDEX "Screenshot_chronicleId_idx" ON "Screenshot"("chronicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_gameId_key" ON "Review"("gameId");

-- CreateIndex
CREATE INDEX "Collection_name_idx" ON "Collection"("name");

-- CreateIndex
CREATE INDEX "CollectionGame_gameId_idx" ON "CollectionGame"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionGame_collectionId_gameId_key" ON "CollectionGame"("collectionId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "ChronicleTag_tagId_idx" ON "ChronicleTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ChronicleTag_chronicleId_tagId_key" ON "ChronicleTag"("chronicleId", "tagId");

-- CreateIndex
CREATE INDEX "ExternalAccount_provider_idx" ON "ExternalAccount"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalAccount_provider_externalId_key" ON "ExternalAccount"("provider", "externalId");

-- CreateIndex
CREATE INDEX "SyncData_provider_idx" ON "SyncData"("provider");
