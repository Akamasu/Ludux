import Database from 'better-sqlite3'
import { copyFile, mkdir, readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

interface MigrationFile {
  name: string
  sql: string
}

export interface DatabaseMigrationResult {
  appliedMigrations: string[]
  backupPath: string | null
  databasePath: string
}

function createTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-')
}

async function fileExists(path: string) {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

async function readMigrationFiles(migrationsDirectory: string) {
  const directories = (await readdir(migrationsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))
  const migrations: MigrationFile[] = []

  for (const directory of directories) {
    const migrationPath = join(migrationsDirectory, directory.name, 'migration.sql')

    if (await fileExists(migrationPath)) {
      migrations.push({
        name: directory.name,
        sql: await readFile(migrationPath, 'utf8'),
      })
    }
  }

  return migrations
}

function tableExists(database: Database.Database, tableName: string) {
  return Boolean(
    database
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
      )
      .get(tableName),
  )
}

function readAppliedMigrationNames(database: Database.Database) {
  if (tableExists(database, 'LuduxMigration')) {
    return new Set(
      database
        .prepare('SELECT "name" FROM "LuduxMigration"')
        .all()
        .map((row) => (row as { name: string }).name),
    )
  }

  if (tableExists(database, '_prisma_migrations')) {
    return new Set(
      database
        .prepare(
          `SELECT "migration_name"
           FROM "_prisma_migrations"
           WHERE "finished_at" IS NOT NULL
             AND "rolled_back_at" IS NULL`,
        )
        .all()
        .map((row) => (row as { migration_name: string }).migration_name),
    )
  }

  return new Set<string>()
}

function ensureMigrationTable(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS "LuduxMigration" (
      "name" TEXT NOT NULL PRIMARY KEY,
      "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

function recordAppliedMigration(database: Database.Database, migrationName: string) {
  database
    .prepare(
      `INSERT OR IGNORE INTO "LuduxMigration" ("name", "appliedAt")
       VALUES (?, CURRENT_TIMESTAMP)`,
    )
    .run(migrationName)
}

export async function runBundledDatabaseMigrations({
  appVersion,
  backupDirectory,
  databasePath,
  migrationsDirectory,
  now = new Date(),
}: {
  appVersion: string
  backupDirectory: string
  databasePath: string
  migrationsDirectory: string
  now?: Date
}): Promise<DatabaseMigrationResult> {
  const migrations = await readMigrationFiles(migrationsDirectory)

  if (migrations.length === 0) {
    throw new Error('Aucune migration de base de données n’est incluse dans Ludux.')
  }

  const hadExistingDatabase = await fileExists(databasePath)
  await mkdir(dirname(databasePath), { recursive: true })

  let database = new Database(databasePath)
  database.pragma('foreign_keys = ON')

  const previouslyAppliedMigrations = readAppliedMigrationNames(database)
  const pendingMigrations = migrations.filter(
    (migration) => !previouslyAppliedMigrations.has(migration.name),
  )
  let backupPath: string | null = null

  if (hadExistingDatabase && pendingMigrations.length > 0) {
    database.pragma('wal_checkpoint(FULL)')
    database.close()

    await mkdir(backupDirectory, { recursive: true })
    backupPath = join(
      backupDirectory,
      `ludux-backup-before-v${appVersion}-${createTimestamp(now)}.db`,
    )
    await copyFile(databasePath, backupPath)
    database = new Database(databasePath)
    database.pragma('foreign_keys = ON')
  }

  try {
    ensureMigrationTable(database)

    for (const migrationName of previouslyAppliedMigrations) {
      recordAppliedMigration(database, migrationName)
    }

    for (const migration of pendingMigrations) {
      database.transaction(() => {
        database.exec(migration.sql)
        recordAppliedMigration(database, migration.name)
      })()
    }
  } finally {
    database.close()
  }

  return {
    appliedMigrations: pendingMigrations.map((migration) => migration.name),
    backupPath,
    databasePath,
  }
}
