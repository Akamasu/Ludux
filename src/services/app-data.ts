import { copyFile, cp, mkdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const legacyDataDirectoryName = 'userdata'
const databaseRelativePath = join('database', 'ludux.db')

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

export function getLuduxDataDirectory() {
  const configuredDirectory = process.env['LUDUX_DATA_DIR']?.trim()
  return resolve(configuredDirectory || legacyDataDirectoryName)
}

export function getLuduxDataPath(...segments: string[]) {
  return join(getLuduxDataDirectory(), ...segments)
}

export function getLuduxDatabasePath(dataDirectory = getLuduxDataDirectory()) {
  return join(dataDirectory, databaseRelativePath)
}

export interface LegacyDataMigrationResult {
  migrated: boolean
  sourceDirectory: string | null
  targetDirectory: string
  backupPath: string | null
}

export async function migrateLegacyLuduxData({
  legacyDirectories,
  now = new Date(),
  targetDirectory,
}: {
  legacyDirectories: string[]
  now?: Date
  targetDirectory: string
}): Promise<LegacyDataMigrationResult> {
  const resolvedTargetDirectory = resolve(targetDirectory)
  const targetDatabasePath = getLuduxDatabasePath(resolvedTargetDirectory)

  if (await fileExists(targetDatabasePath)) {
    return {
      migrated: false,
      sourceDirectory: null,
      targetDirectory: resolvedTargetDirectory,
      backupPath: null,
    }
  }

  const uniqueLegacyDirectories = Array.from(
    new Set(legacyDirectories.map((directory) => resolve(directory))),
  ).filter((directory) => directory !== resolvedTargetDirectory)
  let sourceDirectory: string | null = null

  for (const candidateDirectory of uniqueLegacyDirectories) {
    if (await fileExists(getLuduxDatabasePath(candidateDirectory))) {
      sourceDirectory = candidateDirectory
      break
    }
  }

  if (!sourceDirectory) {
    await mkdir(resolvedTargetDirectory, { recursive: true })

    return {
      migrated: false,
      sourceDirectory: null,
      targetDirectory: resolvedTargetDirectory,
      backupPath: null,
    }
  }

  const sourceDatabasePath = getLuduxDatabasePath(sourceDirectory)
  const sourceBackupDirectory = join(sourceDirectory, 'backups')
  const backupPath = join(
    sourceBackupDirectory,
    `ludux-backup-before-storage-migration-${createTimestamp(now)}.db`,
  )

  await mkdir(sourceBackupDirectory, { recursive: true })
  await copyFile(sourceDatabasePath, backupPath)
  await mkdir(resolvedTargetDirectory, { recursive: true })
  await cp(sourceDirectory, resolvedTargetDirectory, {
    recursive: true,
    force: false,
    errorOnExist: false,
    preserveTimestamps: true,
  })

  if (!(await fileExists(targetDatabasePath))) {
    throw new Error(
      'La copie des données locales vers le dossier Windows n’a pas pu être vérifiée.',
    )
  }

  return {
    migrated: true,
    sourceDirectory,
    targetDirectory: resolvedTargetDirectory,
    backupPath,
  }
}
