const { app } = require('electron')
const Database = require('better-sqlite3')
const { mkdir, mkdtemp, rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { pathToFileURL } = require('node:url')

app
  .whenReady()
  .then(async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'ludux-gog-'))

    try {
      const galaxyDirectory = join(rootDirectory, 'GOG.com', 'Galaxy', 'storage')
      const databasePath = join(galaxyDirectory, 'galaxy-2.0.db')
      await mkdir(galaxyDirectory, { recursive: true })

      const database = new Database(databasePath)
      database.exec(`
        CREATE TABLE "GamePieceTypes" ("id" INTEGER, "type" TEXT);
        CREATE TABLE "GamePieces" (
          "releaseKey" TEXT,
          "gamePieceTypeId" INTEGER,
          "userId" INTEGER,
          "value" TEXT,
          "languageId" INTEGER
        );
        CREATE TABLE "GameTimes" (
          "userId" INTEGER,
          "releaseKey" TEXT,
          "minutesInGame" INTEGER
        );
        CREATE TABLE "InstalledBaseProducts" (
          "productId" INTEGER,
          "installationPath" TEXT
        );
        CREATE TABLE "LastPlayedDates" (
          "userId" INTEGER,
          "gameReleaseKey" TEXT,
          "lastPlayedDate" TEXT
        );
        CREATE TABLE "LibraryReleases" (
          "id" INTEGER,
          "userId" INTEGER,
          "releaseKey" TEXT
        );
        CREATE TABLE "LicensedReleases" (
          "libraryId" INTEGER,
          "isOwned" INTEGER
        );
        CREATE TABLE "ProductPurchaseDates" (
          "gameReleaseKey" TEXT,
          "userId" INTEGER,
          "purchaseDate" TEXT,
          "addedDate" TEXT
        );
        CREATE TABLE "ReleaseProperties" (
          "releaseKey" TEXT,
          "isDlc" INTEGER
        );
        CREATE TABLE "Achievements" (
          "gameReleaseKey" TEXT,
          "apikey" TEXT,
          "backendId" TEXT,
          "imageUnlockedUrl" TEXT,
          "imageLockedUrl" TEXT,
          "isVisible" INTEGER,
          "rarity" REAL,
          "raritySlug" TEXT
        );
        CREATE TABLE "LocalizedAchievements" (
          "gameReleaseKey" TEXT,
          "apikey" TEXT,
          "name" TEXT,
          "description" TEXT,
          "languageId" INTEGER,
          "isLocalized" INTEGER
        );
        CREATE TABLE "UserAchievements" (
          "gameReleaseKey" TEXT,
          "userId" INTEGER,
          "apikey" TEXT,
          "unlockTime" TEXT,
          "isUnlocked" INTEGER
        );
        CREATE TABLE "UserRecentClientLanguages" (
          "languageId" INTEGER,
          "userId" INTEGER,
          "lastUsed" TEXT
        );

        INSERT INTO "GamePieceTypes" VALUES (493, 'title');
        INSERT INTO "GamePieceTypes" VALUES (445, 'originalImages');
        INSERT INTO "GamePieceTypes" VALUES (443, 'dlcs');
        INSERT INTO "GamePieces" VALUES (
          'gog_1423049311',
          493,
          NULL,
          '{"title":"Cyberpunk 2077"}',
          NULL
        );
        INSERT INTO "GamePieces" VALUES (
          'gog_1423049311',
          443,
          NULL,
          '{"dlcs":["gog_1256837418"]}',
          NULL
        );
        INSERT INTO "GamePieces" VALUES (
          'gog_1256837418',
          493,
          NULL,
          '{"title":"Cyberpunk 2077: Phantom Liberty"}',
          NULL
        );
        INSERT INTO "GamePieces" VALUES (
          'gog_1423049311',
          445,
          NULL,
          '{"verticalCover":"https://images.gog.com/cyberpunk.webp"}',
          NULL
        );
        INSERT INTO "GameTimes" VALUES (1, 'gog_1423049311', 125);
        INSERT INTO "InstalledBaseProducts" VALUES (
          1423049311,
          'C:\\GOG Games\\Cyberpunk 2077'
        );
        INSERT INTO "LastPlayedDates" VALUES (
          1,
          'gog_1423049311',
          '2026-07-22 21:15:00'
        );
        INSERT INTO "LibraryReleases" VALUES (1, 1, 'gog_1423049311');
        INSERT INTO "LibraryReleases" VALUES (2, 1, 'gog_1256837418');
        INSERT INTO "LicensedReleases" VALUES (1, 1);
        INSERT INTO "LicensedReleases" VALUES (2, 1);
        INSERT INTO "ProductPurchaseDates" VALUES (
          'gog_1423049311',
          1,
          NULL,
          '2024-12-08 12:16:56'
        );
        INSERT INTO "ReleaseProperties" VALUES ('gog_1423049311', 0);
        INSERT INTO "ReleaseProperties" VALUES ('gog_1256837418', 1);
        INSERT INTO "Achievements" VALUES (
          'gog_1423049311',
          'ACH_THE_FOOL',
          '1',
          'https://images.gog.com/the-fool.jpg',
          NULL,
          1,
          10,
          'common'
        );
        INSERT INTO "LocalizedAchievements" VALUES (
          'gog_1423049311',
          'ACH_THE_FOOL',
          'Le Fou',
          'Devenir mercenaire.',
          24,
          1
        );
        INSERT INTO "UserAchievements" VALUES (
          'gog_1423049311',
          1,
          'ACH_THE_FOOL',
          '2026-07-20 22:10:00',
          1
        );
        INSERT INTO "UserRecentClientLanguages" VALUES (
          24,
          1,
          '2026-07-22 21:15:00'
        );
      `)
      database.close()

      process.env['PROGRAMDATA'] = rootDirectory
      process.env['LUDUX_GOG_GALAXY_DB_PATH'] = databasePath
      process.env['LUDUX_GOG_LIBRARY_PATHS'] = join(rootDirectory, 'Games')
      process.env['LUDUX_GOG_REGISTRY_PATHS'] = ''

      const moduleUrl = pathToFileURL(
        join(__dirname, '..', 'out', 'main', 'local-platforms.js'),
      ).toString()
      const { readGogLocalLibrary } = await import(moduleUrl)
      const library = await readGogLocalLibrary()
      const game = library.games.find(
        (item) => item.externalId === '1423049311',
      )

      if (
        !game ||
        game.title !== 'Cyberpunk 2077' ||
        game.playtimeMinutes !== 125 ||
        game.coverUrl !== 'https://images.gog.com/cyberpunk.webp' ||
        game.dlcs?.[0]?.title !==
          'Cyberpunk 2077: Phantom Liberty' ||
        game.dlcs?.[0]?.owned !== true ||
        game.achievements?.[0]?.name !== 'Le Fou' ||
        game.achievements?.[0]?.unlocked !== true
      ) {
        throw new Error('La bibliothèque GOG Galaxy locale est incomplète.')
      }

      console.log(
        `electron gog library ok (${library.galaxyGameCount} Galaxy game)`,
      )
    } finally {
      await rm(rootDirectory, {
        recursive: true,
        force: true,
      })
    }

    app.quit()
  })
  .catch((error) => {
    console.error(error)
    app.exit(1)
  })
