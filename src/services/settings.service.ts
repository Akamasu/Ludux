import { app, dialog, shell } from 'electron'
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { getDatabaseFilePath, prisma } from '../database/client'
import type { SettingsActionResult, SettingsOverview } from '../types/settings'
import { libraryService } from './library.service'

const userDataDirectory = resolve('userdata')
const exportDirectory = join(userDataDirectory, 'exports')
const backupDirectory = join(userDataDirectory, 'backups')

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

async function readFileSize(path: string | null) {
  if (!path) {
    return 0
  }

  try {
    return (await stat(path)).size
  } catch {
    return 0
  }
}

async function readLastBackupAt() {
  try {
    const files = await readdir(backupDirectory, { withFileTypes: true })
    const backupStats = await Promise.all(
      files
        .filter((file) => file.isFile() && file.name.endsWith('.db'))
        .map(async (file) => stat(join(backupDirectory, file.name))),
    )
    const lastBackup = backupStats.sort(
      (left, right) => right.mtime.getTime() - left.mtime.getTime(),
    )[0]

    return lastBackup?.mtime.toISOString() ?? null
  } catch {
    return null
  }
}

async function buildExportSnapshot() {
  const [games, platforms, collections, tags, statistics] = await Promise.all([
    prisma.game.findMany({
      include: {
        achievements: true,
        chronicles: {
          include: {
            screenshots: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
        collectionGames: {
          include: {
            collection: true,
          },
        },
        dlcs: true,
        platforms: {
          include: {
            platform: true,
          },
        },
        review: true,
        screenshots: true,
        sessions: {
          include: {
            platform: true,
          },
          orderBy: {
            start: 'desc',
          },
        },
        versions: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    }),
    prisma.platform.findMany({
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.collection.findMany({
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.tag.findMany({
      orderBy: {
        name: 'asc',
      },
    }),
    libraryService.getStatistics(),
  ])

  return {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    app: {
      name: 'Ludux',
      version: app.getVersion(),
    },
    statistics,
    games,
    platforms,
    collections,
    tags,
  }
}

class SettingsService {
  async getOverview(): Promise<SettingsOverview> {
    const databasePath = getDatabaseFilePath()

    return {
      appVersion: app.getVersion(),
      databasePath,
      databaseSizeBytes: await readFileSize(databasePath),
      exportDirectory,
      backupDirectory,
      lastBackupAt: await readLastBackupAt(),
    }
  }

  async exportLibrary(): Promise<SettingsActionResult> {
    await mkdir(exportDirectory, { recursive: true })

    const result = await dialog.showSaveDialog({
      title: 'Exporter Ludux',
      defaultPath: join(exportDirectory, `ludux-export-${createTimestamp()}.json`),
      filters: [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
    })

    if (result.canceled || !result.filePath) {
      return {
        canceled: true,
        path: null,
        message: 'Export annule.',
      }
    }

    const snapshot = await buildExportSnapshot()
    const content = `${JSON.stringify(snapshot, null, 2)}\n`

    await mkdir(dirname(result.filePath), { recursive: true })
    await writeFile(result.filePath, content, 'utf8')

    return {
      canceled: false,
      path: result.filePath,
      message: 'Export JSON cree.',
      bytes: Buffer.byteLength(content, 'utf8'),
      createdAt: snapshot.exportedAt,
    }
  }

  async createBackup(): Promise<SettingsActionResult> {
    const databasePath = getDatabaseFilePath()

    if (!databasePath) {
      throw new Error('La base en memoire ne peut pas etre sauvegardee.')
    }

    await mkdir(backupDirectory, { recursive: true })
    await prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(FULL)')

    const backupPath = join(backupDirectory, `ludux-backup-${createTimestamp()}.db`)
    await copyFile(databasePath, backupPath)

    return {
      canceled: false,
      path: backupPath,
      message: 'Sauvegarde creee.',
      bytes: await readFileSize(backupPath),
      createdAt: new Date().toISOString(),
    }
  }

  async openDataFolder() {
    await mkdir(userDataDirectory, { recursive: true })

    const error = await shell.openPath(userDataDirectory)

    if (error) {
      throw new Error(error)
    }

    return true
  }
}

export const settingsService = new SettingsService()
