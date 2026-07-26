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

        INSERT INTO "GamePieceTypes" VALUES (493, 'title');
        INSERT INTO "GamePieceTypes" VALUES (445, 'originalImages');
        INSERT INTO "GamePieces" VALUES (
          'gog_1423049311',
          493,
          NULL,
          '{"title":"Cyberpunk 2077"}',
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
        INSERT INTO "ProductPurchaseDates" VALUES (
          'gog_1423049311',
          1,
          NULL,
          '2024-12-08 12:16:56'
        );
        INSERT INTO "ReleaseProperties" VALUES ('gog_1423049311', 0);
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
        game.coverUrl !== 'https://images.gog.com/cyberpunk.webp'
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
