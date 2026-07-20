import { app, dialog, safeStorage, shell } from 'electron'
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { getDatabaseFilePath, prisma } from '../database/client'
import {
  fetchSteamOwnedGames,
  normalizeSteamId,
  type SteamOwnedGame,
} from '../providers/steam'
import { EXTERNAL_PROVIDER_VALUES } from '../types/settings'
import type {
  DeleteProviderConnectionInput,
  ExternalProvider,
  ProviderOverview,
  SettingsActionResult,
  SettingsOverview,
  SyncProviderInput,
  UpsertProviderConnectionInput,
} from '../types/settings'
import { EXTERNAL_PROVIDER_DEFINITIONS } from '../providers/registry'
import { libraryService } from './library.service'
import { logger } from '../utils/logger'

const userDataDirectory = resolve('userdata')
const exportDirectory = join(userDataDirectory, 'exports')
const backupDirectory = join(userDataDirectory, 'backups')
const steamProvider: ExternalProvider = 'STEAM'
const steamPlatformName = 'Steam'
const steamTotalSessionNote = 'Temps total Steam synchronise.'
const defaultAutoSyncIntervalMinutes = 120

interface SteamImportStats {
  importedGames: number
  linkedGames: number
  updatedGames: number
  syncedSessions: number
}

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

function readEnvValue(name: string) {
  return trimOptional(process.env[name])
}

function readAutoSyncIntervalMinutes() {
  const rawValue = Number(process.env['LUDUX_AUTO_SYNC_INTERVAL_MINUTES'])

  return Number.isFinite(rawValue) && rawValue >= 15
    ? rawValue
    : defaultAutoSyncIntervalMinutes
}

function encryptSecret(value: string | undefined) {
  const secret = trimOptional(value)

  if (!secret) {
    return undefined
  }

  if (safeStorage.isEncryptionAvailable()) {
    return `safe:${safeStorage.encryptString(secret).toString('base64')}`
  }

  return `plain:${secret}`
}

function decryptSecret(value: string | null | undefined) {
  const storedValue = trimOptional(value ?? undefined)

  if (!storedValue) {
    return undefined
  }

  if (storedValue.startsWith('safe:')) {
    try {
      return safeStorage.decryptString(Buffer.from(storedValue.slice(5), 'base64'))
    } catch {
      return undefined
    }
  }

  if (storedValue.startsWith('plain:')) {
    return trimOptional(storedValue.slice(6))
  }

  return storedValue
}

function hasProviderToken(provider: ExternalProvider, tokenHint: string | null) {
  return (
    Boolean(trimOptional(tokenHint ?? undefined)) ||
    (provider === steamProvider && Boolean(readEnvValue('STEAM_WEB_API_KEY')))
  )
}

function isExternalProvider(value: string): value is ExternalProvider {
  return EXTERNAL_PROVIDER_VALUES.includes(value as ExternalProvider)
}

function normalizeTitle(value: string) {
  return value.trim().toLocaleLowerCase('fr-FR')
}

function createSteamSyncMessage(stats: SteamImportStats, totalRemoteGames: number) {
  if (totalRemoteGames === 0) {
    return 'Aucun jeu Steam recu. Verifiez le SteamID64, la cle API et la visibilite des details de jeux.'
  }

  return [
    `${totalRemoteGames} jeux lus depuis Steam`,
    `${stats.importedGames} ajoutes`,
    `${stats.linkedGames} relies`,
    `${stats.updatedGames} deja connus`,
    `${stats.syncedSessions} temps de jeu synchronises`,
  ].join(' / ')
}

