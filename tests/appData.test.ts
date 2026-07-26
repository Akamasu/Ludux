import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import {
  getLuduxDatabasePath,
  migrateLegacyLuduxData,
} from '../src/services/app-data'

const temporaryDirectories: string[] = []

async function createTemporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'ludux-app-data-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        recursive: true,
        force: true,
      }),
    ),
  )
})

describe('Ludux app data migration', () => {
  it('copies legacy data and keeps a backup beside the source database', async () => {
    const rootDirectory = await createTemporaryDirectory()
    const sourceDirectory = join(rootDirectory, 'legacy')
    const targetDirectory = join(rootDirectory, 'target')
    const sourceDatabasePath = getLuduxDatabasePath(sourceDirectory)

    await mkdir(join(sourceDirectory, 'database'), { recursive: true })
    await mkdir(join(sourceDirectory, 'media', 'screenshots'), { recursive: true })
    await writeFile(sourceDatabasePath, 'database-content')
    await writeFile(
      join(sourceDirectory, 'media', 'screenshots', 'memory.png'),
      'image-content',
    )

    const result = await migrateLegacyLuduxData({
      legacyDirectories: [sourceDirectory],
      targetDirectory,
      now: new Date('2026-07-26T12:00:00.000Z'),
    })

    expect(result.migrated).toBe(true)
    expect(result.sourceDirectory).toBe(sourceDirectory)
    expect(result.backupPath).toContain('backup-before-storage-migration')
    await expect(readFile(getLuduxDatabasePath(targetDirectory), 'utf8')).resolves.toBe(
      'database-content',
    )
    await expect(
      readFile(join(targetDirectory, 'media', 'screenshots', 'memory.png'), 'utf8'),
    ).resolves.toBe('image-content')
    await expect(readFile(result.backupPath ?? '', 'utf8')).resolves.toBe(
      'database-content',
    )
  })

  it('does not overwrite a database already present in the target directory', async () => {
    const rootDirectory = await createTemporaryDirectory()
    const sourceDirectory = join(rootDirectory, 'legacy')
    const targetDirectory = join(rootDirectory, 'target')

    await mkdir(join(sourceDirectory, 'database'), { recursive: true })
    await mkdir(join(targetDirectory, 'database'), { recursive: true })
    await writeFile(getLuduxDatabasePath(sourceDirectory), 'legacy-database')
    await writeFile(getLuduxDatabasePath(targetDirectory), 'current-database')

    const result = await migrateLegacyLuduxData({
      legacyDirectories: [sourceDirectory],
      targetDirectory,
    })

    expect(result.migrated).toBe(false)
    await expect(readFile(getLuduxDatabasePath(targetDirectory), 'utf8')).resolves.toBe(
      'current-database',
    )
  })
})
