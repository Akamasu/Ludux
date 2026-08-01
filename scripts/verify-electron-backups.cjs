const { app } = require('electron')
const Database = require('better-sqlite3')
const { mkdir, mkdtemp, rm, writeFile } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { pathToFileURL } = require('node:url')

function createLibrary(path, games) {
  const database = new Database(path)
  database.exec('CREATE TABLE "Game" ("id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL)')
  const insert = database.prepare('INSERT INTO "Game" ("id", "title") VALUES (?, ?)')

  for (const game of games) {
    insert.run(game.id, game.title)
  }

  database.close()
}

function readTitles(path) {
  const database = new Database(path, { readonly: true })
  const titles = database
    .prepare('SELECT "title" FROM "Game" ORDER BY "title"')
    .all()
    .map((game) => game.title)
  database.close()
  return titles
}

app
  .whenReady()
  .then(async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'ludux-backups-'))

    try {
      const moduleUrl = pathToFileURL(
        join(__dirname, '..', 'out', 'main', 'database-backups.js'),
      ).toString()
      const {
        inspectLuduxDatabaseBackup,
        restoreLuduxDatabaseBackup,
      } = await import(moduleUrl)
      const databasePath = join(rootDirectory, 'data', 'ludux.db')
      const backupPath = join(rootDirectory, 'selected-backup.db')
      const backupDirectory = join(rootDirectory, 'backups')

      await mkdir(join(rootDirectory, 'data'), { recursive: true })
      createLibrary(databasePath, [{ id: 'current', title: 'Bibliothèque actuelle' }])
      createLibrary(backupPath, [
        { id: 'restored-1', title: 'Jeu restauré A' },
        { id: 'restored-2', title: 'Jeu restauré B' },
      ])

      const inspection = await inspectLuduxDatabaseBackup(backupPath)

      if (inspection.gameCount !== 2) {
        throw new Error('The selected backup game count is incorrect.')
      }

      const result = await restoreLuduxDatabaseBackup({
        backupDirectory,
        backupPath,
        databasePath,
        now: new Date('2026-08-02T12:00:00.000Z'),
      })

      if (!result.recoveryPath) {
        throw new Error('No recovery backup was created before restore.')
      }

      if (readTitles(databasePath).join(',') !== 'Jeu restauré A,Jeu restauré B') {
        throw new Error('The selected backup was not restored.')
      }

      if (readTitles(result.recoveryPath).join(',') !== 'Bibliothèque actuelle') {
        throw new Error('The pre-restore recovery backup is invalid.')
      }

      const invalidPath = join(rootDirectory, 'invalid.db')
      await writeFile(invalidPath, 'not a sqlite database')
      let rejectedInvalidBackup = false

      try {
        await inspectLuduxDatabaseBackup(invalidPath)
      } catch {
        rejectedInvalidBackup = true
      }

      if (!rejectedInvalidBackup) {
        throw new Error('An invalid backup was accepted.')
      }

      console.log('electron database backups ok (restore and recovery verified)')
    } finally {
      await rm(rootDirectory, { recursive: true, force: true })
    }

    app.quit()
  })
  .catch((error) => {
    console.error(error)
    app.exit(1)
  })