async function recordProviderSync(
  provider: ExternalProvider,
  status: string,
  message: string,
  lastSync?: Date,
) {
  await prisma.syncData.create({
    data: {
      provider,
      status,
      message,
      lastSync,
    },
  })
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
            hasToken: hasProviderToken(account.provider as ExternalProvider, account.tokenHint),
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

async function ensureSteamPlatform() {
  return prisma.platform.upsert({
    where: {
      name: steamPlatformName,
    },
    update: {},
    create: {
      name: steamPlatformName,
      manufacturer: 'Valve',
    },
  })
}

async function ensureSteamPlatformForGame(gameId: string, platformId: string) {
  const existingPlatform = await prisma.gamePlatform.findFirst({
    where: {
      gameId,
      platformId,
      version: null,
    },
    select: {
      id: true,
    },
  })

  if (existingPlatform) {
    return
  }

  await prisma.gamePlatform.create({
    data: {
      gameId,
      platformId,
      owned: true,
      played: true,
    },
  })
}

async function upsertSteamPlaySession({
  gameId,
  platformId,
  playSessionId,
  steamGame,
}: {
  gameId: string
  platformId: string
  playSessionId: string | null
  steamGame: SteamOwnedGame
}) {
  if (steamGame.playtimeForeverMinutes <= 0) {
    return playSessionId
  }

  const sessionData = {
    start: steamGame.lastPlayedAt ? new Date(steamGame.lastPlayedAt) : new Date(),
    durationMinutes: steamGame.playtimeForeverMinutes,
    note: steamTotalSessionNote,
    platformId,
  }

  if (playSessionId) {
    const result = await prisma.playSession.updateMany({
      where: {
        id: playSessionId,
        gameId,
      },
      data: sessionData,
    })

    if (result.count > 0) {
      return playSessionId
    }
  }

  const session = await prisma.playSession.create({
    data: {
      ...sessionData,
      gameId,
    },
    select: {
      id: true,
    },
  })

  return session.id
}

async function importSteamOwnedGames(games: SteamOwnedGame[]): Promise<SteamImportStats> {
  const stats: SteamImportStats = {
    importedGames: 0,
    linkedGames: 0,
    updatedGames: 0,
    syncedSessions: 0,
  }
  const steamPlatform = await ensureSteamPlatform()
  const localGames = await prisma.game.findMany({
    where: {
      archived: false,
    },
    select: {
      id: true,
      title: true,
      coverUrl: true,
    },
  })
  const gamesByTitle = new Map(
    localGames.map((game) => [normalizeTitle(game.title), game]),
  )

  for (const steamGame of games) {
    const externalId = String(steamGame.appid)
    const existingLink = await prisma.externalGame.findUnique({
      where: {
        provider_externalId: {
          provider: steamProvider,
          externalId,
        },
      },
    })
    const matchedGame = existingLink
      ? await prisma.game.findUnique({
          where: {
            id: existingLink.gameId,
          },
          select: {
            id: true,
            title: true,
            coverUrl: true,
          },
        })
      : (gamesByTitle.get(normalizeTitle(steamGame.title)) ?? null)
    const localGame =
      matchedGame ??
      (await prisma.game.create({
        data: {
          title: steamGame.title,
          coverUrl: steamGame.coverUrl,
          status: steamGame.playtimeForeverMinutes > 0 ? 'PLAYING' : 'BACKLOG',
          platforms: {
            create: {
              platform: {
                connect: {
                  id: steamPlatform.id,
                },
              },
              owned: true,
              played: steamGame.playtimeForeverMinutes > 0,
            },
          },
        },
        select: {
          id: true,
          title: true,
          coverUrl: true,
        },
      }))

    if (existingLink) {
      stats.updatedGames += 1
    } else if (matchedGame) {
      stats.linkedGames += 1
    } else {
      stats.importedGames += 1
      gamesByTitle.set(normalizeTitle(localGame.title), localGame)
    }

    if (matchedGame) {
      await ensureSteamPlatformForGame(localGame.id, steamPlatform.id)
    }

    if (!localGame.coverUrl) {
      await prisma.game.update({
        where: {
          id: localGame.id,
        },
        data: {
          coverUrl: steamGame.coverUrl,
        },
      })
    }

    const playSessionId = await upsertSteamPlaySession({
      gameId: localGame.id,
      platformId: steamPlatform.id,
      playSessionId: existingLink?.playSessionId ?? null,
      steamGame,
    })

    if (steamGame.playtimeForeverMinutes > 0) {
      stats.syncedSessions += 1
    }

    await prisma.externalGame.upsert({
      where: {
        provider_externalId: {
          provider: steamProvider,
          externalId,
        },
      },
      update: {
        gameId: localGame.id,
        playSessionId,
        sourceTitle: steamGame.title,
        sourceCoverUrl: steamGame.coverUrl,
        lastPlaytimeMinutes: steamGame.playtimeForeverMinutes,
        lastSyncedAt: new Date(),
      },
      create: {
        gameId: localGame.id,
        playSessionId,
        provider: steamProvider,
        externalId,
        sourceTitle: steamGame.title,
        sourceCoverUrl: steamGame.coverUrl,
        lastPlaytimeMinutes: steamGame.playtimeForeverMinutes,
        lastSyncedAt: new Date(),
      },
    })
  }

  return stats
}

class SettingsService {
  private autoSyncTimer: NodeJS.Timeout | null = null
  private isAutoSyncRunning = false

  startAutoSync() {
    if (this.autoSyncTimer) {
      return
    }

    const intervalMs = readAutoSyncIntervalMinutes() * 60_000
    const runSync = () => {
      void this.syncConfiguredProvidersAutomatically()
    }

    this.autoSyncTimer = setInterval(runSync, intervalMs)
    setTimeout(runSync, 15_000)
  }

  stopAutoSync() {
    if (!this.autoSyncTimer) {
      return
    }

    clearInterval(this.autoSyncTimer)
    this.autoSyncTimer = null
  }

  async syncConfiguredProvidersAutomatically() {
    if (this.isAutoSyncRunning) {
      return
    }

    this.isAutoSyncRunning = true

    try {
      const steamAccount = await prisma.externalAccount.findFirst({
        where: {
          provider: steamProvider,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
      const steamApiKey =
        decryptSecret(steamAccount?.tokenHint) ?? readEnvValue('STEAM_WEB_API_KEY')

      if (steamAccount && steamApiKey) {
        await this.syncProvider({
          provider: steamProvider,
        })
      }
    } catch (error) {
      logger.error('[SettingsAutoSync]', error)
    } finally {
      this.isAutoSyncRunning = false
    }
  }

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

    const externalId =
      input.provider === steamProvider
        ? normalizeSteamId(input.externalId)
        : input.externalId.trim()

    if (externalId.length === 0) {
      throw new Error('Identifiant externe obligatoire.')
    }

    const currentAccount = await prisma.externalAccount.findFirst({
      where: {
        provider: input.provider,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
    const tokenHint =
      encryptSecret(input.tokenHint) ?? currentAccount?.tokenHint ?? undefined

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
          tokenHint,
        },
      }),
      prisma.syncData.create({
        data: {
          provider: input.provider,
          status: 'READY',
          message:
            input.provider === steamProvider
              ? 'Compte Steam pret pour la synchronisation automatique.'
              : 'Compte reference localement. Synchronisation reseau non active.',
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

  async syncProvider(input: SyncProviderInput): Promise<SettingsActionResult> {
    if (!isExternalProvider(input.provider)) {
      throw new Error('Provider invalide.')
    }

    if (input.provider !== steamProvider) {
      throw new Error('Seule la synchronisation Steam est disponible pour le moment.')
    }

    const account = await prisma.externalAccount.findFirst({
      where: {
        provider: steamProvider,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    if (!account) {
      throw new Error('Connexion Steam introuvable.')
    }

    const apiKey =
      decryptSecret(account.tokenHint) ?? readEnvValue('STEAM_WEB_API_KEY')

    if (!apiKey) {
      throw new Error('Cle API Steam obligatoire pour synchroniser.')
    }

    await recordProviderSync(
      steamProvider,
      'SYNCING',
      'Synchronisation Steam en cours.',
    )

    try {
      const ownedGames = await fetchSteamOwnedGames({
        apiKey,
        steamId: account.externalId,
      })
      const stats = await importSteamOwnedGames(ownedGames.games)
      const syncedAt = new Date()
      const message = createSteamSyncMessage(stats, ownedGames.totalCount)

      await recordProviderSync(steamProvider, 'SYNCED', message, syncedAt)

      return {
        canceled: false,
        path: null,
        message,
        createdAt: syncedAt.toISOString(),
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Erreur Steam inconnue.'

      await recordProviderSync(steamProvider, 'ERROR', message)
      throw caughtError
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
