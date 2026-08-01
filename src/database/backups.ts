import Database from 'better-sqlite3'
import { copyFile, mkdir, rm, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

export interface DatabaseBackupInspection {
  path: string
  sizeBytes: number
  modifiedAt: string
  gameCount: number
}

export interface DatabaseRestoreResult extends DatabaseBackupInspection {
  recoveryPath: string | null
}

function createTimestamp(date: Date) {
  return date.toISOString().replace(/[:.]/g, '-')
}

async function fileExists(path: string) {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

function tableExists(database: Database.Database, tableName: string) {
  return Boolean(
    database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
      .get(tableName),
  )
}

export async function inspectLuduxDatabaseBackup(
  backupPath: string,
): Promise<DatabaseBackupInspection> {
  let database: Database.Database | null = null

  try {
    const file = await stat(backupPath)

    if (!file.isFile() || file.size === 0) {
      throw new Error('Le fichier de sauvegarde est vide ou inaccessible.')
    }

    database = new Database(backupPath, {
      fileMustExist: true,
      readonly: true,
    })

    const integrityRows = database.pragma('quick_check') as Record<string, unknown>[]
    const integrityMessages = integrityRows.flatMap((row) => Object.values(row))

    if (
      integrityMessages.length === 0 ||
      integrityMessages.some((message) => String(message).toLowerCase() !== 'ok')
    ) {
      throw new Error('La sauvegarde SQLite est endommagée.')
    }

    if (!tableExists(database, 'Game')) {
      throw new Error('Ce fichier ne contient pas de bibliothèque Ludux.')
    }

    const gameCount = Number(
      (database.prepare('SELECT COUNT(*) AS count FROM "Game"').get() as { count: number })
        .count,
    )

    return {
      path: backupPath,
      sizeBytes: file.size,
      modifiedAt: file.mtime.toISOString(),
      gameCount,
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Le ')) {
      throw error
    }

    throw new Error(
      'Le fichier sélectionné n’est pas une sauvegarde Ludux valide.',
      { cause: error },
    )
  } finally {
    database?.close()
  }
}

export async function restoreLuduxDatabaseBackup({
  backupDirectory,
  backupPath,
  databasePath,
  now = new Date(),
}: {
  backupDirectory: string
  backupPath: string
  databasePath: string
  now?: Date
}): Promise<DatabaseRestoreResult> {
  if (resolve(backupPath) === resolve(databasePath)) {
    throw new Error('La base active ne peut pas être utilisée comme sauvegarde.')
  }

  const inspection = await inspectLuduxDatabaseBackup(backupPath)
  const timestamp = createTimestamp(now)
  const temporaryPath = join(dirname(databasePath), `.ludux-restore-${timestamp}.db`)
  let recoveryPath: string | null = null

  await mkdir(dirname(databasePath), { recursive: true })
  await mkdir(backupDirectory, { recursive: true })

  try {
    await copyFile(backupPath, temporaryPath)
    await inspectLuduxDatabaseBackup(temporaryPath)

    if (await fileExists(databasePath)) {
      recoveryPath = join(
        backupDirectory,
        `ludux-backup-before-restore-${timestamp}.db`,
      )
      await copyFile(databasePath, recoveryPath)
    }

    await Promise.all([
      rm(`${databasePath}-wal`, { force: true }),
      rm(`${databasePath}-shm`, { force: true }),
    ])
    await copyFile(temporaryPath, databasePath)
    await inspectLuduxDatabaseBackup(databasePath)
  } catch (error) {
    if (recoveryPath) {
      try {
        await copyFile(recoveryPath, databasePath)
      } catch {
        // Keep the original restore error; the recovery copy remains available.
      }
    }

    throw new Error('La restauration a échoué. La base précédente a été conservée.', {
      cause: error,
    })
  } finally {
    await rm(temporaryPath, { force: true })
  }

  return {
    ...inspection,
    recoveryPath,
  }
}
