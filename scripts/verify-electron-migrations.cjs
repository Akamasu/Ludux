const { app } = require('electron')
const Database = require('better-sqlite3')
const {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} = require('node:fs/promises')
const { pathToFileURL } = require('node:url')
const { join } = require('node:path')
const { tmpdir } = require('node:os')

async function createMigration(migrationsDirectory, name, sql) {
  const directory = join(migrationsDirectory, name)
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'migration.sql'), sql)
}

app
  .whenReady()
  .then(async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'ludux-migrations-'))

    try {
      const migrationModuleUrl = pathToFileURL(
        join(__dirname, '..', 'out', 'main', 'database-migrations.js'),
      ).toString()
      const { runBundledDatabaseMigrations } = await import(migrationModuleUrl)
      const migrationsDirectory = join(rootDirectory, 'migrations')
      const backupDirectory = join(rootDirectory, 'backups')
      const databasePath = join(rootDirectory, 'database', 'ludux.db')

      await createMigration(
        migrationsDirectory,
        '001_init',
        'CREATE TABLE "Game" ("id" TEXT NOT NULL PRIMARY KEY);',
      )

      const initialResult = await runBundledDatabaseMigrations({
        appVersion: '0.9.0',
        backupDirectory,
        databasePath,
        migrationsDirectory,
      })

      if (
        initialResult.appliedMigrations.length !== 1 ||
        initialResult.backupPath !== null
      ) {
        throw new Error('Unexpected initial database migration result.')
      }

      await createMigration(
        migrationsDirectory,
        '002_title',
        'ALTER TABLE "Game" ADD COLUMN "title" TEXT;',
      )

      const updateResult = await runBundledDatabaseMigrations({
        appVersion: '1.0.0',
        backupDirectory,
        databasePath,
        migrationsDirectory,
        now: new Date('2026-07-26T12:00:00.000Z'),
      })

      if (
        updateResult.appliedMigrations.length !== 1 ||
        !updateResult.backupPath
      ) {
        throw new Error('Pending migration was not applied with a backup.')
      }

      await readFile(updateResult.backupPath)

      const database = new Database(databasePath, { readonly: true })
      const columns = database.pragma('table_info("Game")')
      const appliedMigrations = database
        .prepare('SELECT "name" FROM "LuduxMigration" ORDER BY "name"')
        .all()
      database.close()

      if (
        columns.map((column) => column.name).join(',') !== 'id,title' ||
        appliedMigrations.map((migration) => migration.name).join(',') !==
          '001_init,002_title'
      ) {
        throw new Error('Migrated database schema is incomplete.')
      }

      console.log('electron database migrations ok (backup verified)')
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
