-- Add optional tracking dates for DLC ownership and completion.
ALTER TABLE "Dlc" ADD COLUMN "ownedAt" DATETIME;
ALTER TABLE "Dlc" ADD COLUMN "completedAt" DATETIME;
