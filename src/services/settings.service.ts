import { app, dialog, shell } from 'electron'
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { getDatabaseFilePath, prisma } from '../database/client'
import { EXTERNAL_PROVIDER_VALUES } from '../types/settings'
import type {
  DeleteProviderConnectionInput,
  ExternalProvider,
  ProviderOverview,
  SettingsActionResult,
  SettingsOverview,
  UpsertProviderConnectionInput,
} from '../types/settings'
import { EXTERNAL_PROVIDER_DEFINITIONS } from '../providers/registry'
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

function trimOptional(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function isExternalProvider(value: string): value is ExternalProvider {
  return EXTERNAL_PROVIDER_VALUES.includes(value as ExternalProvider)
}

async function buildProviderOverview(): Promise<ProviderOverview> {
  const [accounts, syncRecords] = await Promise.all([
    prisma.externalAccount.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    }),
    prisma.syncData.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    }),
  ])

  const providers = EXTERNAL_PROVIDER_DEFINITIONS.map((definition) => {
    const account = accounts.find((item) => item.provider === definition.provider) ?? null
    const sync = syncRecords.find((item) => item.provider === definition.provider) ?? null

    return {
      ...definition,
      configured: account !== null,
      account: account
        ? {
            id: account.id,
            provider: account.provider as ExternalProvider,
            externalId: account.externalId,
            username: account.username,
            tokenHint: account.tokenHint,
            createdAt: account.createdAt.toISOString(),
            updatedAt: account.updatedAt.toISOString(),
          }
        : null,
      sync: sync
        ? {
            status: sync.status,
            message: sync.message,
            lastSync: sync.lastSync?.toISOString() ?? null,
            updatedAt: sync.updatedAt.toISOString(),
          }
        : null,
    }
  })

  const syncDates = providers
    .map((provider) => provider.sync?.lastSync)
    .filter((value): value is string => value !== null && value !== undefined)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())

  return {
    providers,
    configuredCount: providers.filter((provider) => provider.configured).length,
    totalProviders: providers.length,
    lastSyncAt: syncDates[0] ?? null,
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
      providerOverview: await buildProviderOverview(),
    }
  }

  async upsertProviderConnection(
    input: UpsertProviderConnectionInput,
  ): Promise<SettingsOverview> {
    if (!isExternalProvider(input.provider)) {
      throw new Error('Provider invalide.')
    }

    const externalId = input.externalId.trim()

    if (externalId.length === 0) {
      throw new Error('Identifiant externe obligatoire.')
    }

    await prisma.$transaction([
      prisma.externalAccount.deleteMany({
        where: {
          provider: input.provider,
        },
      }),
      prisma.externalAccount.create({
        data: {
          provider: input.provider,
          externalId,
          username: trimOptional(input.username),
          tokenHint: trimOptional(input.tokenHint),
        },
      }),
      prisma.syncData.create({
        data: {
          provider: input.provider,
          status: 'READY',
          message: 'Compte reference localement. Synchronisation reseau non active.',
        },
      }),
    ])

    return this.getOverview()
  }

  async deleteProviderConnection(
    input: DeleteProviderConnectionInput,
  ): Promise<SettingsOverview> {
    if (!isExternalProvider(input.provider)) {
      throw new Error('Provider invalide.')
    }

    const result = await prisma.externalAccount.deleteMany({
      where: {
        id: input.accountId,
        provider: input.provider,
      },
    })

    if (result.count === 0) {
      throw new Error('Connexion introuvable.')
    }

    await prisma.syncData.create({
      data: {
        provider: input.provider,
        status: 'NOT_CONFIGURED',
        message: 'Connexion locale retiree.',
      },
    })

    return this.getOverview()
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
