UPDATE "Game"
SET "personalNote" = "description"
WHERE "personalNote" IS NULL
  AND "description" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "ExternalGame"
    WHERE "ExternalGame"."gameId" = "Game"."id"
      AND "ExternalGame"."provider" = 'RAWG'
  );
