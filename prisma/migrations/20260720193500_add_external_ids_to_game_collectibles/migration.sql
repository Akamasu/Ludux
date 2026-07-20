ALTER TABLE "Dlc" ADD COLUMN "provider" TEXT;
ALTER TABLE "Dlc" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Achievement" ADD COLUMN "externalId" TEXT;

CREATE UNIQUE INDEX "Dlc_gameId_provider_externalId_key" ON "Dlc"("gameId", "provider", "externalId");
CREATE UNIQUE INDEX "Achievement_gameId_provider_externalId_key" ON "Achievement"("gameId", "provider", "externalId");
